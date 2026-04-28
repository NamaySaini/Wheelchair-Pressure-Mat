const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. Chat endpoints will fail until you add it to backend/.env');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing-openai-api-key' });

// Default to a low-latency, tool-capable GPT model; override with OPENAI_MODEL if needed.
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

module.exports = { openai, DEFAULT_MODEL };
