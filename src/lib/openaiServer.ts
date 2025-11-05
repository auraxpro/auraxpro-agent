// Secure server-side OpenAI client
// This file is only used on the server side

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in server environment');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = 'You are AuraXPro AI Assistant. Be concise, helpful, and friendly.';

export async function sendMessage(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages as any,
    stream: false,
  });

  return response.choices[0]?.message?.content || 'No response received';
}

