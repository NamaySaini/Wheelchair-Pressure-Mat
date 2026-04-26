const supabase = require('../supabase');
const { ZONES } = require('../metrics/zones');

// ── OpenAI-style tool schemas (Groq-compatible) ──
const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'get_session_history',
      description:
        'Fetch completed sessions in a date range. Use this to answer questions about past sessions, durations, worst/best sessions, or pattern changes over time.',
      parameters: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'ISO 8601 date (e.g. 2026-04-01). Start of range (inclusive).',
          },
          end_date: {
            type: 'string',
            description: 'ISO 8601 date. End of range (inclusive).',
          },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pressure_averages',
      description:
        'Average severity of a specific body zone over a time period. Use to answer "which side has more pressure?" or "how bad is my right ischial this month?"',
      parameters: {
        type: 'object',
        properties: {
          zone: {
            type: 'string',
            enum: [...ZONES, 'all'],
            description: 'Body zone, or "all" for every zone.',
          },
          time_period: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'Time window ending now.',
          },
        },
        required: ['zone', 'time_period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_alert_history',
      description:
        'Fetch recent alert events (triggered + acknowledged/shift-completed timestamps). Use to answer compliance questions.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Lookback window in days (max 90).',
          },
        },
        required: ['days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Fetch the user profile (age, weight, condition, risk level, etc.).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time_of_day_patterns',
      description:
        'Return alerts + shifts grouped by hour-of-day in the user\'s timezone. Use to identify when the user most often misses repositioning.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Lookback window in days (default 30).',
          },
        },
        required: [],
      },
    },
  },
];

async function get_session_history(userId, { start_date, end_date }) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, started_at, ended_at, duration_sec, alerts_triggered, shifts_completed, compliance_rate, worst_zone, repositions_detected'
    )
    .eq('user_id', userId)
    .gte('started_at', start_date)
    .lte('started_at', end_date + 'T23:59:59.999Z')
    .lte('started_at', nowIso)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { sessions: data || [] };
}

async function get_pressure_averages(userId, { zone, time_period }) {
  const days = { day: 1, week: 7, month: 30 }[time_period];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const nowIso = new Date().toISOString();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, avg_distribution')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', since.toISOString())
    .lte('started_at', nowIso);

  const relevantZones = zone === 'all' ? ZONES : [zone];
  const totals = Object.fromEntries(relevantZones.map((z) => [z, 0]));
  let n = 0;
  for (const s of sessions || []) {
    if (!s.avg_distribution) continue;
    n += 1;
    for (const z of relevantZones) {
      totals[z] += typeof s.avg_distribution[z] === 'number' ? s.avg_distribution[z] : 0;
    }
  }
  const averages = {};
  for (const z of relevantZones) averages[z] = n ? Number((totals[z] / n).toFixed(3)) : null;
  return { zone, time_period, sessions_considered: n, averages };
}

async function get_alert_history(userId, { days }) {
  const capped = Math.min(days, 90);
  const since = new Date();
  since.setDate(since.getDate() - capped);
  const nowIso = new Date().toISOString();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', since.toISOString())
    .lte('started_at', nowIso);
  const ids = (sessions || []).map((s) => s.id);
  if (!ids.length) return { days: capped, events: [] };

  const { data: events, error } = await supabase
    .from('alert_events')
    .select('session_id, triggered_at, acknowledged_at, shift_completed_at')
    .in('session_id', ids)
    .order('triggered_at', { ascending: false });

  if (error) throw new Error(error.message);
  return { days: capped, events: events || [] };
}

async function get_user_profile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { profile: data || null };
}

async function get_time_of_day_patterns(userId, { days = 30 }) {
  const capped = Math.min(days, 90);
  const since = new Date();
  since.setDate(since.getDate() - capped);
  const nowIso = new Date().toISOString();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', since.toISOString())
    .lte('started_at', nowIso);
  const ids = (sessions || []).map((s) => s.id);

  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    alerts: 0,
    shifts_completed: 0,
  }));

  if (!ids.length) return { days: capped, hours: buckets };

  const { data: events } = await supabase
    .from('alert_events')
    .select('triggered_at, shift_completed_at')
    .in('session_id', ids);

  // Group by UTC hour — frontend/user timezone conversion belongs to the LLM context.
  for (const e of events || []) {
    const h = new Date(e.triggered_at).getUTCHours();
    buckets[h].alerts += 1;
    if (e.shift_completed_at) buckets[h].shifts_completed += 1;
  }
  return { days: capped, hours: buckets };
}

const EXECUTORS = {
  get_session_history,
  get_pressure_averages,
  get_alert_history,
  get_user_profile,
  get_time_of_day_patterns,
};

async function executeToolCall(name, args, userId) {
  const fn = EXECUTORS[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    return await fn(userId, args || {});
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

module.exports = { TOOL_DEFS, executeToolCall };
