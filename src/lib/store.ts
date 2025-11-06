// src/lib/store.ts
// ⚠️ DEPRECATED: This file is deprecated in favor of IndexedDB-based storage.
// See src/lib/conversation-db.ts for the new implementation.
// This file is kept for migration purposes only.

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string; ts?: number };

const KEY = 'auraxpro_ai_history_v1';

export function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(messages.slice(-200))); // keep last 200 msgs
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

