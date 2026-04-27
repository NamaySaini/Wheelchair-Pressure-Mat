const { Router } = require('express');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const { runChat } = require('../llm/runChat');

const router = Router();
router.use(requireAuth);

// POST /chat — send a user message, run tool loop, return reply.
router.post('/', async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const { reply, toolCalls, budgetExceeded } = await runChat({
      userId: req.user.id,
      userMessage: message,
    });
    res.json({ reply, toolCalls, budgetExceeded: !!budgetExceeded });
  } catch (e) {
    console.error('chat error:', e);
    res.status(500).json({ error: e.message || 'Chat failed' });
  }
});

// GET /chat/history — full chat history for the user.
router.get('/history', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', req.user.id)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

module.exports = router;
