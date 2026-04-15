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
import { Colors } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane.doe@example.com');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />

      {/* Avatar placeholder with edit hint */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar} />
        <TouchableOpacity style={styles.changePhotoBtn}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
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
          />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.passwordRow}
          onPress={() => router.push('/settings/reset-password')}
        >
          <Text style={styles.rowLabel}>Reset Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

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
  root: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 24, gap: 20, alignItems: 'center' },
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
    backgroundColor: Colors.creamCard,
    borderRadius: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: Colors.textBrown, marginBottom: 4 },
  input: { fontSize: 16, color: Colors.textDark, paddingVertical: 0 },
  divider: { height: 1, backgroundColor: 'rgba(30,20,70,0.1)' },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, color: Colors.textDark },
  chevron: { fontSize: 20, color: Colors.textBrown },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 38,
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textCream,
  },
});
