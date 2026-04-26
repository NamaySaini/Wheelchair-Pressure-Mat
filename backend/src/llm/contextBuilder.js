const supabase = require('../supabase');
const { ZONES } = require('../metrics/zones');

const SEVERITY = { low: 0, moderate: 1, high: 2 };

/**
 * Build a natural-language context summary for the LLM to prepend to each turn.
 * Returns a string (or empty string if no profile / no data).
 */
async function buildContext(userId) {
  const [profileRes, activeRes, weekRes, monthRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchSessionsWithin(userId, 7),
    fetchSessionsWithin(userId, 30),
  ]);

  const lines = [];
  const profile = profileRes.data;
  const timezone = profile?.timezone || 'America/Chicago';

  lines.push('=== USER PROFILE ===');
  if (profile) {
    const bits = [];
    if (profile.age) bits.push(`Age ${profile.age}`);
    if (profile.weight_kg) bits.push(`${profile.weight_kg} kg`);
    if (profile.height_cm) bits.push(`${profile.height_cm} cm`);
    if (profile.condition) bits.push(`Condition: ${profile.condition}`);
    if (profile.wheelchair_type) bits.push(`Wheelchair: ${profile.wheelchair_type}`);
    if (profile.cushion_type) bits.push(`Cushion: ${profile.cushion_type}`);
    lines.push(bits.join(', ') || '(Profile exists but has no details set.)');
    if (profile.risk_level) lines.push(`Risk level: ${profile.risk_level}`);
    lines.push(
      `Target reposition interval: ${Math.round((profile.target_reposition_interval_sec || 1800) / 60)} min`
    );
    lines.push(`Timezone: ${timezone}`);
  } else {
    lines.push('(No profile saved yet.)');
  }

  // Current session
  lines.push('');
  lines.push('=== CURRENT SESSION ===');
  const active = activeRes.data;
  if (active) {
    const startedMinAgo = Math.round((Date.now() - new Date(active.started_at).getTime()) / 60000);
    const { data: alerts = [] } = await supabase
      .from('alert_events')
      .select('id, shift_completed_at')
      .eq('session_id', active.id);
    const shifts = alerts.filter((a) => a.shift_completed_at).length;
    lines.push(`Started ${startedMinAgo} min ago.`);
    lines.push(
      `${alerts.length} alert(s) triggered so far, ${shifts} completed shift(s) (${
        alerts.length ? Math.round((shifts / alerts.length) * 100) + '%' : '—'
      } compliance).`
    );

    // Last reading for current posture cue
    const { data: lastReading } = await supabase
      .from('readings')
      .select('cop_x, cop_y, symmetry, max_pressure_zone, left_ischial, right_ischial, center_zone, left_thigh, right_thigh')
      .eq('session_id', active.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastReading) {
      lines.push(
        `Latest posture: CoP x=${lastReading.cop_x?.toFixed(2)}, y=${lastReading.cop_y?.toFixed(2)}; symmetry ${(lastReading.symmetry * 100).toFixed(0)}%; peak in ${lastReading.max_pressure_zone}.`
      );
      const highs = ZONES.filter((z) => lastReading[z] === 'high');
      if (highs.length) lines.push(`High-pressure zones right now: ${highs.join(', ')}.`);
    }
  } else {
    lines.push('No active session.');
  }

  // 7-day summary
  lines.push('');
  lines.push('=== LAST 7 DAYS ===');
  appendWindowSummary(lines, weekRes);

  // 30-day trend
  lines.push('');
  lines.push('=== LAST 30 DAYS ===');
  appendWindowSummary(lines, monthRes);

  return lines.join('\n');
}

async function fetchSessionsWithin(userId, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('sessions')
    .select('duration_sec, alerts_triggered, shifts_completed, compliance_rate, worst_zone, avg_distribution')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', since.toISOString());
  return data || [];
}

function appendWindowSummary(lines, sessions) {
  if (!sessions?.length) {
    lines.push('No completed sessions in this window.');
    return;
  }
  const totalAlerts = sessions.reduce((a, s) => a + (s.alerts_triggered || 0), 0);
  const totalShifts = sessions.reduce((a, s) => a + (s.shifts_completed || 0), 0);
  const overallCompliance =
    totalAlerts > 0 ? Math.round((totalShifts / totalAlerts) * 100) : null;
  const avgDuration = Math.round(
    sessions.reduce((a, s) => a + (s.duration_sec || 0), 0) / sessions.length / 60
  );

  const worstCounts = {};
  for (const s of sessions) {
    if (s.worst_zone) worstCounts[s.worst_zone] = (worstCounts[s.worst_zone] || 0) + 1;
  }
  const worstZoneStreak = Object.entries(worstCounts).sort((a, b) => b[1] - a[1])[0];

  lines.push(`${sessions.length} sessions, avg duration ${avgDuration} min.`);
  lines.push(
    `Alerts: ${totalAlerts}, shifts completed: ${totalShifts}, compliance: ${
      overallCompliance == null ? '—' : overallCompliance + '%'
    }.`
  );
  if (worstZoneStreak) {
    lines.push(`Worst zone most often: ${worstZoneStreak[0]} (${worstZoneStreak[1]} of ${sessions.length} sessions).`);
  }

  // Avg severity per zone across sessions (use avg_distribution if present)
  const zoneAvgs = {};
  let counted = 0;
  for (const s of sessions) {
    if (!s.avg_distribution) continue;
    counted += 1;
    for (const [k, v] of Object.entries(s.avg_distribution)) {
      zoneAvgs[k] = (zoneAvgs[k] || 0) + (typeof v === 'number' ? v : 0);
    }
  }
  if (counted) {
    const parts = Object.entries(zoneAvgs)
      .map(([k, v]) => `${k}=${(v / counted).toFixed(2)}`)
      .join(', ');
    lines.push(`Avg zone severity (0-2 scale): ${parts}`);
  }
}

module.exports = { buildContext };
