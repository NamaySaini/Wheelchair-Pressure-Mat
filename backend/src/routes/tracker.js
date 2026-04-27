const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GRID_LENGTH = 256;
const SESSION_ID_BATCH = 120;

function getZonedParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

function toUtcCalendarDate({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfWeekUtc(parts) {
  const date = toUtcCalendarDate(parts);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildQueryRange(period, anchorParts) {
  let start = null;
  let end = null;

  if (period === 'day') {
    start = Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day - 1);
    end = Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day + 2);
  } else if (period === 'week') {
    const weekStart = startOfWeekUtc(anchorParts);
    start = weekStart.getTime() - 86400000;
    end = weekStart.getTime() + 8 * 86400000;
  } else if (period === 'month') {
    start = Date.UTC(anchorParts.year, anchorParts.month - 1, 0);
    end = Date.UTC(anchorParts.year, anchorParts.month, daysInMonth(anchorParts.year, anchorParts.month) + 2);
  } else {
    start = Date.UTC(anchorParts.year - 1, 11, 31);
    end = Date.UTC(anchorParts.year + 1, 0, 2);
  }

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

function makeEmptyBuckets(period, anchorParts) {
  if (period === 'day') {
    return Array.from({ length: 24 }, (_, hour) => ({
      index: hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      snapshot_count: 0,
      grid: null,
    }));
  }

  if (period === 'week') {
    return WEEKDAY_LABELS.map((label, index) => ({
      index,
      label,
      snapshot_count: 0,
      grid: null,
    }));
  }

  if (period === 'month') {
    return Array.from({ length: daysInMonth(anchorParts.year, anchorParts.month) }, (_, i) => ({
      index: i,
      label: String(i + 1),
      snapshot_count: 0,
      grid: null,
    }));
  }

  return MONTH_LABELS.map((label, index) => ({
    index,
    label,
    snapshot_count: 0,
    grid: null,
  }));
}

function findBucketIndex(period, anchorParts, snapshotParts) {
  if (period === 'day') {
    if (
      snapshotParts.year !== anchorParts.year ||
      snapshotParts.month !== anchorParts.month ||
      snapshotParts.day !== anchorParts.day
    ) {
      return -1;
    }
    return snapshotParts.hour;
  }

  if (period === 'week') {
    const weekStart = startOfWeekUtc(anchorParts);
    const snapshotDate = toUtcCalendarDate(snapshotParts);
    const diffDays = Math.round((snapshotDate.getTime() - weekStart.getTime()) / 86400000);
    return diffDays >= 0 && diffDays < 7 ? diffDays : -1;
  }

  if (period === 'month') {
    if (snapshotParts.year !== anchorParts.year || snapshotParts.month !== anchorParts.month) {
      return -1;
    }
    return snapshotParts.day - 1;
  }

  if (snapshotParts.year !== anchorParts.year) return -1;
  return snapshotParts.month - 1;
}

function averageGrids(grids) {
  if (!grids.length) return null;
  const totals = Array.from({ length: GRID_LENGTH }, () => 0);

  for (const grid of grids) {
    for (let i = 0; i < GRID_LENGTH; i++) {
      totals[i] += Number(grid[i] || 0);
    }
  }

  return totals.map((value) => Number((value / grids.length / 4095).toFixed(4)));
}

async function loadSnapshotsForSessions(sessionIds, range) {
  const snapshots = [];

  for (let i = 0; i < sessionIds.length; i += SESSION_ID_BATCH) {
    const batchIds = sessionIds.slice(i, i + SESSION_ID_BATCH);
    const { data, error } = await supabase
      .from('reading_snapshots')
      .select('recorded_at, grid, session_id')
      .in('session_id', batchIds)
      .gte('recorded_at', range.start)
      .lt('recorded_at', range.end)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    snapshots.push(...(data || []));
  }

  return snapshots;
}

router.get('/', async (req, res) => {
  const period = req.query.period || 'day';
  const anchor = req.query.anchor ? new Date(req.query.anchor) : new Date();

  if (!['day', 'week', 'month', 'year'].includes(period)) {
    return res.status(400).json({ error: "period must be 'day', 'week', 'month', or 'year'" });
  }
  if (Number.isNaN(anchor.getTime())) {
    return res.status(400).json({ error: 'anchor must be a valid ISO date' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (profileError) return res.status(500).json({ error: profileError.message });

  const timezone = profile?.timezone || 'America/Chicago';
  const anchorParts = getZonedParts(anchor, timezone);
  const range = buildQueryRange(period, anchorParts);
  const buckets = makeEmptyBuckets(period, anchorParts);

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', req.user.id)
    .gte('started_at', range.start)
    .lt('started_at', range.end);
  if (sessionsError) return res.status(500).json({ error: sessionsError.message });

  const sessionIds = (sessions || []).map((session) => session.id);
  if (!sessionIds.length) {
    return res.json({
      period,
      anchor: anchor.toISOString(),
      timezone,
      selected_index:
        period === 'day'
          ? anchorParts.hour
          : period === 'week'
            ? WEEKDAY_LABELS.indexOf(anchorParts.weekday)
            : period === 'month'
              ? anchorParts.day - 1
              : anchorParts.month - 1,
      buckets,
    });
  }

  let snapshots = [];
  try {
    snapshots = await loadSnapshotsForSessions(sessionIds, range);
  } catch (snapshotsError) {
    return res.status(500).json({ error: snapshotsError.message || 'Failed to load tracker snapshots' });
  }

  const grouped = buckets.map(() => []);
  for (const snapshot of snapshots || []) {
    const snapshotParts = getZonedParts(new Date(snapshot.recorded_at), timezone);
    const bucketIndex = findBucketIndex(period, anchorParts, snapshotParts);
    if (bucketIndex >= 0 && bucketIndex < grouped.length && Array.isArray(snapshot.grid) && snapshot.grid.length === GRID_LENGTH) {
      grouped[bucketIndex].push(snapshot.grid);
    }
  }

  const hydratedBuckets = buckets.map((bucket, index) => ({
    ...bucket,
    snapshot_count: grouped[index].length,
    grid: averageGrids(grouped[index]),
  }));

  res.json({
    period,
    anchor: anchor.toISOString(),
    timezone,
    selected_index:
      period === 'day'
        ? anchorParts.hour
        : period === 'week'
          ? WEEKDAY_LABELS.indexOf(anchorParts.weekday)
          : period === 'month'
            ? anchorParts.day - 1
            : anchorParts.month - 1,
    buckets: hydratedBuckets,
  });
});

module.exports = router;
