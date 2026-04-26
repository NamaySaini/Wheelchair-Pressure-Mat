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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { backendClient } from '@/lib/backend';

const BMI_RANGES = ['Underweight', 'Normal', 'Overweight', 'Obese'];
const MOBILITY_LEVELS = ['Full', 'Partial', 'Minimal', 'None'];
const SENSATION_LEVELS = ['Full', 'Partial', 'Minimal', 'None'];
const WHEELCHAIR_TYPES = ['Manual', 'Power', 'Tilt-in-Space', 'Reclining'];

export default function PersonalInformationScreen() {
  const router = useRouter();
  const [age, setAge] = useState('');
  const [bmiRange, setBmiRange] = useState('');
  const [mobilityLevel, setMobilityLevel] = useState('');
  const [sensationLevel, setSensationLevel] = useState('');
  const [injuryHistory, setInjuryHistory] = useState('');
  const [wheelchairType, setWheelchairType] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [condition, setCondition] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await backendClient.getProfile();
        setAge(p.age?.toString() ?? '');
        setCondition(p.condition ?? '');
        setWheelchairType(p.wheelchair_type ?? '');
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
        age: age ? Number(age) : undefined,
        condition: condition || undefined,
        wheelchair_type: wheelchairType || undefined,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  function ChipGroup({
    options,
    value,
    onSelect,
  }: {
    options: string[];
    value: string;
    onSelect: (v: string) => void;
  }) {
    return (
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color="#351601" />
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Personal Information</Text>
      <Text style={styles.subtitle}>For personalized data metrics & AI feedback</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* GENERAL */}
          <Text style={styles.sectionLabel}>GENERAL</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                returnKeyType="done"
                placeholderTextColor="#9ea8b5"
                placeholder="Enter your age"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BMI Range</Text>
              <ChipGroup options={BMI_RANGES} value={bmiRange} onSelect={setBmiRange} />
            </View>
          </View>

          {/* MOBILITY & SENSATION */}
          <Text style={styles.sectionLabel}>MOBILITY & SENSATION</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobility Level</Text>
              <ChipGroup options={MOBILITY_LEVELS} value={mobilityLevel} onSelect={setMobilityLevel} />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sensation Level</Text>
              <ChipGroup options={SENSATION_LEVELS} value={sensationLevel} onSelect={setSensationLevel} />
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Injury History</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={injuryHistory}
                onChangeText={setInjuryHistory}
                returnKeyType="done"
                placeholderTextColor="#9ea8b5"
                placeholder="Describe any past pressure injuries..."
                multiline
              />
            </View>
          </View>

          {/* CHAIR / WHEELCHAIR USE */}
          <Text style={styles.sectionLabel}>CHAIR / WHEELCHAIR USE</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hours per Day: {hoursPerDay}h</Text>
              <View style={styles.sliderTrack}>
                {Array.from({ length: 25 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.sliderTick,
                      i <= hoursPerDay && styles.sliderTickActive,
                    ]}
                    onPress={() => setHoursPerDay(i)}
                  />
                ))}
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0h</Text>
                <Text style={styles.sliderLabel}>24h</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Wheelchair Type</Text>
              <View style={styles.chipRow}>
                {WHEELCHAIR_TYPES.map((opt) => {
                  const selected = wheelchairType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setWheelchairType(opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.white} />
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
  root: { flex: 1, backgroundColor: '#f6fafd' },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
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
    marginTop: -4,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#647b96',
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldGroup: { paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: '#647b96', marginBottom: 8 },
  input: {
    fontSize: 15,
    color: '#351601',
    paddingVertical: 0,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff2e4',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,158,87,0.2)',
  },
  chipText: {
    fontSize: 13,
    color: '#351601',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  sliderTick: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
  },
  sliderTickActive: {
    backgroundColor: Colors.primary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 11,
    color: '#647b96',
  },
  saveBtn: {
    backgroundColor: '#351601',
    borderRadius: 5,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
});
