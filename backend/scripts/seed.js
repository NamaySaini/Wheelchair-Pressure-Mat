/**
 * Seed fake session history for the DEMO_USER_ID so the LLM has data to reason about.
 *
 * Usage (from backend/):
 *   npm run seed           # wipe + reseed 365 days of sessions
 *   DAYS=30 npm run seed   # override range
 *
 * What gets written:
 *   - user_profiles (upsert)
 *   - sessions (with aggregates + avg_distribution — the tools + contextBuilder read these)
 *   - alert_events (drives compliance and time-of-day queries)
 *   - readings (derived metrics during seeded sessions)
 *   - reading_snapshots (16x16 historical tracker grids)
 *
 * Skipped on purpose: chat_messages, session_summaries.
 */
const crypto = require('crypto');
require('dotenv').config();
const supabase = require('../src/supabase');
const { DEMO_USER_ID } = require('../src/supabase');

const DAYS = Number(process.env.DAYS || 365);
const GRID_SIZE = 16;
const MAX_ADC = 4095;
const ZONES = ['left_ischial', 'right_ischial', 'left_thigh', 'right_thigh', 'center_zone'];
const SEVERITY = { low: 0, moderate: 1, high: 2 };
const BASE_PRESSURE_TEMPLATE = [
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.30,0.38,0.30,0.18,0.18,0.18,0.18,0.18,0.18,0.30,0.40,0.32,0.18,0.18],
  [0.18,0.24,0.42,0.52,0.42,0.24,0.18,0.18,0.18,0.18,0.26,0.44,0.60,0.44,0.24,0.18],
  [0.18,0.32,0.55,0.68,0.55,0.32,0.18,0.18,0.18,0.24,0.42,0.64,0.84,0.64,0.36,0.18],
  [0.30,0.48,0.74,0.86,0.74,0.48,0.30,0.24,0.32,0.48,0.74,0.90,0.98,0.86,0.52,0.30],
  [0.48,0.68,0.90,0.98,0.90,0.68,0.48,0.42,0.48,0.68,0.92,1.00,1.00,0.92,0.68,0.42],
  [0.36,0.56,0.82,0.90,0.82,0.56,0.36,0.56,0.60,0.82,0.98,1.00,1.00,0.98,0.82,0.56],
  [0.18,0.42,0.62,0.82,0.74,0.48,0.30,0.18,0.18,0.42,0.68,0.92,0.86,0.62,0.30,0.18],
  [0.18,0.28,0.48,0.62,0.55,0.36,0.18,0.18,0.18,0.32,0.52,0.68,0.62,0.42,0.24,0.18],
  [0.18,0.18,0.30,0.42,0.36,0.24,0.18,0.18,0.18,0.24,0.36,0.48,0.42,0.30,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
  [0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18],
];

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
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfYear(d) {
  return new Date(d.getFullYear(), 11, 31, 0, 0, 0, 0);
}
function iso(d) {
  return d.toISOString();
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function computeCoPX(data) {
  let weightedX = 0;
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      weightedX += v * c;
      total += v;
    }
  }
  if (total === 0) return 0.5;
  return weightedX / total / (GRID_SIZE - 1);
}

function computeCoPY(data) {
  let weightedY = 0;
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      weightedY += v * r;
      total += v;
    }
  }
  if (total === 0) return 0.5;
  return weightedY / total / (GRID_SIZE - 1);
}

function computeSymmetry(data) {
  let diff = 0;
  let total = 0;
  const half = GRID_SIZE / 2;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < half; c++) {
      const left = data[r * GRID_SIZE + c] ?? 0;
      const right = data[r * GRID_SIZE + (GRID_SIZE - 1 - c)] ?? 0;
      diff += Math.abs(left - right);
      total += left + right;
    }
  }
  if (total === 0) return 1;
  return 1 - diff / total;
}

function computeMaxPressure(data) {
  let max = 0;
  for (const value of data) if (value > max) max = value;
  return max;
}

function zoneMeans(data) {
  const cells = {
    left_thigh: [],
    right_thigh: [],
    center_zone: [],
    left_ischial: [],
    right_ischial: [],
  };

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      if (r < 6) {
        if (c < 8) cells.left_thigh.push(v);
        else cells.right_thigh.push(v);
      } else if (r < 10) {
        cells.center_zone.push(v);
      } else {
        if (c < 8) cells.left_ischial.push(v);
        else cells.right_ischial.push(v);
      }
    }
  }

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  return {
    left_thigh: mean(cells.left_thigh),
    right_thigh: mean(cells.right_thigh),
    center_zone: mean(cells.center_zone),
    left_ischial: mean(cells.left_ischial),
    right_ischial: mean(cells.right_ischial),
  };
}

function classify(mean) {
  if (mean < 0.25) return 'low';
  if (mean < 0.6) return 'moderate';
  return 'high';
}

function deriveReading(data) {
  const means = zoneMeans(data);
  let maxZone = 'center_zone';
  let maxMean = -1;
  for (const zone of Object.keys(means)) {
    if (means[zone] > maxMean) {
      maxMean = means[zone];
      maxZone = zone;
    }
  }

  return {
    cop_x: Number(computeCoPX(data).toFixed(4)),
    cop_y: Number(computeCoPY(data).toFixed(4)),
    symmetry: Number(computeSymmetry(data).toFixed(4)),
    max_pressure: Number(computeMaxPressure(data).toFixed(4)),
    max_pressure_zone: maxZone,
    left_ischial: classify(means.left_ischial),
    right_ischial: classify(means.right_ischial),
    left_thigh: classify(means.left_thigh),
    right_thigh: classify(means.right_thigh),
    center_zone: classify(means.center_zone),
  };
}

function gridToSnapshotRow(grid) {
  return grid.map((value) => Math.round(clamp01(value) * MAX_ADC));
}

function templatePressureAt(row, col, reliefShift) {
  const sourceRow = reliefShift ? Math.min(GRID_SIZE - 1, row + 4) : Math.max(0, row - 1);
  let value = BASE_PRESSURE_TEMPLATE[sourceRow][col];

  if (reliefShift) {
    if (row < 9) value *= 1.08;
    else value *= 0.72;
    if (row < 4) value += 0.05;
  }

  if (col >= 9 && row >= 5 && row <= 12) value += 0.05;
  return value;
}

function buildGrid(sessionProfile, minuteOffset, durationMin) {
  const reliefShift = durationMin > 0 ? minuteOffset / durationMin > 0.72 : false;
  const leftIschialScale = clamp(sessionProfile.left_ischial / 0.72, 0.72, 1.35);
  const rightIschialScale = clamp(sessionProfile.right_ischial / 1.22, 0.78, 1.5);
  const leftThighScale = clamp(sessionProfile.left_thigh / 0.36, 0.72, 1.25);
  const rightThighScale = clamp(sessionProfile.right_thigh / 0.44, 0.76, 1.32);
  const centerScale = clamp(sessionProfile.center_zone / 0.48, 0.72, 1.28);
  const rightBias = clamp(sessionProfile.right_ischial - sessionProfile.left_ischial, 0.08, 0.7) * 0.16;
  const sessionPhase = durationMin > 0 ? minuteOffset / durationMin : 0;
  const rowShift = reliefShift
    ? sessionProfile.forward_row_shift + sessionProfile.relief_extra_shift
    : sessionProfile.base_row_shift;
  const colShift = sessionProfile.col_shift;
  const widthScale = reliefShift ? sessionProfile.forward_width_scale : sessionProfile.width_scale;
  const hotspotBoost = reliefShift ? sessionProfile.forward_hotspot_boost : sessionProfile.hotspot_boost;
  const centerCompression = reliefShift ? sessionProfile.forward_center_scale : sessionProfile.center_compression;

  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const sampleCol = clamp(Math.round((c - 7.5) * widthScale + 7.5 + colShift), 0, GRID_SIZE - 1);
      const sampleRow = clamp(Math.round(r + rowShift), 0, GRID_SIZE - 1);
      let value = templatePressureAt(sampleRow, sampleCol, reliefShift);

      if (r >= 4 && r <= 6) {
        if (c <= 5) value *= leftThighScale;
        else if (c >= 10) value *= rightThighScale;
        else value *= centerScale;
      } else if (r >= 7 && r <= 12) {
        if (c <= 6) value *= leftIschialScale;
        else if (c >= 9) value *= rightIschialScale;
        else value *= centerScale;
      }

      if (c >= 9 && r >= 6 && r <= 12) value += rightBias;
      if (r >= 8 && r <= 10 && c >= 6 && c <= 9) value *= centerCompression;
      if (r >= 7 && r <= 11 && c >= 2 && c <= 13) value *= hotspotBoost * 1.12;
      if (r >= 6 && r <= 12 && c >= 1 && c <= 14) value += 0.06;
      if (r >= 7 && r <= 12 && c >= 2 && c <= 13) value += sessionPhase * 0.02;
      if (r >= 8 && r <= 11 && c >= 2 && c <= 5) value += 0.05;
      if (r >= 8 && r <= 11 && c >= 10 && c <= 13) value += 0.07;
      if (r >= 5 && r <= 7 && c >= 3 && c <= 12) value += 0.035;
      value += rand(-0.012, 0.012);
      grid.push(clamp01(value));
    }
  }

  return grid;
}

function sessionTemplate(dayFactor, startHour, sessionDate) {
  const monthIndex = sessionDate.getMonth();
  const weekday = sessionDate.getDay();
  const seasonalBias = Math.sin((monthIndex / 11) * Math.PI * 2);
  const weekdayBias = weekday === 0 || weekday === 6 ? 0.08 : -0.02;
  const eveningPenalty = startHour >= 19 ? 0.12 : 0;
  const rightBias = 1.18 + 0.28 * dayFactor + (startHour >= 18 ? 0.08 : 0) + seasonalBias * 0.08 + weekdayBias;
  const thighTrend = seasonalBias * 0.05 + weekdayBias * 0.4;
  const centerTrend = -seasonalBias * 0.05 + (startHour >= 19 ? -0.03 : 0.02);
  const archetype = randInt(0, 3);

  return {
    left_ischial: Number(clamp(0.72 + rand(-0.12, 0.12), 0.48, 1.0).toFixed(2)),
    right_ischial: Number(clamp(rightBias + rand(-0.16, 0.18), 0.95, 1.9).toFixed(2)),
    left_thigh: Number(clamp(0.34 + thighTrend + rand(-0.12, 0.12), 0.18, 0.72).toFixed(2)),
    right_thigh: Number(clamp(0.44 + thighTrend + rand(-0.12, 0.13), 0.22, 0.88).toFixed(2)),
    center_zone: Number(clamp(0.48 + centerTrend + rand(-0.14, 0.14) - eveningPenalty * 0.2, 0.18, 0.9).toFixed(2)),
    base_row_shift: [-1, -0.5, 0, 0.4][archetype] + rand(-0.2, 0.2),
    forward_row_shift: [3.2, 3.6, 4.0, 4.4][archetype] + rand(-0.15, 0.15),
    relief_extra_shift: rand(0.1, 0.45),
    col_shift: [-0.35, -0.1, 0.15, 0.35][archetype] + rand(-0.08, 0.08),
    width_scale: clamp(1 + [-0.09, -0.02, 0.05, 0.1][archetype] + rand(-0.04, 0.04), 0.86, 1.14),
    forward_width_scale: clamp(0.96 + rand(-0.04, 0.05), 0.86, 1.08),
    hotspot_boost: clamp(1.02 + seasonalBias * 0.05 + rand(-0.03, 0.06), 0.96, 1.14),
    forward_hotspot_boost: clamp(0.98 + rand(-0.04, 0.04), 0.9, 1.06),
    center_compression: clamp(0.96 + rand(-0.08, 0.06), 0.82, 1.08),
    forward_center_scale: clamp(0.74 + rand(-0.05, 0.05), 0.62, 0.86),
  };
}

function sessionPlanForDay(dayOffsetFromNow) {
  if (dayOffsetFromNow === 0) {
    return Array.from({ length: 24 }, (_, i) => ({
      startHour: i,
      startMin: 0,
      durationMin: 55,
    }));
  }

  return [
    {
      startHour: 6,
      startMin: randInt(0, 15),
      durationMin: randInt(55, 90),
    },
    {
      startHour: 9,
      startMin: randInt(0, 20),
      durationMin: randInt(95, 145),
    },
    {
      startHour: 14,
      startMin: randInt(0, 25),
      durationMin: randInt(80, 130),
    },
    {
      startHour: 17,
      startMin: randInt(0, 20),
      durationMin: randInt(70, 120),
    },
    {
      startHour: 19,
      startMin: randInt(0, 25),
      durationMin: randInt(90, 150),
    },
  ];
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
  const readings = [];
  const snapshots = [];
  const NOW = new Date();
  const startDate = startOfDay(addDays(NOW, -DAYS));
  const endDate = endOfYear(NOW);
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

  for (let dayDate = new Date(startDate), dayIndex = 0; dayDate <= endDate; dayDate = addDays(dayDate, 1), dayIndex += 1) {
    const dayOffsetFromNow = Math.round((startOfDay(NOW).getTime() - startOfDay(dayDate).getTime()) / 86400000);

    // Compliance drifts up over time: ~55% → ~82%
    const dayFactor = dayIndex / totalDays; // 0 oldest, 1 newest
    const baseCompliance = 0.55 + 0.27 * dayFactor;

    for (const plan of sessionPlanForDay(dayOffsetFromNow)) {
      const startHour = plan.startHour;
      const startMin = plan.startMin;
      const started = new Date(dayDate);
      started.setHours(startHour, startMin, 0, 0);

      const durationMin = plan.durationMin;
      const ended = new Date(started.getTime() + durationMin * 60000);
      const duration_sec = durationMin * 60;

      const intervalMin = 30;
      const alertsTriggered = Math.max(0, Math.floor(durationMin / intervalMin));

      // Compliance worse in evenings
      const eveningPenalty = startHour >= 19 ? 0.15 : 0;
      const complianceToday = clamp01(baseCompliance - eveningPenalty + rand(-0.1, 0.1));
      const shiftsCompleted = Math.round(alertsTriggered * complianceToday);

      // Right-ischial bias — the "story" the LLM should pick up on
      const avg_distribution = sessionTemplate(dayFactor, startHour, started);
      const worst_zone = Object.entries(avg_distribution).sort((a, b) => b[1] - a[1])[0][0];

      const sessionId = crypto.randomUUID();
      const sessionRow = {
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
      };

      const snapshotStepMin = 5;
      const readingStepMin = 10;
      const distributionTotals = Object.fromEntries(ZONES.map((zone) => [zone, 0]));
      let readingCount = 0;

      for (let minute = 0; minute <= durationMin; minute += snapshotStepMin) {
        const recordedAt = new Date(started.getTime() + minute * 60000);
        const normalizedGrid = buildGrid(avg_distribution, minute, durationMin);
        snapshots.push({
          session_id: sessionId,
          recorded_at: iso(recordedAt),
          grid: gridToSnapshotRow(normalizedGrid),
        });

        if (minute % readingStepMin === 0 || minute === durationMin) {
          const reading = deriveReading(normalizedGrid);
          const means = zoneMeans(normalizedGrid);
          readings.push({
            session_id: sessionId,
            recorded_at: iso(recordedAt),
            ...reading,
          });
          readingCount += 1;
          for (const zone of ZONES) {
            distributionTotals[zone] += means[zone] * 2;
          }
        }
      }

      sessionRow.avg_distribution = Object.fromEntries(
        ZONES.map((zone) => [zone, Number((distributionTotals[zone] / Math.max(readingCount, 1)).toFixed(3))])
      );
      sessionRow.worst_zone = Object.entries(sessionRow.avg_distribution).sort((a, b) => b[1] - a[1])[0][0];
      sessions.push(sessionRow);

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
  return { sessions, alertEvents, readings, snapshots };
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

  console.log('Generating sessions, alerts, readings, and snapshots…');
  const { sessions, alertEvents, readings, snapshots } = buildData();
  console.log(
    `  → ${sessions.length} sessions, ${alertEvents.length} alerts, ${readings.length} readings, ${snapshots.length} snapshots`
  );

  console.log('Inserting sessions…');
  await insertBatched('sessions', sessions, 200);
  console.log('Inserting alert events…');
  await insertBatched('alert_events', alertEvents, 500);
  console.log('Inserting readings…');
  await insertBatched('readings', readings, 500);
  console.log('Inserting reading snapshots…');
  await insertBatched('reading_snapshots', snapshots, 200);

  console.log('Done. Try: "What was my worst session this week?" or "Which side has more pressure?"');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
