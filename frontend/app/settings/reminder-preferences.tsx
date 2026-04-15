/**
 * Settings — Reminder Preferences
 */
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

const INTERVALS = [
  { label: '15 minutes', value: 15 },
  { label: '20 minutes', value: 20 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
];

export default function ReminderPreferencesScreen() {
  const [selectedInterval, setSelectedInterval] = useState(30);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Reminder Preferences' }} />

      {/* Interval */}
      <Text style={styles.sectionLabel}>Reminder Interval</Text>
      <View style={styles.card}>
        {INTERVALS.map((item, idx) => (
          <React.Fragment key={item.value}>
            <View
              style={[
                styles.row,
                { paddingVertical: 14 },
              ]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <View
                style={[
                  styles.radio,
                  selectedInterval === item.value && styles.radioSelected,
                ]}
                onTouchEnd={() => setSelectedInterval(item.value)}
              />
            </View>
            {idx < INTERVALS.length - 1 && <View style={styles.divider} />}
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
  content: { padding: 24, gap: 8 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 4,
    marginTop: 8,
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
