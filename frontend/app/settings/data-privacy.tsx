/**
 * Settings — Data Sharing & Privacy
 */
import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const router = useRouter();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    research: true,
    healthcare: false,
    analytics: true,
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color="#351601" />
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Data Sharing & Privacy</Text>

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
                trackColor={{ true: '#351601', false: '#e2e8f0' }}
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
  root: { flex: 1, backgroundColor: '#f6fafd' },
  content: { padding: 24, gap: 16 },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,158,87,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#351601',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  textCol: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#351601', fontWeight: '500' },
  rowDesc: { fontSize: 12, color: '#647b96', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  notice: {
    fontSize: 13,
    color: '#647b96',
    lineHeight: 20,
    textAlign: 'center',
  },
});
