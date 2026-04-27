/**
 * Virtual Caregiver landing — entry point with two actions:
 *   1. Ask Assistant  → chat.tsx
 *   2. Question History (placeholder)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ScreenShell from '@/components/screen-shell';
import { Colors } from '@/constants/theme';

export default function CaregiverScreen() {
  const router = useRouter();

  return (
    <>
      <StatusBar style="light" />
      <ScreenShell
        title="Virtual Caregiver"
        subtitle="Ask About Your Pressure Data"
        scrollable={false}
      >
        <View style={styles.inner}>
          {/* Spacer pushing buttons to lower third */}
          <View style={{ flex: 1 }} />

          {/* Ask Assistant button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/chat')}
          >
            <Text style={styles.primaryBtnText}>Ask Assistant</Text>
          </TouchableOpacity>

          {/* Question History button */}
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.75}>
            <Text style={styles.secondaryBtnText}>Question History</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingHorizontal: 25,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#013d7c',
    borderRadius: 38,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f6fafd',
  },
  secondaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 38,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#351601',
  },
});
