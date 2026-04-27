/**
 * Home Screen — live pressure map with BLE connection and shift-reminder banner.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ScreenShell from '@/components/screen-shell';
import PressureMap from '@/components/pressure-map';
import { Colors, PressureColors } from '@/constants/theme';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';
import { PROFILE_GREETING_NAME } from '@/constants/profile';

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function HomeScreen() {
  const {
    pressureData,
    isConnected,
    isScanning,
    bleError,
    scan,
    disconnect,
    alertPhase,
    shiftProgress,
    isShiftedForward,
    activeSessionId,
    sessionStartedAt,
    isSessionStarting,
    isSessionEnding,
    startSession,
    endSession,
    msLeft,
  } = usePressureMonitor();

  const showShiftBanner = alertPhase === 'dismissed';

  // msLeft is referenced so this component re-renders while the timer ticks,
  // keeping the elapsed-time readout live.
  void msLeft;
  const elapsedMs = sessionStartedAt ? Date.now() - sessionStartedAt : 0;

  return (
    <>
      <StatusBar style="light" />
      <ScreenShell
        title={`Hello ${PROFILE_GREETING_NAME}!`}
        subtitle="Your Pressure Map, Live"
        showAvatar
        scrollable={false}
      >
        <View style={styles.inner}>
          {/* Persistent shift banner — shown when alert dismissed but shift not complete */}
          {showShiftBanner && (
            <View style={styles.shiftBanner}>
              <Text style={styles.shiftBannerTitle}>
                {isShiftedForward ? 'Hold that position...' : 'Please shift your weight forward'}
              </Text>
              <View style={styles.shiftProgressTrack}>
                <View
                  style={[styles.shiftProgressFill, { width: `${shiftProgress * 100}%` }]}
                />
              </View>
              <Text style={styles.shiftBannerSub}>
                {isShiftedForward
                  ? `${Math.round(shiftProgress * 100)}% — keep leaning forward`
                  : 'Lean forward to relieve pressure'}
              </Text>
            </View>
          )}

          {/* BLE connection controls */}
          {!isConnected && (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={scan}
              disabled={isScanning}
              activeOpacity={0.7}
            >
              {isScanning ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.connectBtnText}>Connect to PressureMat</Text>
              )}
            </TouchableOpacity>
          )}
          {isConnected && (
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={disconnect}
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectBtnText}>Connected — Tap to Disconnect</Text>
            </TouchableOpacity>
          )}
          {bleError && <Text style={styles.errorText}>{bleError}</Text>}

          {/* Session controls */}
          {!activeSessionId ? (
            <TouchableOpacity
              style={[
                styles.sessionBtn,
                (!isConnected || isSessionStarting) && styles.sessionBtnDisabled,
              ]}
              onPress={startSession}
              disabled={!isConnected || isSessionStarting}
              activeOpacity={0.8}
            >
              {isSessionStarting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.sessionBtnText}>Start Session</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sessionBtn, styles.sessionBtnEnd]}
              onPress={() => endSession('user')}
              disabled={isSessionEnding}
              activeOpacity={0.8}
            >
              {isSessionEnding ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.sessionBtnText}>
                  End Session · {formatElapsed(elapsedMs)}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Guidance banner (only when no shift reminder active) */}
          {!showShiftBanner && (
            <View style={styles.guidanceBanner}>
              <Text style={styles.guidanceText}>
                Shift slightly forward to offload the back area
              </Text>
            </View>
          )}

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

          {/* Map labels + grid */}
          <Text style={styles.mapTitle}>PRESSURE MAP</Text>
          <Text style={styles.mapSide}>FRONT</Text>

          <View style={styles.mapRow}>
            <Text style={styles.mapLR}>L</Text>
            <PressureMap size={230} data={pressureData ?? undefined} />
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
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  // ── Shift reminder banner ──
  shiftBanner: {
    backgroundColor: Colors.trackerRed,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 10,
  },
  shiftBannerTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  shiftProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  shiftProgressFill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 3,
  },
  shiftBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  // ── BLE controls ──
  connectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  connectBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  disconnectBtn: {
    backgroundColor: '#1B8C3A',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  disconnectBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.trackerRed,
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  // ── Session button ──
  sessionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 10,
    minWidth: 240,
    alignItems: 'center',
  },
  sessionBtnEnd: {
    backgroundColor: Colors.trackerRed,
  },
  sessionBtnDisabled: {
    opacity: 0.4,
  },
  sessionBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Guidance ──
  guidanceBanner: {
    backgroundColor: '#013d7c',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  guidanceText: {
    fontSize: 15,
    color: '#fff2e4',
    textAlign: 'center',
  },
  // ── Pressure bar & map ──
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
