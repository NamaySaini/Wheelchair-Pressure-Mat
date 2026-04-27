/**
 * Custom Tab Bar — dark-blue pill with centre timer button.
 * Timer state comes from PressureMonitorContext.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';

function formatTimer(msLeft: number): string {
  if (msLeft <= 0) return '0.00';
  if (msLeft >= 60_000) {
    const totalSec = Math.ceil(msLeft / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return (msLeft / 1000).toFixed(2);
}

const TAB_ICONS: Record<string, (focused: boolean) => React.ReactNode> = {
  index: (f) => (
    <Ionicons name={f ? 'home' : 'home-outline'} size={22} color={f ? Colors.white : 'rgba(255,255,255,0.55)'} />
  ),
  caregiver: (f) => (
    <MaterialCommunityIcons
      name={f ? 'comment-text' : 'comment-text-outline'}
      size={22}
      color={f ? Colors.white : 'rgba(255,255,255,0.55)'}
    />
  ),
  tracker: (f) => (
    <Ionicons name="bar-chart" size={22} color={f ? Colors.white : 'rgba(255,255,255,0.55)'} />
  ),
  settings: (f) => (
    <Ionicons name={f ? 'settings' : 'settings-outline'} size={22} color={f ? Colors.white : 'rgba(255,255,255,0.55)'} />
  ),
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const left = routes.slice(0, 2);
  const right = routes.slice(2, 4);

  const { msLeft, alertPhase } = usePressureMonitor();
  const hasNavigated = useRef(false);

  const timerExpired = msLeft <= 0;
  const timerLabel = formatTimer(msLeft);

  // Auto-navigate to timer-alert when alert fires
  useEffect(() => {
    if (alertPhase === 'alerting' && !hasNavigated.current) {
      hasNavigated.current = true;
      navigation.navigate('timer-alert');
    }
    if (alertPhase === 'idle') {
      hasNavigated.current = false;
    }
  }, [alertPhase, navigation]);

  function handlePress(route: typeof routes[0], isFocused: boolean) {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 4 }]}>
      {/* Centre timer button */}
      <TouchableOpacity
        style={[styles.timerButton, timerExpired && styles.timerButtonExpired]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('timer-alert')}
      >
        <Text style={[styles.timerValue, msLeft < 60_000 && styles.timerValueSmall]}>
          {timerLabel}
        </Text>
      </TouchableOpacity>

      {/* Pill */}
      <View style={styles.pill}>
        <View style={styles.side}>
          {left.map((route) => {
            const focused = state.index === routes.indexOf(route);
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => handlePress(route, focused)}
                activeOpacity={0.7}
              >
                {TAB_ICONS[route.name]?.(focused) ?? null}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.centre} />
        <View style={styles.side}>
          {right.map((route) => {
            const focused = state.index === routes.indexOf(route);
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => handlePress(route, focused)}
                activeOpacity={0.7}
              >
                {TAB_ICONS[route.name]?.(focused) ?? null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const PILL_HEIGHT = 64;
const TIMER_SIZE = 68;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navDark,
    borderRadius: PILL_HEIGHT / 2,
    height: PILL_HEIGHT,
    marginHorizontal: 24,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 393 - 48,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  centre: {
    width: TIMER_SIZE + 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_HEIGHT,
  },
  timerButton: {
    position: 'absolute',
    top: -TIMER_SIZE / 2 + PILL_HEIGHT / 2 - 14,
    zIndex: 10,
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    borderRadius: TIMER_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  timerButtonExpired: {
    backgroundColor: Colors.trackerRed,
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.white,
    lineHeight: 26,
  },
  timerValueSmall: {
    fontSize: 18,
    lineHeight: 22,
  },
});
