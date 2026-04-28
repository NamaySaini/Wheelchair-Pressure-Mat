const supabase = require('../supabase');
const { openai, DEFAULT_MODEL } = require('./openai');

const SUMMARY_SYSTEM = `You summarize a single wheelchair-sitting session for the user who just finished it.

Rules:
- 2-3 sentences of summary, then one sentence starting with "Key insight:" that gives one concrete takeaway for next time.
- Reference the actual numbers given (duration, alerts, shifts, compliance, worst zone). Do not invent data.
- No preamble, no disclaimers, no emojis. Speak to the user directly ("you").
- If the session was very short (< 5 min) or had no alerts, keep it light — acknowledge the short session or the clean run.`;

function formatDuration(seconds) {
  if (!seconds) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function buildSessionDescription(session) {
  const bits = [];
  bits.push(`Duration: ${formatDuration(session.duration_sec)}`);
  bits.push(`Alerts triggered: ${session.alerts_triggered ?? 0}`);
  bits.push(`Shifts completed: ${session.shifts_completed ?? 0}`);
  bits.push(`Repositions detected: ${session.repositions_detected ?? 0}`);
  if (session.compliance_rate != null) {
    bits.push(`Compliance: ${Math.round(session.compliance_rate * 100)}%`);
  }
  if (session.longest_no_shift_sec != null) {
    bits.push(`Longest stretch without shifting: ${formatDuration(session.longest_no_shift_sec)}`);
  }
  if (session.worst_zone) bits.push(`Worst zone: ${session.worst_zone}`);
  if (session.avg_distribution) {
    const parts = Object.entries(session.avg_distribution)
      .map(([k, v]) => `${k}=${Number(v).toFixed(2)}`)
      .join(', ');
    bits.push(`Avg zone severity (0-2): ${parts}`);
  }
  if (session.ended_reason && session.ended_reason !== 'user') {
    bits.push(`Ended automatically (${session.ended_reason})`);
  }
  return bits.join('\n');
}

function parseKeyInsight(text) {
  if (!text) return null;
  const match = text.match(/key insight:\s*(.+)$/is);
  return match ? match[1].trim() : null;
}

async function summarizeSession(session) {
  const description = buildSessionDescription(session);

  const resp = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: `Session just ended:\n${description}` },
    ],
  });

  const summary_text = resp.choices?.[0]?.message?.content?.trim() || '';
  const key_insight = parseKeyInsight(summary_text);

  const { data, error } = await supabase
    .from('session_summaries')
    .upsert(
      { session_id: session.id, summary_text, key_insight },
      { onConflict: 'session_id' }
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { summarizeSession };
