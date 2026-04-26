/**
 * PressureMap
 *
 * Renders a 16×16 grid of pressure dots on a dark background.
 * `data` is a flat array of 256 values in [0, 1] (normalised ADC readings).
 * When no data is provided a realistic mock sitting pattern is shown.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, pressureColor } from '@/constants/theme';

const ROWS = 16;
const COLS = 16;
const MAP_SIZE = 222; // matches Figma
const OUTER_PADDING = 8;
const DOT_GAP = 1;

function mockData(): number[] {
  return [
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.30,0.38,0.30,0.18,0.18,0.18,0.18,0.18,0.18,0.30,0.40,0.32,0.18,0.18,
    0.18,0.24,0.42,0.52,0.42,0.24,0.18,0.18,0.18,0.18,0.26,0.44,0.60,0.44,0.24,0.18,
    0.18,0.32,0.55,0.68,0.55,0.32,0.18,0.18,0.18,0.24,0.42,0.64,0.84,0.64,0.36,0.18,
    0.30,0.48,0.74,0.86,0.74,0.48,0.30,0.24,0.32,0.48,0.74,0.90,0.98,0.86,0.52,0.30,
    0.48,0.68,0.90,0.98,0.90,0.68,0.48,0.42,0.48,0.68,0.92,1.00,1.00,0.92,0.68,0.42,
    0.36,0.56,0.82,0.90,0.82,0.56,0.36,0.56,0.60,0.82,0.98,1.00,1.00,0.98,0.82,0.56,
    0.18,0.42,0.62,0.82,0.74,0.48,0.30,0.18,0.18,0.42,0.68,0.92,0.86,0.62,0.30,0.18,
    0.18,0.28,0.48,0.62,0.55,0.36,0.18,0.18,0.18,0.32,0.52,0.68,0.62,0.42,0.24,0.18,
    0.18,0.18,0.30,0.42,0.36,0.24,0.18,0.18,0.18,0.24,0.36,0.48,0.42,0.30,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
    0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,0.18,
  ];
}

type Props = {
  data?: number[];
  size?: number;
};

export default function PressureMap({ data, size = MAP_SIZE }: Props) {
  const values = useMemo(() => data ?? mockData(), [data]);
  const innerSize = Math.max(0, size - OUTER_PADDING * 2);
  const dotSize = (innerSize - DOT_GAP * (COLS - 1)) / COLS;
  const gridSize = dotSize * COLS + DOT_GAP * (COLS - 1);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
        {Array.from({ length: ROWS }).map((_, row) => (
          <View key={row} style={[styles.row, row < ROWS - 1 && { marginBottom: DOT_GAP }]}>
            {Array.from({ length: COLS }).map((_, col) => {
              const val = values[row * COLS + col] ?? 0;
              const color = val > 0.05 ? pressureColor(val) : 'rgba(255,255,255,0.08)';
              return (
                <View
                  key={col}
                  style={[
                    styles.dot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: color,
                      marginRight: col < COLS - 1 ? DOT_GAP : 0,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.pressureMapBg,
    borderRadius: 13,
    padding: OUTER_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  dot: {},
});
