/**
 * Chat — Virtual Caregiver conversation UI.
 * Accessible as a stack screen from caregiver tab.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { backendClient } from '@/lib/backend';
import { usePressureMonitor } from '@/contexts/PressureMonitorContext';

type Message = {
  id: string;
  text: string;
  from: 'assistant' | 'user';
};

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  text: 'Hi! How can I help you today?',
  from: 'assistant',
};

const QUICK_REPLIES = [
  'Am I sitting symmetrically?',
  'Which side has more pressure?',
  'Is my compliance getting better?',
  'Was today a high risk day?',
];

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const { lastSessionSummary } = usePressureMonitor();
  const lastPushedSummaryIdRef = useRef<string | null>(null);

  // Load prior chat history on mount
  useEffect(() => {
    (async () => {
      try {
        const history = await backendClient.getChatHistory();
        if (history.length > 0) {
          setMessages(
            history.map((h, i) => ({
              id: h.id ?? `${i}`,
              text: h.content,
              from: h.role === 'user' ? 'user' : 'assistant',
            }))
          );
        }
      } catch (e: any) {
        console.warn('chat history load failed:', e.message);
      } finally {
        setIsLoadingHistory(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }
    })();
  }, []);

  // When a new session summary arrives, inject it as an assistant message.
  useEffect(() => {
    if (!lastSessionSummary) return;
    if (lastPushedSummaryIdRef.current === lastSessionSummary.session_id) return;
    lastPushedSummaryIdRef.current = lastSessionSummary.session_id;
    setMessages((prev) => [
      ...prev,
      {
        id: `summary-${lastSessionSummary.session_id}`,
        text: lastSessionSummary.summary_text,
        from: 'assistant',
      },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [lastSessionSummary]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      text: trimmed,
      from: 'user',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { reply } = await backendClient.sendChat(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, text: reply || '(empty reply)', from: 'assistant' },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, text: `Error: ${e.message}`, from: 'assistant' },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const showQuickReplies = !isLoadingHistory && messages.length === 1 && !isSending;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color="#351601" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Caregiver</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingHistory ? (
            <ActivityIndicator color={Colors.white} style={{ marginTop: 40 }} />
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.from === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.from === 'user' ? styles.userText : styles.assistantText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))
          )}

          {isSending && (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <ActivityIndicator color={Colors.white} size="small" />
            </View>
          )}

          {showQuickReplies && (
            <View style={styles.quickReplies}>
              {QUICK_REPLIES.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.qrBubble}
                  onPress={() => send(q)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.qrText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type or ask me something..."
            placeholderTextColor="rgba(53,22,1,0.45)"
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            editable={!isSending}
            multiline={false}
          />
          <TouchableOpacity
            onPress={() => (input.trim() ? send(input) : undefined)}
            style={styles.micBtn}
            disabled={isSending}
          >
            <Ionicons
              name={input.trim() ? 'send' : 'mic'}
              size={20}
              color="#351601"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#351601',
    textAlign: 'center',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  assistantBubble: {
    backgroundColor: '#013d7c',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#fff2e3',
    alignSelf: 'flex-end',
  },
  bubbleText: {
    fontSize: 14,
  },
  assistantText: {
    color: Colors.white,
  },
  userText: {
    color: '#351601',
  },
  quickReplies: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  qrBubble: {
    backgroundColor: '#fff2e3',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  qrText: {
    fontSize: 14,
    color: '#351601',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff2e3',
    borderRadius: 50,
    marginHorizontal: 17,
    marginBottom: Platform.OS === 'ios' ? 12 : 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#351601',
  },
  micBtn: {
    padding: 2,
  },
});
