const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { computeSessionAggregates } = require('../metrics/aggregates');
const { summarizeSession } = require('../llm/summarizeSession');

const router = Router();
router.use(requireAuth);

// POST /sessions — start a new session.
router.post('/', async (req, res) => {
  const { repositions_detected = 0 } = req.body || {};

  try {
    console.log('[sessions] start requested', {
      user_id: req.user.id,
      repositions_detected,
      at: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: req.user.id, repositions_detected })
      .select('id, started_at')
      .single();

    if (error) {
      console.error('[sessions] start failed', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('[sessions] start created', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('[sessions] start crashed', error);
    res.status(500).json({ error: error.message || 'Failed to start session' });
  }
});

// POST /sessions/:id/end — end an active session and compute aggregates.
// Body: { auto_ended?: boolean, ended_reason?: 'user'|'no_pressure'|'ble_disconnect',
//         repositions_detected?: number }
router.post('/:id/end', async (req, res) => {
  const { id } = req.params;
  const { auto_ended = false, ended_reason = 'user', repositions_detected } = req.body || {};

  // Bump reposition count (client tracks it live).
  if (typeof repositions_detected === 'number') {
    await supabase
      .from('sessions')
      .update({ repositions_detected })
      .eq('id', id)
      .eq('user_id', req.user.id);
  }

  // Look up started_at to compute duration.
  const { data: current, error: fetchErr } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!current) return res.status(404).json({ error: 'Session not found' });

  const aggregates = await computeSessionAggregates(id);

  const endedAt = new Date();
  const duration_sec = Math.max(
    0,
    Math.floor((endedAt.getTime() - new Date(current.started_at).getTime()) / 1000)
  );

  const { data: updated, error } = await supabase
    .from('sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_sec,
      auto_ended,
      ended_reason,
      ...aggregates,
    })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  let summary = null;
  try {
    summary = await summarizeSession(updated);
  } catch (e) {
    console.warn('session summary failed:', e.message);
  }
  res.json({ session: updated, summary });
});

// GET /sessions — list recent sessions.
// Query: period = 'week' | 'month' | 'year' (default: 'week')
router.get('/', async (req, res) => {
  const period = req.query.period || 'week';
  const days = { week: 7, month: 30, year: 365 }[period];
  if (!days) return res.status(400).json({ error: "period must be 'week', 'month', or 'year'" });

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', req.user.id)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /sessions/:id — one session + its summary (if any).
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [{ data: session, error: sErr }, { data: summary }] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', id).eq('user_id', req.user.id).maybeSingle(),
    supabase.from('session_summaries').select('*').eq('session_id', id).maybeSingle(),
  ]);
  if (sErr) return res.status(500).json({ error: sErr.message });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session, summary });
});

module.exports = router;
