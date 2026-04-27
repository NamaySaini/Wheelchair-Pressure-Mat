const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { sessionBelongsToUser } = require('./ownership');

const router = Router();
router.use(requireAuth);

// POST /snapshots — insert a raw 16×16 grid.
router.post('/', async (req, res) => {
  const { session_id, grid } = req.body || {};

  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!Array.isArray(grid) || grid.length !== 256) {
    return res.status(400).json({ error: 'grid must be an array of 256 integers' });
  }
  try {
    const ownsSession = await sessionBelongsToUser(session_id, req.user.id);
    if (!ownsSession) return res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to verify session' });
  }

  const { error } = await supabase.from('reading_snapshots').insert({ session_id, grid });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

module.exports = router;
