/**
 * Settings — Reset Password
 */
import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSave = current.length > 0 && next.length >= 8 && next === confirm && !isSaving;

  async function handleSave() {
    if (!user?.email || !canSave) return;
    setIsSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (signInError) throw signInError;

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      Alert.alert('Saved', 'Password updated.');
      router.back();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unable to update password.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Reset Password' }} />

      <View style={styles.card}>
        {[
          { label: 'Current Password', value: current, set: setCurrent },
          { label: 'New Password', value: next, set: setNext },
          { label: 'Confirm New Password', value: confirm, set: setConfirm },
        ].map((field, idx, arr) => (
          <React.Fragment key={field.label}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.set}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
              />
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
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>{isSaving ? 'Updating...' : 'Update Password'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 24, gap: 12 },
  card: {
    backgroundColor: Colors.creamCard,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: Colors.textBrown, marginBottom: 4 },
  input: { fontSize: 16, color: Colors.textDark, paddingVertical: 0 },
  divider: { height: 1, backgroundColor: 'rgba(30,20,70,0.1)' },
  hint: { fontSize: 13, color: Colors.textBrown },
  error: { fontSize: 13, color: Colors.trackerRed },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 38,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textCream,
  },
});
