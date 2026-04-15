/**
 * Pressure Tracker — view historical pressure over Day / Week / Month / Year.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ScreenShell from '@/components/screen-shell';
import PressureMap from '@/components/pressure-map';
import { Colors } from '@/constants/theme';

type Period = 'Year' | 'Month' | 'Week' | 'Day';
const PERIODS: Period[] = ['Year', 'Month', 'Week', 'Day'];

export default function TrackerScreen() {
  const [period, setPeriod] = useState<Period>('Day');
  const [dayOffset, setDayOffset] = useState(0); // 0 = today

  const dateLabel = (() => {
    if (period === 'Day') {
      if (dayOffset === 0) return 'Today, April 14';
      if (dayOffset === 1) return 'Yesterday, April 13';
      return `April ${14 - dayOffset}`;
    }
    if (period === 'Week') {
      if (dayOffset === 0) return 'This week';
      if (dayOffset === 1) return 'Last week';
      return `${dayOffset} weeks ago`;
    }
    if (period === 'Month') {
      if (dayOffset === 0) return 'This month';
      if (dayOffset === 1) return 'Last month';
      return `${dayOffset} months ago`;
    }
    if (dayOffset === 0) return 'This year';
    return `${dayOffset} years ago`;
  })();

  return (
    <>
      <StatusBar style="light" />
      <ScreenShell
        title="Pressure Tracker"
        subtitle="Track Pressure Over Time"
        headerColor={Colors.trackerRed}
        bgColor={Colors.trackerBg}
        scrollable={false}
      >
        <View style={styles.inner}>
          {/* Period selector */}
          <View style={styles.periodBar}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => { setPeriod(p); setDayOffset(0); }}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pressure colour key */}
          <View style={styles.keyRow}>
            <Text style={styles.keyLabel}>LOW</Text>
            <View style={styles.pressureBar} />
            <Text style={styles.keyLabelRight}>HIGH</Text>
          </View>

          {/* Map */}
          <Text style={styles.mapTitle}>PRESSURE MAP</Text>
          <Text style={styles.mapSide}>FRONT</Text>
          <View style={styles.mapRow}>
            <Text style={styles.mapLR}>L</Text>
            <PressureMap size={230} />
            <Text style={styles.mapLR}>R</Text>
          </View>
          <Text style={styles.mapSide}>BACK</Text>

          {/* Time slider */}
          <View style={styles.sliderCard}>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => setDayOffset((v) => v + 1)}
            >
              <Text style={styles.arrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.sliderTrack}>
              <View style={styles.sliderFill} />
            </View>

            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => setDayOffset((v) => Math.max(0, v - 1))}
            >
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
        </View>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  periodBar: {
    flexDirection: 'row',
    backgroundColor: '#0D1A63',
    borderRadius: 90,
    padding: 4,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 90,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#000',
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textCream,
  },
  periodTextActive: {
    color: Colors.white,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
    gap: 8,
  },
  keyLabel: {
    fontSize: 10,
    color: Colors.textDark,
    width: 28,
  },
  keyLabelRight: {
    fontSize: 10,
    color: Colors.textDark,
    width: 28,
    textAlign: 'right',
  },
  pressureBar: {
    flex: 1,
    height: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  mapSide: {
    fontSize: 12,
    color: Colors.textDark,
    textAlign: 'center',
    marginVertical: 2,
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLR: {
    fontSize: 12,
    color: Colors.textDark,
    width: 20,
    textAlign: 'center',
  },
  sliderCard: {
    backgroundColor: Colors.trackerCardBg,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
  },
  sliderFill: {
    width: '50%',
    height: '100%',
    backgroundColor: Colors.trackerRed,
    borderRadius: 2,
  },
  dateLabel: {
    fontSize: 13,
    color: Colors.textDark,
    textAlign: 'center',
  },
  arrowBtn: {
    position: 'absolute',
    left: 14,
    top: 22,
    padding: 4,
  },
  arrow: {
    fontSize: 22,
    color: Colors.trackerRed,
    fontWeight: '600',
  },
});
