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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && passwordsMatch && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signUp(email, password, name);
      if (result.needsEmailConfirmation) {
        setMessage('Check your email to confirm your account, then return here to log in.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign up.');
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Your profile, sessions, tracker data, and chat history stay scoped to you.</Text>

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name (optional)"
            placeholderTextColor={Colors.textBrown}
            autoComplete="name"
          />
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
            autoComplete="new-password"
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor={Colors.textBrown}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />
        </View>

        {password.length > 0 && password.length < 8 && (
          <Text style={styles.hint}>Password must be at least 8 characters.</Text>
        )}
        {confirmPassword.length > 0 && !passwordsMatch && (
          <Text style={styles.error}>Passwords do not match.</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textCream} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Log in
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
    fontSize: 34,
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
  hint: {
    color: Colors.textBrown,
    fontSize: 13,
  },
  error: {
    color: Colors.trackerRed,
    fontSize: 14,
  },
  message: {
    color: Colors.navDark,
    fontSize: 14,
    lineHeight: 19,
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
