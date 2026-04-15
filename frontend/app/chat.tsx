/**
 * Chat — Virtual Caregiver conversation UI.
 * Accessible as a stack screen from caregiver tab.
 */
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';

type Message = {
  id: string;
  text: string;
  from: 'assistant' | 'user';
};

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'Hi! How can I help you today?', from: 'assistant' },
];

const QUICK_REPLIES = [
  'What does this alert mean?',
  'How do I relieve pressure now?',
  'How long should I hold it?',
  'Did I shift my weight enough?',
];

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      from: 'user',
    };
    // Placeholder assistant reply
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: "I'm analysing your pressure data — response coming soon.",
      from: 'assistant',
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Caregiver</Text>
        {/* Spacer */}
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
          {messages.map((msg) => (
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
          ))}

          {/* Quick replies (shown when only the initial message is visible) */}
          {messages.length === 1 && (
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
            placeholderTextColor={Colors.chatBubbleDark}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            multiline={false}
          />
          <TouchableOpacity onPress={() => send(input)} style={styles.micBtn}>
            <Ionicons name="mic" size={20} color={Colors.chatBubbleDark} />
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
    fontWeight: '400',
    color: Colors.textCream,
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
    backgroundColor: Colors.chatBubbleDark,
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: Colors.chatBubbleLight,
    alignSelf: 'flex-end',
  },
  bubbleText: {
    fontSize: 14,
  },
  assistantText: {
    color: Colors.white,
  },
  userText: {
    color: Colors.white,
  },
  quickReplies: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  qrBubble: {
    backgroundColor: Colors.chatBubbleLight,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  qrText: {
    fontSize: 14,
    color: Colors.white,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textCream,
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
    color: Colors.chatBubbleDark,
  },
  micBtn: {
    padding: 2,
  },
});
