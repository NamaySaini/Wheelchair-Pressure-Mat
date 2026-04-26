const Groq = require('groq-sdk');

if (!process.env.GROQ_API_KEY) {
  console.warn('GROQ_API_KEY is not set. Chat endpoints will fail until you add it to backend/.env');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Primary model for chat + tool use. Fallback if this gets shaky: 'openai/gpt-oss-120b'.
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

module.exports = { groq, DEFAULT_MODEL };
