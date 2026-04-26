/**
 * Timer Alert — full-screen overlay shown when the relief timer fires.
 *
 * Auto-closes when the user shifts their weight forward for the required
 * duration. If the user manually dismisses, a persistent banner appears on
 * the home screen instead.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';

export default function TimerAlertScreen() {
  const router = useRouter();
  const {
    alertPhase,
    dismissAlert,
    shiftProgress,
    isShiftedForward,
    shiftDurationRequired,
  } = usePressureMonitor();

  // Auto-close when shift is complete (alertPhase goes back to 'idle')
  useEffect(() => {
    if (alertPhase === 'idle') {
      router.back();
    }
  }, [alertPhase]);

  function handleDismiss() {
    dismissAlert(); // switches to 'dismissed' → banner shows on home screen
    router.back();
  }

  const progressPercent = Math.round(shiftProgress * 100);

  return (
    <View style={styles.root}>
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Alert card */}
      <View style={styles.card}>
        {/* Exclamation badge */}
        <View style={styles.exclamation}>
          <Ionicons name="alert" size={20} color={Colors.white} />
        </View>

        <Text style={styles.instruction}>
          LEAN FORWARD{'\n'}FOR {shiftDurationRequired} SEC
        </Text>

        {/* Shift progress bar */}
        {isShiftedForward && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{progressPercent}%</Text>
          </View>
        )}
      </View>

      {/* Nudge indicator */}
      <View style={styles.nudgeContainer}>
        <View style={styles.nudgeCircle}>
          <Text style={styles.nudgeTextFaded}>nudge!</Text>
          <Text style={styles.nudgeText}>nudge!</Text>
          <Text style={styles.nudgeTextFaded}>nudge!</Text>
        </View>

        {/* Close/dismiss button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
        >
          <Ionicons name="close" size={16} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Helper text */}
      <Text style={styles.helperText}>
        {isShiftedForward
          ? 'Great — hold that position!'
          : 'Shift forward to relieve pressure'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(5,23,67,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,23,67,0.93)',
  },
  card: {
    backgroundColor: '#013d7c',
    borderRadius: 27,
    borderWidth: 4,
    borderColor: '#051743',
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: 249,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 10,
    position: 'relative',
  },
  exclamation: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 29,
    height: 29,
    borderRadius: 14.5,
    backgroundColor: Colors.trackerRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 25,
    fontWeight: '600',
    color: '#fff2e4',
    textAlign: 'center',
    lineHeight: 30,
  },
  progressContainer: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
    gap: 4,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textCream,
  },
  nudgeContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  nudgeCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nudgeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#351601',
  },
  nudgeTextFaded: {
    fontSize: 32,
    fontWeight: '600',
    color: 'rgba(53,22,1,0.35)',
  },
  closeBtn: {
    position: 'absolute',
    top: -10,
    right: -60,
    width: 29,
    height: 29,
    borderRadius: 14.5,
    backgroundColor: '#013d7c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    color: 'rgba(255,242,228,0.85)',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
});
