const { Router } = require('express');
const supabase = require('../supabase');

const router = Router();

// POST /snapshots — insert a raw 16×16 grid.
router.post('/', async (req, res) => {
  const { session_id, grid } = req.body || {};

  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!Array.isArray(grid) || grid.length !== 256) {
    return res.status(400).json({ error: 'grid must be an array of 256 integers' });
  }

  const { error } = await supabase.from('reading_snapshots').insert({ session_id, grid });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

module.exports = router;
