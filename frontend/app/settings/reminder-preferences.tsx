/**
 * Settings — Reminder Preferences
 *
 * Controls the relief-timer interval and shift-hold duration.
 * Both values are stored in PressureMonitorContext.
 */
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';

const FREQUENCY_OPTIONS = [
  { label: '15 min', valueSec: 15 * 60 },
  { label: '20 min', valueSec: 20 * 60 },
  { label: '25 min', valueSec: 25 * 60 },
  { label: '30 min', valueSec: 30 * 60 },
];

const SNOOZE_OPTIONS = [
  { label: '30s', valueSec: 30 },
  { label: '45s', valueSec: 45 },
  { label: '60s', valueSec: 60 },
];

export default function ReminderPreferencesScreen() {
  const router = useRouter();
  const {
    intervalSec,
    setIntervalSec,
    shiftDurationRequired,
    setShiftDurationRequired,
  } = usePressureMonitor();

  const [sleepModeEnabled, setSleepModeEnabled] = useState(true);
  const [snoozeTime, setSnoozeTime] = useState(30);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>×</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Reminder Preferences</Text>
      <Text style={styles.subtitle}>Choose reminder frequency</Text>

      {/* Frequency grid */}
      <View style={styles.gridSection}>
        <View style={styles.grid}>
          {FREQUENCY_OPTIONS.map((item) => {
            const selected = intervalSec === item.valueSec;
            return (
              <TouchableOpacity
                key={item.valueSec}
                style={[styles.gridCell, selected && styles.gridCellSelected]}
                onPress={() => setIntervalSec(item.valueSec)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gridCellText, selected && styles.gridCellTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sleep Mode */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sleep Mode</Text>
          <Switch
            value={sleepModeEnabled}
            onValueChange={setSleepModeEnabled}
            trackColor={{ true: '#351601' }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Snooze Time */}
      <Text style={styles.sectionLabel}>Snooze Time</Text>
      <View style={styles.snoozeRow}>
        {SNOOZE_OPTIONS.map((item) => {
          const selected = snoozeTime === item.valueSec;
          return (
            <TouchableOpacity
              key={item.valueSec}
              style={[styles.snoozeBtn, selected && styles.snoozeBtnSelected]}
              onPress={() => setSnoozeTime(item.valueSec)}
              activeOpacity={0.7}
            >
              <Text style={[styles.snoozeBtnText, selected && styles.snoozeBtnTextSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.saveSnoozeBtn}
          onPress={() => setShiftDurationRequired(snoozeTime)}
          activeOpacity={0.7}
        >
          <Text style={styles.saveSnoozeText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6fafd' },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,158,87,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  closeBtnText: {
    fontSize: 22,
    color: '#351601',
    lineHeight: 26,
  },
  screenTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#351601',
  },
  subtitle: {
    fontSize: 13,
    color: '#647b96',
    marginTop: -8,
  },
  gridSection: { gap: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    width: '46%',
    backgroundColor: '#fff2e4',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridCellSelected: {
    borderColor: Colors.primary,
  },
  gridCellText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#351601',
  },
  gridCellTextSelected: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: '#fff2e4',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, color: '#351601', fontWeight: '500' },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#351601',
  },
  snoozeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  snoozeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff2e4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  snoozeBtnSelected: {
    borderColor: Colors.primary,
  },
  snoozeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#351601',
  },
  snoozeBtnTextSelected: {
    color: Colors.primary,
  },
  saveSnoozeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#351601',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSnoozeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
});
