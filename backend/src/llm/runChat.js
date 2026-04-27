const supabase = require('../supabase');
const { groq, DEFAULT_MODEL } = require('./groq');
const { SYSTEM_PROMPT } = require('./systemPrompt');
const { buildContext } = require('./contextBuilder');
const { TOOL_DEFS, executeToolCall } = require('./tools');

const HISTORY_LIMIT = 20;
const MAX_TOOL_CALLS = 5;

function isToolUseFailed(error) {
  return error?.status === 400 && error?.error?.error?.code === 'tool_use_failed';
}

async function createChatCompletion({ messages, allowTools = true }) {
  try {
    return await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      ...(allowTools
        ? {
            tools: TOOL_DEFS,
            tool_choice: 'auto',
          }
        : {}),
    });
  } catch (error) {
    if (!allowTools || !isToolUseFailed(error)) throw error;

    // Some Groq model responses emit pseudo-function markup instead of valid tool calls.
    // Fall back to a plain-text answer grounded in the existing context/history.
    return groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        ...messages,
        {
          role: 'system',
          content:
            'Your previous attempt used invalid tool-call markup. Do not call tools. Answer directly from the available context and chat history in plain text.',
        },
      ],
    });
  }
}

async function loadRecentChat(userId, limit = HISTORY_LIMIT) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).reverse();
}

async function persistTurn(userId, userMessage, assistantMessage) {
  await supabase.from('chat_messages').insert([
    { user_id: userId, role: 'user', content: userMessage },
    { user_id: userId, role: 'assistant', content: assistantMessage },
  ]);
}

function safeParseArgs(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function runChat({ userId, userMessage }) {
  const [history, context] = await Promise.all([
    loadRecentChat(userId),
    buildContext(userId),
  ]);

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${context}` },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const toolCallsMade = [];

  for (let step = 0; step < MAX_TOOL_CALLS; step++) {
    const resp = await createChatCompletion({ messages, allowTools: true });

    const msg = resp.choices?.[0]?.message;
    if (!msg) throw new Error('No message returned from Groq');

    messages.push(msg);

    if (!msg.tool_calls?.length) {
      const reply = msg.content || '';
      await persistTurn(userId, userMessage, reply);
      return { reply, toolCalls: toolCallsMade };
    }

    for (const call of msg.tool_calls) {
      const name = call.function?.name;
      const args = safeParseArgs(call.function?.arguments);
      toolCallsMade.push({ name, args });
      const result = await executeToolCall(name, args, userId);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Budget exhausted — ask for a final answer without tools.
  const final = await createChatCompletion({
    messages: [
      ...messages,
      {
        role: 'system',
        content:
          'Tool-call budget reached. Answer the user directly using the information gathered so far — do not request more tools.',
      },
    ],
    allowTools: false,
  });
  const reply = final.choices?.[0]?.message?.content || '';
  await persistTurn(userId, userMessage, reply);
  return { reply, toolCalls: toolCallsMade, budgetExceeded: true };
}

module.exports = { runChat, MAX_TOOL_CALLS };
