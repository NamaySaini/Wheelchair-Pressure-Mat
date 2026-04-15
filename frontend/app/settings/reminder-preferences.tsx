/**
 * Settings — Reminder Preferences
 *
 * Controls the relief-timer interval and shift-hold duration.
 * Both values are stored in PressureMonitorContext.
 */
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';

const INTERVALS = [
  { label: '5 seconds (testing)', valueSec: 5 },
  { label: '15 minutes',          valueSec: 15 * 60 },
  { label: '20 minutes',          valueSec: 20 * 60 },
  { label: '30 minutes',          valueSec: 30 * 60 },
  { label: '45 minutes',          valueSec: 45 * 60 },
  { label: '60 minutes',          valueSec: 60 * 60 },
];

const SHIFT_DURATIONS = [
  { label: '5 seconds (testing)', valueSec: 5 },
  { label: '15 seconds',          valueSec: 15 },
  { label: '30 seconds',          valueSec: 30 },
  { label: '60 seconds',          valueSec: 60 },
];

export default function ReminderPreferencesScreen() {
  const {
    intervalSec,
    setIntervalSec,
    shiftDurationRequired,
    setShiftDurationRequired,
  } = usePressureMonitor();

  const [alertEnabled, setAlertEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Reminder Preferences' }} />

      {/* Reminder Interval */}
      <Text style={styles.sectionLabel}>Reminder Interval</Text>
      <View style={styles.card}>
        {INTERVALS.map((item, idx) => (
          <React.Fragment key={item.valueSec}>
            <View style={[styles.row, { paddingVertical: 14 }]}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <View
                style={[
                  styles.radio,
                  intervalSec === item.valueSec && styles.radioSelected,
                ]}
                onTouchEnd={() => setIntervalSec(item.valueSec)}
              />
            </View>
            {idx < INTERVALS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Shift Hold Duration */}
      <Text style={styles.sectionLabel}>Shift Hold Duration</Text>
      <Text style={styles.sectionHint}>
        How long you need to lean forward for the alert to clear.
      </Text>
      <View style={styles.card}>
        {SHIFT_DURATIONS.map((item, idx) => (
          <React.Fragment key={item.valueSec}>
            <View style={[styles.row, { paddingVertical: 14 }]}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <View
                style={[
                  styles.radio,
                  shiftDurationRequired === item.valueSec && styles.radioSelected,
                ]}
                onTouchEnd={() => setShiftDurationRequired(item.valueSec)}
              />
            </View>
            {idx < SHIFT_DURATIONS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Alert toggles */}
      <Text style={styles.sectionLabel}>Alert Type</Text>
      <View style={styles.card}>
        {[
          { label: 'Enable reminders', value: alertEnabled, set: setAlertEnabled },
          { label: 'Sound', value: soundEnabled, set: setSoundEnabled },
          { label: 'Vibration', value: vibrateEnabled, set: setVibrateEnabled },
        ].map((item, idx, arr) => (
          <React.Fragment key={item.label}>
            <View style={[styles.row, { paddingVertical: 12 }]}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={item.value}
                onValueChange={item.set}
                trackColor={{ true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
            {idx < arr.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 24, gap: 8, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textBrown,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.creamCard,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 15, color: Colors.textDark },
  divider: { height: 1, backgroundColor: 'rgba(30,20,70,0.1)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textBrown,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
});
