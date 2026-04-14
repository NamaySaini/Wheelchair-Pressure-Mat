import { useMemo, useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { backendClient } from '@/lib/backend';

export default function HomeScreen() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Tap the button to test backend connectivity.');

  const apiUrl = useMemo(() => backendClient.getBaseUrl(), []);

  async function checkBackend() {
    setStatus('checking');
    setMessage('Checking backend health endpoint...');

    try {
      const result = await backendClient.health();
      setStatus('ok');
      setMessage(`Connected. Backend status: ${result.status}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title">Frontend ↔ Backend</ThemedText>
        <ThemedText style={styles.subtitle}>Current API base URL:</ThemedText>
        <ThemedText type="defaultSemiBold">{apiUrl || 'Not set (EXPO_PUBLIC_API_URL missing)'}</ThemedText>
      </ThemedView>

      <Pressable
        style={[styles.button, status === 'checking' ? styles.buttonDisabled : null]}
        onPress={checkBackend}
        disabled={status === 'checking'}>
        <ThemedText type="defaultSemiBold">
          {status === 'checking' ? 'Checking...' : 'Check /health'}
        </ThemedText>
      </Pressable>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Result</ThemedText>
        <ThemedText style={status === 'error' ? styles.errorText : undefined}>{message}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#8f8f8f',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  button: {
    borderWidth: 1,
    borderColor: '#8f8f8f',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#B42318',
  },
});
