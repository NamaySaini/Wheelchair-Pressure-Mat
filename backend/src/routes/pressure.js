const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// POST /pressure
// Body: { sensors: number[16], timestamp?: string }
// Logs a single pressure reading snapshot for the authenticated user.
router.post('/', requireAuth, async (req, res) => {
  const { sensors, timestamp } = req.body;

  if (!Array.isArray(sensors) || sensors.length !== 16) {
    return res.status(400).json({ error: 'sensors must be an array of 16 values' });
  }

  const { error } = await supabase.from('pressure_logs').insert({
    user_id: req.user.id,
    sensors,
    recorded_at: timestamp || new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ success: true });
});

// GET /pressure
// Query params: period = 'week' | 'month' | 'year' (default: 'week')
// Returns pressure logs for the authenticated user within the requested period.
router.get('/', requireAuth, async (req, res) => {
  const period = req.query.period || 'week';

  const periodDays = { week: 7, month: 30, year: 365 };
  const days = periodDays[period];
  if (!days) {
    return res.status(400).json({ error: "period must be 'week', 'month', or 'year'" });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('pressure_logs')
    .select('id, sensors, recorded_at')
    .eq('user_id', req.user.id)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

module.exports = router;
