const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

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

async function ensureUserProfile(userId) {
  const { data: existing, error: selectError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      timezone: 'America/Chicago',
      target_reposition_interval_sec: 1800,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// POST /users — upsert the authenticated user's profile.
router.post('/', async (req, res) => {
  const body = req.body || {};
  const patch = { user_id: req.user.id, updated_at: new Date().toISOString() };
  for (const k of WRITABLE) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(patch, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

// GET /users/me — return the authenticated user's profile, creating defaults if needed.
router.get('/me', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || (await ensureUserProfile(req.user.id)));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load profile' });
  }
});

module.exports = router;
module.exports.ensureUserProfile = ensureUserProfile;
