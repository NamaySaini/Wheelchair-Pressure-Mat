// Server-side mirror of frontend/hooks/useMetrics.ts zone thresholds.
// Zone values are normalized [0, 1] (ADC / 4095).

const ZONE_THRESHOLDS = {
  LOW: 0.25,
  MODERATE: 0.6,
};

const ZONES = ['left_ischial', 'right_ischial', 'left_thigh', 'right_thigh', 'center_zone'];

function classify(meanValue) {
  if (meanValue < ZONE_THRESHOLDS.LOW) return 'low';
  if (meanValue < ZONE_THRESHOLDS.MODERATE) return 'moderate';
  return 'high';
}

module.exports = { ZONE_THRESHOLDS, ZONES, classify };
