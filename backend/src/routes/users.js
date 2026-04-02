const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// POST /users
// Body: { age?, weight_kg?, height_cm? }
// Creates or updates the authenticated user's profile.
router.post('/', requireAuth, async (req, res) => {
  const { age, weight_kg, height_cm } = req.body;

  const { error } = await supabase
    .from('users')
    .upsert({ user_id: req.user.id, age, weight_kg, height_cm }, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ success: true });
});

// GET /users/me
// Returns the authenticated user's profile.
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('age, weight_kg, height_cm')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  res.json(data || {});
});

module.exports = router;
