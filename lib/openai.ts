type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY env var.');
}

async function openaiFetch(path: string, body: unknown) {
  const res = await fetch(`${OPENAI_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) return [];

  const data = await openaiFetch('/embeddings', {
    model: EMBED_MODEL,
    input: texts,
  });

  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

export async function chatComplete(messages: ChatMessage[]) {
  const data = await openaiFetch('/chat/completions', {
    model: CHAT_MODEL,
    messages,
    temperature: 0.2,
  });

  return data.choices?.[0]?.message?.content?.trim() || '';
}
