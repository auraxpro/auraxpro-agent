// src/lib/conversation-db.ts
// IndexedDB wrapper for conversation persistence using idb package

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ChatMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

interface ConversationDBSchema extends DBSchema {
  messages: {
    key: number;
    value: ChatMessage;
    indexes: { 'by-conversation': string };
  };
}

const DB_NAME = 'auraxpro-ai-conversations';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let dbInstance: IDBPDatabase<ConversationDBSchema> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<ConversationDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser environment');
  }

  dbInstance = await openDB<ConversationDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create messages object store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Create index for querying by conversationId
        store.createIndex('by-conversation', 'conversationId');
      }
    },
  });

  return dbInstance;
}

/**
 * Save a message to IndexedDB
 */
export async function saveMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const messageWithId = {
    ...message,
    ts: message.ts || Date.now(),
  };
  
  const id = await store.add(messageWithId as ChatMessage);
  await tx.done;
  
  return id as number;
}

/**
 * Load all messages for a specific conversation
 */
export async function loadConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.store.index('by-conversation');
  
  const messages = await index.getAll(conversationId);
  await tx.done;
  
  // Sort by timestamp to ensure chronological order
  return messages.sort((a, b) => a.ts - b.ts);
}

/**
 * Get the last N messages from a conversation (for API context)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const messages = await loadConversation(conversationId);
  // Return last N messages (most recent)
  return messages.slice(-limit);
}

/**
 * Clear all messages for a specific conversation
 */
export async function clearConversation(conversationId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('by-conversation');
  
  // Get all messages for this conversation
  const messages = await index.getAllKeys(conversationId);
  
  // Delete each message
  for (const key of messages) {
    await tx.store.delete(key);
  }
  
  await tx.done;
}

/**
 * List all unique conversation IDs
 */
export async function listConversations(): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store;
  
  const allMessages = await store.getAll();
  await tx.done;
  
  // Get unique conversation IDs
  const conversationIds = new Set<string>();
  for (const msg of allMessages) {
    conversationIds.add(msg.conversationId);
  }
  
  return Array.from(conversationIds);
}

/**
 * Get conversation metadata (last message timestamp, message count)
 */
export async function getConversationMetadata(conversationId: string): Promise<{
  messageCount: number;
  lastActivity: number;
  firstMessage?: string;
}> {
  const messages = await loadConversation(conversationId);
  
  if (messages.length === 0) {
    return {
      messageCount: 0,
      lastActivity: 0,
    };
  }
  
  const sortedMessages = messages.sort((a, b) => b.ts - a.ts);
  const lastMessage = sortedMessages[0];
  const firstUserMessage = messages.find(m => m.role === 'user');
  
  return {
    messageCount: messages.length,
    lastActivity: lastMessage.ts,
    firstMessage: firstUserMessage?.content.substring(0, 100),
  };
}

/**
 * Delete a specific conversation (all its messages)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await clearConversation(conversationId);
}

/**
 * Get all conversations with metadata
 */
export async function listConversationsWithMetadata(): Promise<Array<{
  conversationId: string;
  messageCount: number;
  lastActivity: number;
  firstMessage?: string;
}>> {
  const conversationIds = await listConversations();
  const conversations = await Promise.all(
    conversationIds.map(async (id) => {
      const metadata = await getConversationMetadata(id);
      return {
        conversationId: id,
        ...metadata,
      };
    })
  );
  
  // Sort by last activity (most recent first)
  return conversations.sort((a, b) => b.lastActivity - a.lastActivity);
}

/**
 * Migrate data from localStorage (if exists) - one-time migration helper
 */
export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const KEY = 'auraxpro_ai_history_v1';
  const stored = localStorage.getItem(KEY);
  
  if (!stored) return;
  
  try {
    const oldMessages: Array<{ role: string; content: string; ts?: number }> = JSON.parse(stored);
    
    if (!Array.isArray(oldMessages) || oldMessages.length === 0) return;
    
    // Use a default conversation ID for migrated messages
    const defaultConversationId = 'conversation-migrated';
    
    // Check if we've already migrated
    const existing = await loadConversation(defaultConversationId);
    if (existing.length > 0) {
      console.log('Migration already completed');
      return;
    }
    
    // Migrate messages
    for (const msg of oldMessages) {
      if (msg.role && msg.content) {
        await saveMessage({
          conversationId: defaultConversationId,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          ts: msg.ts || Date.now(),
        });
      }
    }
    
    console.log(`Migrated ${oldMessages.length} messages from localStorage`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

