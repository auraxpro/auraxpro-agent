'use client';

import { useEffect, useRef, useState } from 'react';
import { loadKB, kbToContext } from '@/lib/kb';
import {
  ChatMessage,
  saveMessage,
  loadConversation,
  clearConversation,
  listConversationsWithMetadata,
  getRecentMessages,
  migrateFromLocalStorage,
} from '@/lib/conversation-db';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Project {
  project_id: string;
  name: string;
  slug: string;
  category: string;
  client_name: string;
  status: string;
  start_date: string;
  budget: string;
  team_members: string[];
  frontend_stack: string[];
  backend_stack: string[];
  integrations: string[];
  deployment: string;
  goal_summary: string;
  core_features: string[];
  target_users: string;
  unique_value: string;
  challenges: string[];
  solutions: string[];
  experience?: string;
  lessons_learned: string;
  communication_tools: string[];
  update_frequency: string;
  conversation_id: string;
  tags: string[];
  ai_context_note: string;
}

interface ConversationListItem {
  conversationId: string;
  messageCount: number;
  lastActivity: number;
  firstMessage?: string;
}

export default function Chat() {
  const [kbCtx, setKbCtx] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize: Load KB, projects, and run migration
  useEffect(() => {
    (async () => {
      // Run migration from localStorage if needed
      await migrateFromLocalStorage();
      
      // Load knowledge base
      const kb = await loadKB();
      setKbCtx(kbToContext(kb));
      
      // Load experience/projects
      try {
        const res = await fetch('/experience.json');
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load experience data:', error);
        // Fallback to projects.json if experience.json fails
        try {
          const res = await fetch('/projects.json');
          const data = await res.json();
          // Transform old format to new format if needed
          setProjects(data.projects || []);
        } catch (fallbackError) {
          console.error('Failed to load projects:', fallbackError);
        }
      }
      
      // Load conversations list
      await refreshConversations();
    })();
  }, []);

  // Load messages when conversationId changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshConversations = async () => {
    const convos = await listConversationsWithMetadata();
    setConversations(convos);
  };

  const getConversationId = (): string => {
    if (selectedProject) {
      // Use conversation_id from experience.json if available, otherwise generate from project_id
      return selectedProject.conversation_id || `project-${selectedProject.project_id}`;
    }
    if (currentConversationId) {
      return currentConversationId;
    }
    return `conversation-${Date.now()}`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const startNewChat = async () => {
    setMessages([]);
    setSelectedProject(null);
    setCurrentConversationId(`conversation-${Date.now()}`);
    await refreshConversations();
  };

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project);
    // Use conversation_id from experience.json if available
    const conversationId = project.conversation_id || `project-${project.project_id}`;
    setCurrentConversationId(conversationId);
    // Load existing messages for this project
    const existingMessages = await loadConversation(conversationId);
    setMessages(existingMessages);
    await refreshConversations();
    
    // If this is a new conversation (no existing messages), auto-start with initial message
    if (existingMessages.length === 0) {
      const initialMessage = "Could you explain about this project in more detail, As I am a new client, I want to know about this project.";
      
      // Create and save user message
      const userMsg: ChatMessage = {
        conversationId: conversationId,
        role: 'user',
        content: initialMessage,
        ts: Date.now(),
      };
      
      await saveMessage(userMsg);
      setMessages([userMsg]);
      setLoading(true);

      try {
        const projectContext = getProjectContext(project);
        const fullContext = kbCtx + (projectContext ? '\n\n' + projectContext : '');

        // Get recent messages for context (should just be the user message)
        const recentMessages = await getRecentMessages(conversationId, 50);
        const messagesForAPI = recentMessages.map(({ role, content }) => ({ role, content }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesForAPI,
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

        const assistantMsg: ChatMessage = {
          conversationId: conversationId,
          role: 'assistant',
          content: '',
          ts: Date.now(),
        };
        setMessages(m => [...m, assistantMsg]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          acc += decoder.decode(value, { stream: true });

          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = {
              ...assistantMsg,
              content: acc,
            };
            return copy;
          });
        }

        // Save complete assistant message
        await saveMessage({
          conversationId: conversationId,
          role: 'assistant',
          content: acc,
          ts: Date.now(),
        });
        await refreshConversations();
      } catch (error: any) {
        let errorMessage = 'Something went wrong. Please try again.';

        if (error.message) {
          errorMessage = error.message;
        }

        const errorMsg: ChatMessage = {
          conversationId: conversationId,
          role: 'assistant',
          content: `❌ **Error:** ${errorMessage}\n\nIf this is a quota or billing issue, please check your OpenAI account settings.`,
          ts: Date.now(),
        };
        setMessages(m => [...m, errorMsg]);
        await saveMessage(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Try to find matching project by conversation_id
    const project = projects.find(p => p.conversation_id === conversationId);
    if (project) {
      setSelectedProject(project);
    } else if (conversationId.startsWith('project-')) {
      // Fallback: try to find by project_id
      const projectId = conversationId.replace('project-', '');
      const foundProject = projects.find(p => p.project_id === projectId);
      if (foundProject) {
        setSelectedProject(foundProject);
      } else {
        setSelectedProject(null);
      }
    } else {
      setSelectedProject(null);
    }
    const existingMessages = await loadConversation(conversationId);
    setMessages(existingMessages);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await clearConversation(conversationId);
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
        setSelectedProject(null);
      }
      await refreshConversations();
    }
  };

  const getProjectContext = (project: Project | null): string => {
    if (!project) return '';
    
    const allStack = [...(project.frontend_stack || []), ...(project.backend_stack || [])];
    const stackDisplay = allStack.length > 0 ? allStack.join(', ') : 'N/A';
    
    return `
Project Name: ${project.name}
Category: ${project.category}
Client: ${project.client_name}
Status: ${project.status}
Start Date: ${project.start_date}
Budget: ${project.budget}

Goal: ${project.goal_summary}

Experience: ${project.experience || 'N/A'}

Team Members: ${project.team_members?.join(', ') || 'N/A'}
Frontend Stack: ${project.frontend_stack?.join(', ') || 'N/A'}
Backend Stack: ${project.backend_stack?.join(', ') || 'N/A'}
Integrations: ${project.integrations?.join(', ') || 'N/A'}
Deployment: ${project.deployment || 'N/A'}

Core Features:
${project.core_features?.map(f => `- ${f}`).join('\n') || 'N/A'}

Target Users: ${project.target_users || 'N/A'}
Unique Value: ${project.unique_value || 'N/A'}

Challenges:
${project.challenges?.map(c => `- ${c}`).join('\n') || 'N/A'}

Solutions:
${project.solutions?.map(s => `- ${s}`).join('\n') || 'N/A'}

Lessons Learned: ${project.lessons_learned || 'N/A'}

Communication: ${project.communication_tools?.join(', ') || 'N/A'}
Update Frequency: ${project.update_frequency || 'N/A'}
Tags: ${project.tags?.join(', ') || 'N/A'}

AI Context Note: ${project.ai_context_note || 'N/A'}
`;
  };

  async function ask() {
    if (!input.trim() || loading) return;

    // Ensure we have a conversationId
    const conversationId = getConversationId();
    if (!currentConversationId) {
      setCurrentConversationId(conversationId);
    }

    const userMessage = input.trim();
    const userMsg: ChatMessage = {
      conversationId: conversationId,
      role: 'user',
      content: userMessage,
      ts: Date.now(),
    };
    
    // Save user message immediately
    await saveMessage(userMsg);
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const projectContext = getProjectContext(selectedProject);
      const fullContext = kbCtx + (projectContext ? '\n\n' + projectContext : '');

      // Get recent messages for context (last 50)
      const recentMessages = await getRecentMessages(conversationId, 50);
      const messagesForAPI = recentMessages.map(({ role, content }) => ({ role, content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForAPI,
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

      const assistantMsg: ChatMessage = {
        conversationId: conversationId,
        role: 'assistant',
        content: '',
        ts: Date.now(),
      };
      setMessages(m => [...m, assistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        acc += decoder.decode(value, { stream: true });

        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...assistantMsg,
            content: acc,
          };
          return copy;
        });
      }

      // Save complete assistant message
      await saveMessage({
        conversationId: conversationId,
        role: 'assistant',
        content: acc,
        ts: Date.now(),
      });
      await refreshConversations();
    } catch (error: any) {
      let errorMessage = 'Something went wrong. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      }

      const errorMsg: ChatMessage = {
        conversationId: conversationId,
        role: 'assistant',
        content: `❌ **Error:** ${errorMessage}\n\nIf this is a quota or billing issue, please check your OpenAI account settings.`,
        ts: Date.now(),
      };
      setMessages(m => [...m, errorMsg]);
      await saveMessage(errorMsg);
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
    
    // Ensure we have a conversationId
    const conversationId = getConversationId();
    if (!currentConversationId) {
      setCurrentConversationId(conversationId);
    }
    
    const userMessage = question.trim();
    const userMsg: ChatMessage = {
      conversationId: conversationId,
      role: 'user',
      content: userMessage,
      ts: Date.now(),
    };
    
    await saveMessage(userMsg);
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const projectContext = getProjectContext(selectedProject);
      const fullContext = kbCtx + (projectContext ? '\n\n' + projectContext : '');

      // Get recent messages for context
      const recentMessages = await getRecentMessages(conversationId, 50);
      const messagesForAPI = recentMessages.map(({ role, content }) => ({ role, content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForAPI,
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

      const assistantMsg: ChatMessage = {
        conversationId: conversationId,
        role: 'assistant',
        content: '',
        ts: Date.now(),
      };
      setMessages(m => [...m, assistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...assistantMsg,
            content: acc,
          };
          return copy;
        });
      }

      // Save complete assistant message
      await saveMessage({
        conversationId: conversationId,
        role: 'assistant',
        content: acc,
        ts: Date.now(),
      });
      await refreshConversations();
    } catch (error: any) {
      const errorMessage = error?.message || 'Something went wrong. Please try again.';
      const errorMsg: ChatMessage = {
        conversationId: conversationId,
        role: 'assistant',
        content: `❌ **Error:** ${errorMessage}\n\nIf this is a quota or billing issue, please check your OpenAI account settings.`,
        ts: Date.now(),
      };
      setMessages(m => [...m, errorMsg]);
      await saveMessage(errorMsg);
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
                      key={project.project_id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-sm ${
                        selectedProject?.project_id === project.project_id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{project.name}</span>
                      {selectedProject?.project_id === project.project_id && (
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
            {conversations.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2">Conversations</h3>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {conversations.map((conv) => {
                    const isActive = currentConversationId === conv.conversationId;
                    const displayName = conv.firstMessage 
                      ? conv.firstMessage.substring(0, 30) + (conv.firstMessage.length > 30 ? '...' : '')
                      : (() => {
                          // Try to find project by conversation_id first
                          const project = projects.find(p => p.conversation_id === conv.conversationId);
                          if (project) return project.name;
                          // Fallback to project- prefix matching
                          if (conv.conversationId.startsWith('project-')) {
                            const projectId = conv.conversationId.replace('project-', '');
                            const foundProject = projects.find(p => p.project_id === projectId);
                            return foundProject?.name || 'Project Chat';
                          }
                          return 'New Chat';
                        })();
                    const lastActivity = new Date(conv.lastActivity).toLocaleDateString();
                    
                    return (
                      <div
                        key={conv.conversationId}
                        className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <button
                          onClick={() => handleConversationSelect(conv.conversationId)}
                          className="flex-1 flex items-center gap-3 text-sm text-left min-w-0"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{displayName}</div>
                            <div className="text-xs text-gray-500">{lastActivity} • {conv.messageCount} msgs</div>
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.conversationId, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                          title="Delete conversation"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
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
            <Link href="https://www.auraxpro.com" className="flex items-center gap-2">
              <Image src="/brand.png" alt="Logo" width={128} height={51} />
            </Link>
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
                        <Image src="/logo.png" alt="Logo" width={24} height={24} />
                      </div>
                    )}
                    <div className={`flex-1 ${m.role === 'user' ? 'flex justify-end' : ''}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-800 text-gray-100'
                        }`}>
                        {m.role === 'assistant' ? (
                          <div className="break-words">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="ml-4">{children}</li>,
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-2 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
                                code: ({ children }) => <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                                pre: ({ children }) => <pre className="bg-gray-700 p-3 rounded mb-2 overflow-x-auto">{children}</pre>,
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        )}
                      </div>
                    </div>
                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-gray-300" />
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
