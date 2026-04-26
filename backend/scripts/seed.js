/**
 * Seed fake session history for the DEMO_USER_ID so the LLM has data to reason about.
 *
 * Usage (from backend/):
 *   npm run seed          # wipe + reseed 90 days of sessions
 *   DAYS=30 npm run seed  # override range
 *
 * What gets written:
 *   - user_profiles (upsert)
 *   - sessions (with aggregates + avg_distribution — the tools + contextBuilder read these)
 *   - alert_events (drives compliance and time-of-day queries)
 *
 * Skipped on purpose: readings, reading_snapshots, chat_messages, session_summaries.
 * The LLM never queries per-reading data for past sessions — only the aggregates.
 */
const crypto = require('crypto');
require('dotenv').config();
const supabase = require('../src/supabase');
const { DEMO_USER_ID } = require('../src/supabase');

const DAYS = Number(process.env.DAYS || 90);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function iso(d) {
  return d.toISOString();
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function seedProfile() {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: DEMO_USER_ID,
      age: 42,
      weight_kg: 72,
      height_cm: 175,
      condition: 'Spinal cord injury (T6)',
      wheelchair_type: 'Manual',
      cushion_type: 'ROHO Quadtro',
      risk_level: 'medium',
      target_reposition_interval_sec: 1800,
      timezone: 'America/Chicago',
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(`profile: ${error.message}`);
}

function buildData() {
  const sessions = [];
  const alertEvents = [];
  const NOW = new Date();

  for (let d = DAYS; d >= 0; d--) {
    // Skip ~20% of days (user not in chair / forgot to start session)
    if (Math.random() < 0.2) continue;
    const dayDate = addDays(NOW, -d);

    // Compliance drifts up over time: ~55% → ~82%
    const dayFactor = (DAYS - d) / DAYS; // 0 oldest, 1 newest
    const baseCompliance = 0.55 + 0.27 * dayFactor;

    const numSessions = randInt(1, 3);
    for (let s = 0; s < numSessions; s++) {
      // Evening hours slightly more likely — that'll show up in time-of-day patterns
      const startHour = pick([8, 9, 10, 11, 13, 14, 16, 17, 18, 19, 20, 20, 21]);
      const startMin = randInt(0, 59);
      const started = new Date(dayDate);
      started.setHours(startHour, startMin, 0, 0);

      const durationMin = randInt(45, 210);
      const ended = new Date(started.getTime() + durationMin * 60000);
      const duration_sec = durationMin * 60;

      const intervalMin = 30;
      const alertsTriggered = Math.max(0, Math.floor(durationMin / intervalMin));

      // Compliance worse in evenings
      const eveningPenalty = startHour >= 19 ? 0.15 : 0;
      const complianceToday = clamp01(baseCompliance - eveningPenalty + rand(-0.1, 0.1));
      const shiftsCompleted = Math.round(alertsTriggered * complianceToday);

      // Right-ischial bias — the "story" the LLM should pick up on
      const avg_distribution = {
        left_ischial: Number(rand(0.5, 1.1).toFixed(2)),
        right_ischial: Number(rand(1.1, 1.8).toFixed(2)),
        left_thigh: Number(rand(0.2, 0.6).toFixed(2)),
        right_thigh: Number(rand(0.3, 0.8).toFixed(2)),
        center_zone: Number(rand(0.3, 0.9).toFixed(2)),
      };
      const worst_zone = Object.entries(avg_distribution).sort((a, b) => b[1] - a[1])[0][0];

      const sessionId = crypto.randomUUID();
      sessions.push({
        id: sessionId,
        user_id: DEMO_USER_ID,
        started_at: iso(started),
        ended_at: iso(ended),
        duration_sec,
        auto_ended: Math.random() < 0.1,
        ended_reason: Math.random() < 0.1 ? pick(['no_pressure', 'ble_disconnect']) : 'user',
        alerts_triggered: alertsTriggered,
        shifts_completed: shiftsCompleted,
        repositions_detected: randInt(2, 10),
        longest_no_shift_sec: randInt(600, 3600),
        worst_zone,
        compliance_rate:
          alertsTriggered > 0 ? Number((shiftsCompleted / alertsTriggered).toFixed(3)) : null,
        avg_distribution,
      });

      // Space alerts evenly through the session, stagger acknowledge/shift timestamps
      for (let a = 0; a < alertsTriggered; a++) {
        const frac = (a + 1) / (alertsTriggered + 1);
        const triggered = new Date(started.getTime() + frac * duration_sec * 1000);
        const didAck = Math.random() < 0.92;
        const didShift = a < shiftsCompleted;
        const acknowledged =
          didAck ? new Date(triggered.getTime() + randInt(5, 60) * 1000) : null;
        const shiftCompleted =
          didShift && acknowledged
            ? new Date(acknowledged.getTime() + randInt(10, 120) * 1000)
            : null;
        alertEvents.push({
          session_id: sessionId,
          triggered_at: iso(triggered),
          acknowledged_at: acknowledged ? iso(acknowledged) : null,
          shift_completed_at: shiftCompleted ? iso(shiftCompleted) : null,
        });
      }
    }
  }
  return { sessions, alertEvents };
}

async function wipe() {
  const { data: sess, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', DEMO_USER_ID);
  if (error) throw new Error(`wipe lookup: ${error.message}`);
  const ids = (sess || []).map((s) => s.id);
  if (!ids.length) return;

  // Children first (alert_events/readings/snapshots/summaries cascade, but be explicit).
  await supabase.from('alert_events').delete().in('session_id', ids);
  await supabase.from('readings').delete().in('session_id', ids);
  await supabase.from('reading_snapshots').delete().in('session_id', ids);
  await supabase.from('session_summaries').delete().in('session_id', ids);
  const { error: sErr } = await supabase.from('sessions').delete().eq('user_id', DEMO_USER_ID);
  if (sErr) throw new Error(`wipe sessions: ${sErr.message}`);
}

async function insertBatched(table, rows, batchSize) {
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

async function run() {
  console.log(`Seeding ${DAYS} days of history for user ${DEMO_USER_ID}`);
  console.log('Wiping existing demo data…');
  await wipe();

  console.log('Upserting profile…');
  await seedProfile();

  console.log('Generating sessions + alert events…');
  const { sessions, alertEvents } = buildData();
  console.log(`  → ${sessions.length} sessions, ${alertEvents.length} alerts`);

  console.log('Inserting sessions…');
  await insertBatched('sessions', sessions, 200);
  console.log('Inserting alert events…');
  await insertBatched('alert_events', alertEvents, 500);

  console.log('Done. Try: "What was my worst session this week?" or "Which side has more pressure?"');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
