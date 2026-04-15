/**
 * Custom Tab Bar matching the Figma design:
 *
 *  ┌─────────────────────────────────────────────┐
 *  │  🏠   💬      [  ⏱ 0  ]       📊   ⚙️    │
 *  └─────────────────────────────────────────────┘
 *
 * The centre timer button protrudes above the dark-blue pill.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

// Minutes left on the relief timer (0 = past due)
const TIMER_VALUE = 0;

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
  const routes = state.routes; // index, caregiver, tracker, settings

  const left = routes.slice(0, 2);   // home, caregiver
  const right = routes.slice(2, 4);  // tracker, settings

  function handlePress(route: typeof routes[0], isFocused: boolean) {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 4 }]}>
      {/* Pill */}
      <View style={styles.pill}>
        {/* Left tabs */}
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

        {/* Centre spacer (the timer button lives outside/above) */}
        <View style={styles.centre} />

        {/* Right tabs */}
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

      {/* Centre timer button – floats above the pill */}
      <TouchableOpacity
        style={styles.timerButton}
        activeOpacity={0.85}
        onPress={() => {
          // Navigate to timer-alert modal when timer fires
          // For now just a tap target
        }}
      >
        {/* Dial ring (tick marks rendered with rotated lines) */}
        <View style={styles.dialRing}>
          {Array.from({ length: 32 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                { transform: [{ rotate: `${i * (360 / 32)}deg` }] },
              ]}
            />
          ))}
        </View>
        {/* Timer value */}
        <Text style={styles.timerValue}>{TIMER_VALUE}</Text>
      </TouchableOpacity>
    </View>
  );
}

const PILL_HEIGHT = 64;
const TIMER_SIZE = 68;
const TIMER_OVERLAP = 28; // how much button protrudes above pill

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // No background — the pill handles it
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
    top: -(TIMER_SIZE / 2 + TIMER_OVERLAP / 2),
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
  dialRing: {
    position: 'absolute',
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
  },
  tick: {
    position: 'absolute',
    top: 2,
    width: 1.5,
    height: 6,
    backgroundColor: 'rgba(255,242,228,0.6)',
    borderRadius: 1,
    transformOrigin: `0.75px ${TIMER_SIZE / 2 - 2}px`,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '400',
    color: Colors.white,
    lineHeight: 32,
  },
});
