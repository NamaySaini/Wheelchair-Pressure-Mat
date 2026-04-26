/**
 * Settings — profile card + preferences list.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '@/components/screen-shell';
import { Colors } from '@/constants/theme';

const MENU_ITEMS = [
  { label: 'Reminder Preferences', route: '/settings/reminder-preferences' },
  { label: 'Personal Information', route: '/settings/personal-information' },
  { label: 'Data Sharing & Privacy', route: '/settings/data-privacy' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <>
      <StatusBar style="dark" />
      <ScreenShell
        title="Settings"
        subtitle="Manage your profile and preferences"
        scrollable
      >
        <View style={styles.inner}>
          {/* Section label */}
          <Text style={styles.sectionLabel}>Profile</Text>

          {/* Profile card */}
          <View style={styles.profileCard}>
            {/* Avatar placeholder */}
            <View style={styles.avatar} />

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Maya</Text>
              <Text style={styles.profileEmail}>maya@example.com</Text>
            </View>

            {/* Edit button */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/settings/edit-profile')}
            >
              <Ionicons name="pencil" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Preferences list */}
          <View style={styles.prefsCard}>
            {MENU_ITEMS.map((item, idx) => (
              <React.Fragment key={item.route}>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textBrown} />
                </TouchableOpacity>
                {idx < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 4,
  },
  profileCard: {
    backgroundColor: 'rgba(255,158,87,0.46)',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 57,
    height: 57,
    borderRadius: 28.5,
    backgroundColor: Colors.navDark,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textDark,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textBrown,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamCard,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefsCard: {
    backgroundColor: 'rgba(255,158,87,0.46)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(30,20,70,0.1)',
  },
});
