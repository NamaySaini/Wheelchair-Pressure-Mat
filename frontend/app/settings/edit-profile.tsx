/**
 * Settings — Edit Profile (name + avatar)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('Maya');
  const [email, setEmail] = useState('maya@example.com');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color="#351601" />
      </TouchableOpacity>

      {/* Avatar placeholder with edit hint */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar} />
        <TouchableOpacity style={styles.changePhotoBtn}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenTitle}>Edit Profile</Text>

      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            placeholderTextColor="#9ea8b5"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            placeholderTextColor="#9ea8b5"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.passwordRow}
        onPress={() => router.push('/settings/reset-password')}
      >
        <Text style={styles.rowLabel}>Reset Password</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6fafd' },
  content: { padding: 24, gap: 16, alignItems: 'center' },
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
    alignSelf: 'flex-start',
  },
  avatarSection: { alignItems: 'center', gap: 10 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.navDark,
  },
  changePhotoBtn: {},
  changePhotoText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: '#647b96', marginBottom: 4 },
  input: {
    fontSize: 16,
    color: '#351601',
    paddingVertical: 0,
    backgroundColor: '#f8fafc',
  },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,158,87,0.4)',
    borderWidth: 1.5,
    borderColor: '#351601',
    borderRadius: 8,
    width: '100%',
  },
  rowLabel: { fontSize: 15, color: '#351601', fontWeight: '500' },
  chevron: { fontSize: 20, color: '#351601' },
  saveBtn: {
    backgroundColor: '#351601',
    borderRadius: 5,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
});
