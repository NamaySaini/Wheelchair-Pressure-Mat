/**
 * Settings — Data Sharing & Privacy
 */
import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

const TOGGLES = [
  {
    label: 'Share anonymised data for research',
    description: 'Help improve pressure injury prevention by contributing anonymised data.',
    key: 'research',
  },
  {
    label: 'Share data with healthcare providers',
    description: 'Allow your clinician to view your pressure history.',
    key: 'healthcare',
  },
  {
    label: 'Analytics & crash reporting',
    description: 'Help us improve the app by sharing usage data.',
    key: 'analytics',
  },
] as const;

export default function DataPrivacyScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    research: true,
    healthcare: false,
    analytics: true,
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Data Sharing & Privacy' }} />

      <View style={styles.card}>
        {TOGGLES.map((item, idx) => (
          <React.Fragment key={item.key}>
            <View style={styles.row}>
              <View style={styles.textCol}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.description}</Text>
              </View>
              <Switch
                value={toggles[item.key]}
                onValueChange={(v) => setToggles((t) => ({ ...t, [item.key]: v }))}
                trackColor={{ true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
            {idx < TOGGLES.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      <Text style={styles.notice}>
        Your data is stored securely and never sold to third parties. You can request
        deletion of your data at any time by contacting support.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 24, gap: 16 },
  card: {
    backgroundColor: Colors.creamCard,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  textCol: { flex: 1 },
  rowLabel: { fontSize: 15, color: Colors.textDark, fontWeight: '500' },
  rowDesc: { fontSize: 12, color: Colors.textBrown, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(30,20,70,0.1)' },
  notice: {
    fontSize: 13,
    color: Colors.textBrown,
    lineHeight: 20,
    textAlign: 'center',
  },
});
