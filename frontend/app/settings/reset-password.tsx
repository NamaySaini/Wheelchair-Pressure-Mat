/**
 * Settings — Reset Password
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const canSave = current.length > 0 && next.length >= 8 && next === confirm;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color="#351601" />
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your current password, then choose a new one
      </Text>

      <View style={styles.card}>
        {[
          { label: 'Current Password', value: current, set: setCurrent, showEye: false },
          { label: 'New Password', value: next, set: setNext, showEye: false },
          { label: 'Confirm New Password', value: confirm, set: setConfirm, showEye: true },
        ].map((field, idx, arr) => (
          <React.Fragment key={field.label}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.set}
                  secureTextEntry={field.showEye ? !showConfirm : true}
                  autoCapitalize="none"
                  returnKeyType="done"
                  placeholderTextColor="#9ea8b5"
                />
                {field.showEye && (
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                    <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {idx < arr.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {next.length > 0 && next.length < 8 && (
        <Text style={styles.hint}>Password must be at least 8 characters.</Text>
      )}
      {next.length >= 8 && confirm.length > 0 && next !== confirm && (
        <Text style={styles.error}>Passwords do not match.</Text>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        disabled={!canSave}
        onPress={() => router.back()}
      >
        <Text style={styles.saveBtnText}>Update Password</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6fafd' },
  content: { padding: 24, gap: 12 },
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
  },
  subtitle: {
    fontSize: 13,
    color: '#647b96',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: '#647b96', marginBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#351601',
    paddingVertical: 0,
    backgroundColor: '#f8fafc',
  },
  eyeIcon: { fontSize: 16, paddingLeft: 8 },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  hint: { fontSize: 13, color: '#647b96' },
  error: { fontSize: 13, color: Colors.trackerRed },
  saveBtn: {
    backgroundColor: '#351601',
    borderRadius: 5,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {},
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,158,87,0.4)',
    borderRadius: 5,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#351601',
  },
  cancelBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#351601',
  },
});
