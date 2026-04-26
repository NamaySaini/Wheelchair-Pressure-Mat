const { Router } = require('express');
const supabase = require('../supabase');
const { DEMO_USER_ID } = require('../supabase');

const router = Router();

// Fields we let the client write into user_profiles.
const WRITABLE = [
  'age',
  'weight_kg',
  'height_cm',
  'condition',
  'wheelchair_type',
  'cushion_type',
  'risk_level',
  'target_reposition_interval_sec',
  'timezone',
];

// POST /users — upsert the demo user's profile.
router.post('/', async (req, res) => {
  const body = req.body || {};
  const patch = { user_id: DEMO_USER_ID, updated_at: new Date().toISOString() };
  for (const k of WRITABLE) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(patch, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

// GET /users/me — return the demo user's profile, or defaults if none saved yet.
router.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', DEMO_USER_ID)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { timezone: 'America/Chicago', target_reposition_interval_sec: 1800 });
});

module.exports = router;
