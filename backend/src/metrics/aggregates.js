const supabase = require('../supabase');
const { ZONES } = require('./zones');

// Rank order used when picking the "worst" zone — higher = worse.
const SEVERITY = { low: 0, moderate: 1, high: 2 };

/**
 * Compute aggregate metrics for a session from its readings + alerts.
 * Returns an object that maps directly onto the sessions table columns.
 */
async function computeSessionAggregates(sessionId) {
  const [{ data: readings = [] }, { data: alerts = [] }, { data: session }] =
    await Promise.all([
      supabase
        .from('readings')
        .select('cop_x, cop_y, left_ischial, right_ischial, left_thigh, right_thigh, center_zone')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: true }),
      supabase
        .from('alert_events')
        .select('triggered_at, shift_completed_at')
        .eq('session_id', sessionId)
        .order('triggered_at', { ascending: true }),
      supabase
        .from('sessions')
        .select('started_at, repositions_detected')
        .eq('id', sessionId)
        .single()
        .then((r) => ({ data: r.data })),
    ]);

  const alerts_triggered = alerts.length;
  const shifts_completed = alerts.filter((a) => a.shift_completed_at).length;
  const compliance_rate = alerts_triggered > 0 ? shifts_completed / alerts_triggered : null;

  // Average zone severity across all readings, pick the worst.
  const zoneTotals = Object.fromEntries(ZONES.map((z) => [z, 0]));
  for (const r of readings) {
    for (const z of ZONES) {
      zoneTotals[z] += SEVERITY[r[z]] ?? 0;
    }
  }
  const avg_distribution = {};
  let worst_zone = null;
  let worstAvg = -1;
  const n = readings.length || 1;
  for (const z of ZONES) {
    const avg = zoneTotals[z] / n;
    avg_distribution[z] = Number(avg.toFixed(3));
    if (avg > worstAvg) {
      worstAvg = avg;
      worst_zone = z;
    }
  }

  // Longest gap between a triggered alert and the next shift completion
  // (or session end if they never shifted).
  let longest_no_shift_sec = 0;
  for (const a of alerts) {
    const start = new Date(a.triggered_at).getTime();
    const end = a.shift_completed_at ? new Date(a.shift_completed_at).getTime() : Date.now();
    longest_no_shift_sec = Math.max(longest_no_shift_sec, Math.floor((end - start) / 1000));
  }

  return {
    alerts_triggered,
    shifts_completed,
    compliance_rate,
    longest_no_shift_sec,
    worst_zone,
    avg_distribution,
    repositions_detected: session?.repositions_detected ?? 0,
  };
}

module.exports = { computeSessionAggregates };
