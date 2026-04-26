const { Router } = require('express');
const supabase = require('../supabase');

const router = Router();

// POST /alert-events — fired when the alert phase transitions to 'alerting'.
router.post('/', async (req, res) => {
  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const { data, error } = await supabase
    .from('alert_events')
    .insert({ session_id })
    .select('id, triggered_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /alert-events/:id — update acknowledged_at / shift_completed_at.
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { acknowledged, shift_completed } = req.body || {};

  const patch = {};
  if (acknowledged) patch.acknowledged_at = new Date().toISOString();
  if (shift_completed) patch.shift_completed_at = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { error } = await supabase.from('alert_events').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
