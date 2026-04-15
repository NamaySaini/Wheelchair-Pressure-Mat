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
const DOT = MAP_SIZE / COLS - 2;

function mockData(): number[] {
  // Simulate a seated pressure pattern: high pressure in central lower area (back/ischials)
  const d: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dr = r - 10; // centre of pressure zone (rows 8-13)
      const dc = c - 7.5;
      // Two ischial-tuberosity hotspots
      const left = Math.exp(-(Math.pow(dr, 2) + Math.pow(dc + 2.5, 2)) / 8);
      const right = Math.exp(-(Math.pow(dr, 2) + Math.pow(dc - 2.5, 2)) / 8);
      const base = Math.max(left, right);
      // Add some diffuse thigh pressure
      const thigh = r >= 3 && r <= 7 ? 0.15 * Math.exp(-Math.pow(dc, 2) / 20) : 0;
      d.push(Math.min(1, base + thigh));
    }
  }
  return d;
}

type Props = {
  data?: number[];
  size?: number;
};

export default function PressureMap({ data, size = MAP_SIZE }: Props) {
  const values = useMemo(() => data ?? mockData(), [data]);
  const dotSize = size / COLS - 2;
  const gap = 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Array.from({ length: ROWS }).map((_, row) => (
        <View key={row} style={styles.row}>
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
                    margin: gap / 2,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.pressureMapBg,
    borderRadius: 13,
    padding: 4,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  dot: {},
});
