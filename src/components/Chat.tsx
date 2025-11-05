'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/store/chatStore';
import { sendMessage } from '@/lib/openaiClient';

export default function Chat() {
  const { messages, isLoading, error, addMessage, setLoading, setError, clearChat } = useChatStore();
  const [input, setInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);
    setError(null);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call secure API route instead of client-side SDK
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await res.json();
      addMessage({ role: 'assistant', content: data.response });
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get response. Please try again.';
      setError(errorMessage);
      addMessage({
        role: 'assistant',
        content: `❌ Error: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark bg-neutral-900' : 'bg-neutral-100'}`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'} px-4 py-3 flex items-center justify-between`}>
        <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          AuraXPro AI Assistant
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                darkMode
                  ? 'hover:bg-neutral-800 text-neutral-300'
                  : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                darkMode ? 'bg-neutral-800' : 'bg-white'
              }`}>
                <svg className={`w-8 h-8 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                How can I help you today?
              </h2>
              <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Ask me anything about AuraXPro services, development, or general questions.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    darkMode ? 'bg-neutral-800' : 'bg-white'
                  }`}>
                    <svg className={`w-5 h-5 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user'
                    ? darkMode
                      ? 'bg-neutral-800 text-white'
                      : 'bg-white text-neutral-900'
                    : darkMode
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'bg-white text-neutral-900'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
                {message.role === 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    darkMode ? 'bg-neutral-800' : 'bg-white'
                  }`}>
                    <svg className={`w-5 h-5 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                darkMode ? 'bg-neutral-800' : 'bg-white'
              }`}>
                <svg className={`w-5 h-5 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                darkMode ? 'bg-neutral-800' : 'bg-white'
              }`}>
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-neutral-400' : 'bg-neutral-400'
                  }`} style={{ animationDelay: '0ms' }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-neutral-400' : 'bg-neutral-400'
                  }`} style={{ animationDelay: '150ms' }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-neutral-400' : 'bg-neutral-400'
                  }`} style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className={`rounded-lg px-4 py-3 ${
              darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className={`border-t px-4 py-4 ${darkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className={`flex items-end gap-3 rounded-2xl border shadow-sm transition-all ${
              darkMode
                ? 'bg-neutral-800 border-neutral-700 focus-within:border-neutral-600'
                : 'bg-white border-neutral-300 focus-within:border-neutral-400'
            }`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                disabled={isLoading}
                className={`flex-1 resize-none border-0 focus:ring-0 focus:outline-none px-4 py-3 bg-transparent ${
                  darkMode ? 'text-white placeholder-neutral-500' : 'text-neutral-900 placeholder-neutral-500'
                }`}
                style={{ maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`mb-2 mr-2 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
          <p className={`text-xs mt-2 text-center ${
            darkMode ? 'text-neutral-500' : 'text-neutral-500'
          }`}>
            AuraXPro AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}

