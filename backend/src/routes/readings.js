const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { sessionBelongsToUser } = require('./ownership');

const router = Router();
router.use(requireAuth);

const ZONE_LABELS = ['low', 'moderate', 'high'];
const isZoneLabel = (v) => ZONE_LABELS.includes(v);

// POST /readings — insert a derived-metrics row.
router.post('/', async (req, res) => {
  const r = req.body || {};

  if (!r.session_id) {
    return res.status(400).json({ error: 'session_id is required' });
  }
  try {
    const ownsSession = await sessionBelongsToUser(r.session_id, req.user.id);
    if (!ownsSession) return res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to verify session' });
  }

  const zoneFields = ['left_ischial', 'right_ischial', 'left_thigh', 'right_thigh', 'center_zone'];
  for (const f of zoneFields) {
    if (r[f] !== undefined && !isZoneLabel(r[f])) {
      return res.status(400).json({ error: `${f} must be one of ${ZONE_LABELS.join(', ')}` });
    }
  }

  const { error } = await supabase.from('readings').insert({
    session_id: r.session_id,
    cop_x: r.cop_x,
    cop_y: r.cop_y,
    symmetry: r.symmetry,
    max_pressure: r.max_pressure,
    max_pressure_zone: r.max_pressure_zone,
    left_ischial: r.left_ischial,
    right_ischial: r.right_ischial,
    left_thigh: r.left_thigh,
    right_thigh: r.right_thigh,
    center_zone: r.center_zone,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true });
});

module.exports = router;
