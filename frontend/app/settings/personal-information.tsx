/**
 * Settings — Personal Information
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
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function PersonalInformationScreen() {
  const [form, setForm] = useState({
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '01/01/1980',
    weight: '65',
    height: '165',
    condition: 'Spinal cord injury',
  });

  function field(label: string, key: keyof typeof form, keyboardType: 'default' | 'numeric' = 'default') {
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

      <View style={styles.card}>
        {field('First Name', 'firstName')}
        <View style={styles.divider} />
        {field('Last Name', 'lastName')}
        <View style={styles.divider} />
        {field('Date of Birth', 'dob')}
        <View style={styles.divider} />
        {field('Weight (kg)', 'weight', 'numeric')}
        <View style={styles.divider} />
        {field('Height (cm)', 'height', 'numeric')}
        <View style={styles.divider} />
        {field('Primary Condition', 'condition')}
      </View>

      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>
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
