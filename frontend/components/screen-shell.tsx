/**
 * ScreenShell
 *
 * The shared header + content-panel layout used by every tab screen.
 *
 *  ┌──────────────────────────────┐
 *  │  [orange header]             │
 *  │   avatar  Title              │
 *  │           Subtitle           │
 *  ╰──────────────────────────────╮  ← rounded top-right 64 px
 *  │  [cream content panel]       │
 *  │  ...children...              │
 *  └──────────────────────────────┘
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { PROFILE_PHOTO } from '@/constants/profile';

type Props = {
  title: string;
  subtitle: string;
  headerColor?: string;
  bgColor?: string;
  showAvatar?: boolean;
  /** Extra element placed in the header row (right side) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
};

export default function ScreenShell({
  title,
  subtitle,
  headerColor = Colors.primary,
  bgColor = Colors.cream,
  showAvatar = false,
  headerRight,
  children,
  contentStyle,
  scrollable = true,
}: Props) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.content, { backgroundColor: bgColor }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: headerColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerColor} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {showAvatar && <Image source={PROFILE_PHOTO} style={styles.avatar} />}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        {headerRight && <View style={styles.headerRightContainer}>{headerRight}</View>}
      </View>
      {/* Content panel */}
      {scrollable ? (
        <ScrollView
          style={[styles.scrollRoot, { backgroundColor: bgColor }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    paddingBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: 'rgba(255,242,228,0.35)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '600',
    color: Colors.textCream,
    lineHeight: 27,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.textCream,
    lineHeight: 21,
  },
  headerRightContainer: {},
  scrollRoot: {
    flex: 1,
    borderTopRightRadius: 64,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // space above tab bar
  },
  content: {
    flex: 1,
    borderTopRightRadius: 64,
    paddingBottom: 120,
  },
});
