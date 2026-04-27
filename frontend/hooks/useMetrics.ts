/**
 * Pure helpers for turning the 16×16 pressure grid into compact derived metrics.
 * Grid layout: 256 values in row-major order, each normalized to [0, 1].
 */

export type ZoneLabel = 'low' | 'moderate' | 'high';

export type ZoneSummary = {
  left_ischial: ZoneLabel;
  right_ischial: ZoneLabel;
  left_thigh: ZoneLabel;
  right_thigh: ZoneLabel;
  center_zone: ZoneLabel;
  max_pressure_zone: keyof Omit<ZoneSummary, 'max_pressure_zone'>;
};

export const GRID_SIZE = 16;
export const ZONE_THRESHOLDS = { LOW: 0.25, MODERATE: 0.6 };

function classify(mean: number): ZoneLabel {
  if (mean < ZONE_THRESHOLDS.LOW) return 'low';
  if (mean < ZONE_THRESHOLDS.MODERATE) return 'moderate';
  return 'high';
}

/**
 * Weighted X position of center of pressure, normalized to [0, 1].
 * 0 = far left column, 1 = far right column. Returns 0.5 with no pressure.
 */
export function computeCoPX(data: number[]): number {
  let weightedX = 0;
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      weightedX += v * c;
      total += v;
    }
  }
  if (total === 0) return 0.5;
  return weightedX / total / (GRID_SIZE - 1);
}

/**
 * Weighted Y position of center of pressure, normalized to [0, 1].
 * 0 = top row, 1 = bottom row. Returns 0.5 with no pressure.
 */
export function computeCoPY(data: number[]): number {
  let weightedY = 0;
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      weightedY += v * r;
      total += v;
    }
  }
  if (total === 0) return 0.5;
  return weightedY / total / (GRID_SIZE - 1);
}

/**
 * Left/right symmetry score in [0, 1]. 1 = perfectly symmetric.
 * Based on summed absolute differences between mirrored columns.
 */
export function computeSymmetry(data: number[]): number {
  let diff = 0;
  let total = 0;
  const half = GRID_SIZE / 2;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < half; c++) {
      const left = data[r * GRID_SIZE + c] ?? 0;
      const right = data[r * GRID_SIZE + (GRID_SIZE - 1 - c)] ?? 0;
      diff += Math.abs(left - right);
      total += left + right;
    }
  }
  if (total === 0) return 1;
  return 1 - diff / total;
}

export function computeMaxPressure(data: number[]): number {
  let m = 0;
  for (let i = 0; i < data.length; i++) if (data[i] > m) m = data[i];
  return m;
}

/**
 * Partition the 16×16 into 5 zones and classify each by mean pressure.
 * Also returns which zone has the highest mean (max_pressure_zone).
 *
 * Zone layout (rows × cols):
 *   rows 0–5   (top):    left_thigh (cols 0–7),   right_thigh (cols 8–15)
 *   rows 6–9   (middle): center_zone spans full row
 *   rows 10–15 (bottom): left_ischial (cols 0–7), right_ischial (cols 8–15)
 */
export function computeZoneSummary(data: number[]): ZoneSummary {
  const cells = {
    left_thigh: [] as number[],
    right_thigh: [] as number[],
    center_zone: [] as number[],
    left_ischial: [] as number[],
    right_ischial: [] as number[],
  };

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = data[r * GRID_SIZE + c] ?? 0;
      if (r < 6) {
        if (c < 8) cells.left_thigh.push(v);
        else cells.right_thigh.push(v);
      } else if (r < 10) {
        cells.center_zone.push(v);
      } else {
        if (c < 8) cells.left_ischial.push(v);
        else cells.right_ischial.push(v);
      }
    }
  }

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const means = {
    left_thigh: mean(cells.left_thigh),
    right_thigh: mean(cells.right_thigh),
    center_zone: mean(cells.center_zone),
    left_ischial: mean(cells.left_ischial),
    right_ischial: mean(cells.right_ischial),
  };

  let maxZone: keyof typeof means = 'center_zone';
  let maxMean = -1;
  for (const z of Object.keys(means) as (keyof typeof means)[]) {
    if (means[z] > maxMean) {
      maxMean = means[z];
      maxZone = z;
    }
  }

  return {
    left_thigh: classify(means.left_thigh),
    right_thigh: classify(means.right_thigh),
    center_zone: classify(means.center_zone),
    left_ischial: classify(means.left_ischial),
    right_ischial: classify(means.right_ischial),
    max_pressure_zone: maxZone,
  };
}

/**
 * Returns the full set of reading-row fields derived from a raw grid.
 */
export function deriveReading(data: number[]) {
  const zones = computeZoneSummary(data);
  return {
    cop_x: computeCoPX(data),
    cop_y: computeCoPY(data),
    symmetry: computeSymmetry(data),
    max_pressure: computeMaxPressure(data),
    max_pressure_zone: zones.max_pressure_zone,
    left_ischial: zones.left_ischial,
    right_ischial: zones.right_ischial,
    left_thigh: zones.left_thigh,
    right_thigh: zones.right_thigh,
    center_zone: zones.center_zone,
  };
}
