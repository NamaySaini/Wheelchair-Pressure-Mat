import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Pressure Mat</Text>
        <Text style={styles.title}>Log in</Text>
        <Text style={styles.subtitle}>Use your Supabase account to sync your sessions and tracker history.</Text>

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={Colors.textBrown}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={Colors.textBrown}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textCream} />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Need an account?{' '}
          <Link href="/signup" style={styles.link}>
            Sign up
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.creamCard,
    borderRadius: 22,
    padding: 24,
    gap: 16,
    shadowColor: Colors.creamShadow,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: Colors.textDark,
    fontSize: 36,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textBrown,
    fontSize: 15,
    lineHeight: 21,
  },
  fields: {
    gap: 12,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    color: Colors.textDark,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  error: {
    color: Colors.trackerRed,
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 38,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.textCream,
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    color: Colors.textBrown,
    textAlign: 'center',
    fontSize: 15,
  },
  link: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
