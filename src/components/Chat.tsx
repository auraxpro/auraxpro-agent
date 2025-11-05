'use client';

import { useEffect, useRef, useState } from 'react';
import { loadKB, kbToContext } from '@/lib/kb';
import { loadHistory, saveHistory, clearHistory, ChatMessage } from '@/lib/store';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, MailIcon } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  stack: string[];
  experience: string;
  challenges: string[];
  developmentFlow: string[];
  budget: string;
  timeline: string;
  status: string;
}

export default function Chat() {
  const [kbCtx, setKbCtx] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
    (async () => {
      const kb = await loadKB();
      setKbCtx(kbToContext(kb));
      
      // Load projects
      try {
        const res = await fetch('/projects.json');
        const data = await res.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    })();
  }, []);

  useEffect(() => {
    saveHistory(messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const startNewChat = () => {
    clearHistory();
    setMessages([]);
    setSelectedProject(null);
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    // Clear messages when switching projects to start fresh context
    setMessages([]);
    clearHistory();
  };

  const getProjectContext = (project: Project | null): string => {
    if (!project) return '';
    
    return `
=== Project Context: ${project.name} ===
Description: ${project.description}
Stack: ${project.stack.join(', ')}
Experience: ${project.experience}
Challenges: ${project.challenges.join('; ')}
Development Flow: ${project.developmentFlow.join(' → ')}
Budget: ${project.budget}
Timeline: ${project.timeline}
Status: ${project.status}
==========================
`;
  };

  async function ask() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const next = [...messages, { role: 'user', content: userMessage, ts: Date.now() } as ChatMessage];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const projectContext = getProjectContext(selectedProject);
      const fullContext = kbCtx + (projectContext ? '\n\n' + projectContext : '');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          kbContext: fullContext
        })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to get response';
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = await res.text().catch(() => errorMessage);
        }
        throw new Error(errorMessage);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        acc += decoder.decode(value, { stream: true });

        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }
    } catch (error: any) {
      let errorMessage = 'Something went wrong. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      }

      setMessages(m => [...m, {
        role: 'assistant',
        content: `❌ **Error:** ${errorMessage}\n\nIf this is a quota or billing issue, please check your OpenAI account settings.`
      }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const handleFAQClick = async (question: string) => {
    if (loading) return;
    
    const userMessage = question.trim();
    const next = [...messages, { role: 'user' as const, content: userMessage, ts: Date.now() } as ChatMessage];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const projectContext = getProjectContext(selectedProject);
      const fullContext = kbCtx + (projectContext ? '\n\n' + projectContext : '');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          kbContext: fullContext
        })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to get response';
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = await res.text().catch(() => errorMessage);
        }
        throw new Error(errorMessage);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      setMessages(m => [...m, { role: 'assistant' as const, content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant' as const, content: acc };
          return copy;
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Something went wrong. Please try again.';
      setMessages(m => [...m, {
        role: 'assistant' as const,
        content: `❌ **Error:** ${errorMessage}\n\nIf this is a quota or billing issue, please check your OpenAI account settings.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const faqQuestions = [
    'What services does AuraXPro offer?',
    'What is your tech stack?',
    'Do you handle CMS?',
    'Do you do 3D product configurators?',
    'How long does an MVP typically take?',
    'What are your development strengths?'
  ];

  return (
    <div className="flex h-screen bg-[#171717] text-white overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="relative w-64 bg-[#212121] border-r border-gray-700 flex flex-col flex-shrink-0">
          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-700">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-transparent hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats..."
                className="w-full px-3 py-2 pl-9 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-600"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Recent Projects */}
            {projects.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase">Recent Projects</h3>
                </div>
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-sm ${
                        selectedProject?.id === project.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{project.name}</span>
                      {selectedProject?.id === project.id && (
                        <svg className="w-3 h-3 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Chats */}
            {messages.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2">Chats</h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">Current conversation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 p-1 bg-gray-800 rounded-full border border-gray-700 transition-colors cursor-pointer z-10"
          >
            {sidebarOpen ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
          </button>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#171717]">
        {/* Top Bar */}
        <header className="border-b border-gray-700 bg-[#171717] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Image src="/brand.png" alt="Logo" width={128} height={51} />
              {selectedProject && (
                <div className="ml-2 px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">
                  {selectedProject.name}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 h-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="mb-8 flex flex-col items-center justify-center">
                  <Image src="/brand.png" alt="Logo" width={128} height={51} />
                  <h2 className="text-4xl font-semibold mb-4 text-white mt-6">What are you working on?</h2>
                  <p className="text-gray-400 mb-8">Ask anything about your project</p>
                  
                  {/* Frequently Asked Questions */}
                  <div className="w-full max-w-2xl mt-8">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Suggested Questions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {faqQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleFAQClick(question)}
                          disabled={loading}
                          className="text-left px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-sm text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    )}
                    <div className={`flex-1 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-800 text-gray-100'
                        }`}>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    </div>
                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="bg-gray-800 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 bg-[#171717] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-gray-800 rounded-2xl border border-gray-700 hover:border-gray-600 transition-colors focus-within:border-gray-600">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none border-0 focus:ring-0 focus:outline-none px-4 py-3 text-white placeholder-gray-500 bg-transparent"
                style={{ maxHeight: '200px' }}
              />
              <div className="flex items-center gap-2 mb-2 mr-2">
                
                <button
                  onClick={ask}
                  disabled={loading || !input.trim()}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AuraXPro AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
