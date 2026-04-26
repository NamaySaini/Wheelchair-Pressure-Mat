/**
 * Settings — Personal Information
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { backendClient } from '@/lib/backend';

export default function PersonalInformationScreen() {
  const [form, setForm] = useState({
    age: '',
    weight: '',
    height: '',
    condition: '',
    wheelchair_type: '',
    cushion_type: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await backendClient.getProfile();
        setForm({
          age: p.age?.toString() ?? '',
          weight: p.weight_kg?.toString() ?? '',
          height: p.height_cm?.toString() ?? '',
          condition: p.condition ?? '',
          wheelchair_type: p.wheelchair_type ?? '',
          cushion_type: p.cushion_type ?? '',
        });
      } catch (e: any) {
        console.warn('getProfile failed:', e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      await backendClient.upsertProfile({
        age: form.age ? Number(form.age) : undefined,
        weight_kg: form.weight ? Number(form.weight) : undefined,
        height_cm: form.height ? Number(form.height) : undefined,
        condition: form.condition || undefined,
        wheelchair_type: form.wheelchair_type || undefined,
        cushion_type: form.cushion_type || undefined,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  function field(
    label: string,
    key: keyof typeof form,
    keyboardType: 'default' | 'numeric' = 'default'
  ) {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          value={form[key]}
          onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
          keyboardType={keyboardType}
          returnKeyType="done"
          placeholderTextColor={Colors.textBrown}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Personal Information' }} />

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.card}>
            {field('Age', 'age', 'numeric')}
            <View style={styles.divider} />
            {field('Weight (kg)', 'weight', 'numeric')}
            <View style={styles.divider} />
            {field('Height (cm)', 'height', 'numeric')}
            <View style={styles.divider} />
            {field('Primary Condition', 'condition')}
            <View style={styles.divider} />
            {field('Wheelchair Type', 'wheelchair_type')}
            <View style={styles.divider} />
            {field('Cushion Type', 'cushion_type')}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.textCream} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: 24, gap: 16 },
  card: {
    backgroundColor: Colors.creamCard,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: Colors.textBrown, marginBottom: 4 },
  input: {
    fontSize: 16,
    color: Colors.textDark,
    paddingVertical: 0,
  },
  divider: { height: 1, backgroundColor: 'rgba(30,20,70,0.1)' },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 38,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textCream,
  },
});
