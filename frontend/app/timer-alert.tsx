/**
 * Timer Up! — full-screen alert overlay shown when the relief timer fires.
 * Displayed as a modal over the home screen.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function TimerAlertScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Alert card */}
      <View style={styles.card}>
        {/* Exclamation */}
        <View style={styles.exclamation}>
          <Ionicons name="alert" size={20} color={Colors.white} />
        </View>

        <Text style={styles.instruction}>LEAN FORWARD{'\n'}FOR 30 SEC</Text>
      </View>

      {/* Nudge indicator */}
      <View style={styles.nudgeContainer}>
        {/* Animated nudge text — static representation */}
        <View style={styles.nudgeCircle}>
          <Text style={styles.nudgeTextFaded}>nudge!</Text>
          <Text style={styles.nudgeText}>nudge!</Text>
          <Text style={styles.nudgeTextFaded}>nudge!</Text>
        </View>

        {/* Close/dismiss button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={16} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(118,64,25,0.9)',
  },
  card: {
    backgroundColor: Colors.alertBlue,
    borderRadius: 27,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: 249,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 25,
    fontWeight: '600',
    color: Colors.textCream,
    textAlign: 'center',
    lineHeight: 30,
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
    color: Colors.white,
  },
  nudgeTextFaded: {
    fontSize: 32,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  closeBtn: {
    position: 'absolute',
    top: -10,
    right: -60,
    width: 29,
    height: 29,
    borderRadius: 14.5,
    backgroundColor: Colors.alertBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
