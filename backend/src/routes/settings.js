const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// PUT /settings
// Body: { alert_interval_ms: number }
// Saves the user's alert interval preference.
router.put('/', requireAuth, async (req, res) => {
  const { alert_interval_ms } = req.body;

  if (typeof alert_interval_ms !== 'number' || alert_interval_ms < 1000) {
    return res.status(400).json({ error: 'alert_interval_ms must be a number >= 1000' });
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: req.user.id, alert_interval_ms }, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, alert_interval_ms });
});

// GET /settings
// Returns the authenticated user's saved settings.
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('alert_interval_ms')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  // Return defaults if no settings saved yet
  res.json(data || { alert_interval_ms: 900000 }); // default 15 min
});

module.exports = router;
