/**
 * Home Screen — live pressure map with soft directional guidance.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ScreenShell from '@/components/screen-shell';
import PressureMap from '@/components/pressure-map';
import { Colors } from '@/constants/theme';

const GUIDANCE = 'Shift slightly forward to offload the back area';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="light" />
      <ScreenShell
        title="Hello Jane!"
        subtitle="Your Pressure Map, Live"
        showAvatar
        scrollable={false}
      >
        <View style={styles.inner}>
          {/* Soft guidance banner */}
          <View style={styles.guidanceBanner}>
            <Text style={styles.guidanceText}>{GUIDANCE}</Text>
          </View>

          {/* Pressure colour key */}
          <View style={styles.keyRow}>
            <Text style={styles.keyLabel}>LOW</Text>
            <View style={styles.pressureBar} />
            <Text style={styles.keyLabelRight}>HIGH</Text>
          </View>

          {/* Map labels + grid */}
          <Text style={styles.mapTitle}>PRESSURE MAP</Text>
          <Text style={styles.mapSide}>FRONT</Text>

          <View style={styles.mapRow}>
            <Text style={styles.mapLR}>L</Text>
            <PressureMap size={230} />
            <Text style={styles.mapLR}>R</Text>
          </View>

          <Text style={styles.mapSide}>BACK</Text>
        </View>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  guidanceBanner: {
    backgroundColor: 'rgba(9,146,231,0.22)',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 15,
    color: Colors.textDark,
    textAlign: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
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
    // Gradient approximated as solid midpoint orange (LinearGradient would need expo-linear-gradient)
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
});
