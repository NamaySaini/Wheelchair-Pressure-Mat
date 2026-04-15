/**
 * Pressure Tracker — view historical pressure over Day / Week / Month / Year.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import ScreenShell from '@/components/screen-shell';
import PressureMap from '@/components/pressure-map';
import { Colors, PressureColors } from '@/constants/theme';

type Period = 'Year' | 'Month' | 'Week' | 'Day';
const PERIODS: Period[] = ['Year', 'Month', 'Week', 'Day'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBRS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];
const DAY_ABBRS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addPeriod(date: Date, period: Period, delta: number): Date {
  const d = new Date(date);
  if (period === 'Day') d.setDate(d.getDate() + delta);
  else if (period === 'Week') d.setDate(d.getDate() + delta * 7);
  else if (period === 'Month') d.setMonth(d.getMonth() + delta);
  else d.setFullYear(d.getFullYear() + delta);
  return d;
}

function isSamePeriod(a: Date, b: Date, period: Period): boolean {
  if (period === 'Day')
    return a.toDateString() === b.toDateString();
  if (period === 'Week') {
    const getWeekStart = (d: Date) => {
      const s = new Date(d);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      s.setHours(0, 0, 0, 0);
      return s.getTime();
    };
    return getWeekStart(a) === getWeekStart(b);
  }
  if (period === 'Month')
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  return a.getFullYear() === b.getFullYear();
}

function isFuturePeriod(anchor: Date, today: Date, period: Period): boolean {
  if (period === 'Day') return anchor > today && anchor.toDateString() !== today.toDateString();
  if (period === 'Week') {
    const getWeekStart = (d: Date) => {
      const s = new Date(d);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      s.setHours(0, 0, 0, 0);
      return s.getTime();
    };
    return getWeekStart(anchor) > getWeekStart(today);
  }
  if (period === 'Month') {
    if (anchor.getFullYear() > today.getFullYear()) return true;
    return anchor.getFullYear() === today.getFullYear() && anchor.getMonth() > today.getMonth();
  }
  return anchor.getFullYear() > today.getFullYear();
}

export default function TrackerScreen() {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>('Day');
  const [anchor, setAnchor] = useState(new Date());
  const [sliderFraction, setSliderFraction] = useState(0.5);
  const [trackWidth, setTrackWidth] = useState(0);

  const isAtCurrent = isSamePeriod(anchor, today, period);
  const canGoForward = !isAtCurrent;

  const navigate = useCallback(
    (delta: number) => {
      setAnchor((prev) => {
        const next = addPeriod(prev, period, delta);
        if (delta > 0 && isFuturePeriod(next, today, period)) return prev;
        return next;
      });
      setSliderFraction(0.5);
    },
    [period, today],
  );

  // --- Date label ---
  const dateLabel = useMemo(() => {
    if (period === 'Day') {
      if (anchor.toDateString() === today.toDateString())
        return `Today, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (anchor.toDateString() === yesterday.toDateString())
        return `Yesterday, ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getDate()}`;
      return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getDate()}`;
    }
    if (period === 'Week') {
      const weekStart = new Date(anchor);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (isAtCurrent) return 'This Week';
      const fmt = (d: Date) =>
        `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
    }
    if (period === 'Month') {
      return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    return `${anchor.getFullYear()}`;
  }, [period, anchor, today, isAtCurrent]);

  // --- Slider labels ---
  const sliderLabels: [string, string] = useMemo(() => {
    if (period === 'Day') return ['12:00 AM', '11:59 PM'];
    if (period === 'Week') return ['MON', 'SUN'];
    if (period === 'Month') {
      const days = daysInMonth(anchor.getFullYear(), anchor.getMonth());
      return ['01', String(days)];
    }
    return ['JAN', 'DEC'];
  }, [period, anchor]);

  // Slider scrub position label
  const scrubLabel = useMemo(() => {
    if (period === 'Day') {
      const hour = Math.round(sliderFraction * 23);
      const ampm = hour < 12 ? 'AM' : 'PM';
      const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${h}:00 ${ampm}`;
    }
    if (period === 'Week') {
      const idx = Math.round(sliderFraction * 6);
      return DAY_ABBRS[idx];
    }
    if (period === 'Month') {
      const days = daysInMonth(anchor.getFullYear(), anchor.getMonth());
      const day = Math.round(sliderFraction * (days - 1)) + 1;
      return `Day ${day}`;
    }
    const idx = Math.round(sliderFraction * 11);
    return MONTH_ABBRS[idx];
  }, [period, sliderFraction, anchor]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const onPanGesture = (event: PanGestureHandlerGestureEvent) => {
    if (trackWidth <= 0) return;
    const x = event.nativeEvent.x;
    setSliderFraction(Math.max(0, Math.min(1, x / trackWidth)));
  };

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
                onPress={() => {
                  setPeriod(p);
                  setAnchor(new Date());
                  setSliderFraction(0.5);
                }}
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
            <LinearGradient
              colors={[PressureColors.low, PressureColors.high]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pressureBar}
            />
            <Text style={styles.keyLabelRight}>HIGH</Text>
          </View>

          {/* Map */}
          <Text style={styles.mapTitle}>PRESSURE MAP</Text>
          <Text style={styles.mapSide}>FRONT</Text>
          <View style={styles.mapRow}>
            <Text style={styles.mapLR}>L</Text>
            <PressureMap size={210} />
            <Text style={styles.mapLR}>R</Text>
          </View>
          <Text style={styles.mapSide}>BACK</Text>

          {/* Time navigation card */}
          <View style={styles.sliderCard}>
            {/* Arrow row with label */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => navigate(-1)}
              >
                <Text style={styles.arrow}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.dateLabel}>{dateLabel}</Text>

              <TouchableOpacity
                style={[styles.arrowBtn, !canGoForward && styles.arrowDisabled]}
                onPress={() => canGoForward && navigate(1)}
                disabled={!canGoForward}
              >
                <Text style={[styles.arrow, !canGoForward && styles.arrowTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Scrub label */}
            <Text style={styles.scrubLabel}>{scrubLabel}</Text>

            {/* Slider */}
            <GestureHandlerRootView style={styles.sliderContainer}>
              <PanGestureHandler onGestureEvent={onPanGesture}>
                <View style={styles.sliderTrackOuter} onLayout={onTrackLayout}>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${sliderFraction * 100}%` },
                      ]}
                    />
                  </View>
                  {/* Thumb */}
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${sliderFraction * 100}%` },
                    ]}
                  />
                </View>
              </PanGestureHandler>

              {/* Slider end labels */}
              <View style={styles.sliderLabelRow}>
                <Text style={styles.sliderEndLabel}>{sliderLabels[0]}</Text>
                <Text style={styles.sliderEndLabel}>{sliderLabels[1]}</Text>
              </View>
            </GestureHandlerRootView>
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
    borderRadius: 12,
    marginTop: 10,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrow: {
    fontSize: 24,
    color: Colors.trackerRed,
    fontWeight: '700',
  },
  arrowTextDisabled: {
    color: '#999',
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    flex: 1,
  },
  scrubLabel: {
    fontSize: 13,
    color: Colors.textDark,
    textAlign: 'center',
    fontWeight: '500',
  },
  sliderContainer: {
    width: '100%',
  },
  sliderTrackOuter: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.trackerRed,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.trackerRed,
    marginLeft: -9,
    top: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderEndLabel: {
    fontSize: 10,
    color: Colors.textDark,
    opacity: 0.6,
  },
});
