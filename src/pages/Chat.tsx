import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';
import { MessageRenderer } from '../components/MessageRenderer';
import { Sidebar } from '../components/Sidebar';
import { getUserSessions, getSessionMessages, savePendingMessage, createSession, deleteSession, updateSessionTitle } from '../lib/db';
import { sendWebhook } from '../lib/n8n';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/auth';
import { Message, ChatSession } from '../types';
import { Send, Bot, User as UserIcon, MessageSquare } from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (user && sessionId) {
      loadSessionMessages(sessionId);
    } else if (user && sessions.length > 0 && !sessionId) {
      navigate(`/chat/${sessions[0].id}`);
    }
  }, [sessionId, user, sessions]);

  useEffect(() => {
    if (user && currentSession?.id) {
      console.log('Subscribing to session:', currentSession.id);
      const cleanup = subscribeToMessages(currentSession.id);
      return () => {
        console.log('Unsubscribing from session:', currentSession.id);
        cleanup && cleanup();
      };
    }
  }, [user, currentSession?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      const data = await getUserSessions(user.id);
      setSessions(data);
    } catch (error) {
      showToast('Falha ao carregar conversas', 'error');
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data);

      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
      } else {
        const allSessions = await getUserSessions(user!.id);
        const foundSession = allSessions.find((s: ChatSession) => s.id === sessionId);
        if (foundSession) {
          setCurrentSession(foundSession);
          setSessions(allSessions);
        }
      }
    } catch (error) {
      showToast('Falha ao carregar mensagens', 'error');
    }
  };

  const subscribeToMessages = (sessionId: string) => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          setMessages((prev: Message[]) => {
            // Prevent adding duplicate messages (e.g. optimistic updates vs realtime insert)
            if (prev.some(msg => msg.id === (payload.new as Message).id)) {
              return prev;
            }
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) => msg.id === (payload.new as Message).id ? payload.new as Message : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      const newSession = await createSession(user.id);
      setSessions((prev: ChatSession[]) => [newSession, ...prev]);
      navigate(`/chat/${newSession.id}`);
      setMessages([]);
      setSidebarOpen(false);
      showToast('Nova conversa criada', 'success');
    } catch (error) {
      showToast('Falha ao criar conversa', 'error');
    }
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteSession(sessionId);
      setSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== sessionId));

      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter((s: ChatSession) => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          navigate(`/chat/${remainingSessions[0].id}`);
        } else {
          await handleNewChat();
        }
      }

      showToast('Conversa deletada', 'success');
    } catch (error) {
      showToast('Falha ao deletar conversa', 'error');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !currentSession || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      const savedMessage = await savePendingMessage(user.id, currentSession.id, userMessage);

      // Auto-generate title if it's the first message and title is still default
      if (messages.length === 0 && (currentSession.title === 'Nova conversa' || currentSession.title === 'Nova Discussão')) {
        const words = userMessage.split(' ');
        let generatedTitle = words.slice(0, 5).join(' ');
        if (generatedTitle.length > 40) generatedTitle = generatedTitle.substring(0, 37) + '...';
        else if (words.length > 5) generatedTitle += '...';

        await updateSessionTitle(currentSession.id, generatedTitle);
        loadSessions(); // Refresh sidebar
      }
      // Removed manual setMessages to prevent duplication with Realtime subscription
      // The Realtime listener will handle adding the message to the UI

      sendWebhook({
        event: 'message_sent',
        user_id: user.id,
        session_id: currentSession.id,
        message_id: savedMessage.id,
        message: userMessage,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        setMessages((prev: Message[]) => {
          const msg = prev.find((m: Message) => m.id === savedMessage.id);
          if (msg && msg.response === null) {
            showToast('A IA está demorando para responder. Tente novamente.', 'error');
            return prev.map((m: Message) =>
              m.id === savedMessage.id
                ? { ...m, response: '[Timeout] A IA não respondeu a tempo. Por favor, tente enviar novamente.' }
                : m
            );
          }
          return prev;
        });
      }, 30000);

      logAudit(user.id, `Sent message: ${userMessage.substring(0, 50)}`);
    } catch (error) {
      showToast('Falha ao enviar mensagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      showToast('Falha ao sair', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors relative">
      <Sidebar
        user={user}
        sessions={sessions}
        currentSessionId={currentSession?.id || null}
        isDark={isDark}
        isOpen={sidebarOpen}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-background-light dark:bg-background-dark/50">
          <div className="max-w-4xl w-full mx-auto space-y-8">
            {!currentSession ? (
              <div className="flex items-center justify-center h-[70vh] animate-fade-in">
                <div className="glass-card p-12 text-center max-w-md border-primary-600/10">
                  <div className="relative inline-block mb-6">
                    <Bot className="w-20 h-20 mx-auto text-primary-600 dark:text-accent-neon" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent-neon rounded-full animate-pulse-neon"></div>
                  </div>
                  <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white uppercase tracking-tighter">atrIA Online</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 font-inter">Terminal de inteligência local de alta performance. Seguro, privado e disruptivo.</p>
                  <button
                    onClick={handleNewChat}
                    className="w-full px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl transition-all duration-300 shadow-xl shadow-primary-900/20 font-bold tracking-wide hover:scale-[1.02]"
                  >
                    Iniciar Nova Operação
                  </button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-[70vh] animate-fade-in">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-primary-600 dark:text-accent-neon" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pátio de Inteligência atrIA Pronto</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-inter">Preparado para orquestração estratégica. Como posso auxiliar hoje?</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((msg: Message) => (
                  <div key={msg.id} className="space-y-8 animate-fade-in">
                    {/* User Message */}
                    <div className="flex gap-4 justify-end items-start group">
                      <div className="flex-1 flex justify-end">
                        <div className="bg-primary-600 text-white px-6 py-4 rounded-3xl rounded-tr-none max-w-2xl shadow-lg shadow-primary-900/10 font-inter leading-relaxed">
                          <MessageRenderer content={msg.message} isUser />
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-primary-700 flex items-center justify-center flex-shrink-0 shadow-md">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* AI Message */}
                    <div className="flex gap-4 items-start group">
                      <div className="w-10 h-10 rounded-2xl glass flex items-center justify-center flex-shrink-0 shadow-md border-white/10">
                        <Bot className="w-5 h-5 text-primary-600 dark:text-accent-neon" />
                      </div>
                      <div className="flex-1">
                        <div className="glass-card px-6 py-5 max-w-3xl leading-relaxed">
                          {msg.response ? (
                            <MessageRenderer content={msg.response} />
                          ) : (
                            <div className="flex items-center gap-3 text-gray-500 dark:text-accent-neon/60">
                              <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-primary-600 dark:bg-accent-neon rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-primary-600 dark:bg-accent-neon rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-primary-600 dark:bg-accent-neon rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Sincronizando atrIA Core...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-background-light dark:bg-background-dark/80 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="relative group transition-all">
              <input
                type="text"
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Insira sua consulta aqui..."
                disabled={loading || !currentSession}
                className="w-full pl-6 pr-24 py-5 glass-card !bg-white/5 dark:!bg-white/5 border-white/10 dark:border-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-accent-neon/30 transition-all text-lg shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || !currentSession}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all duration-300 disabled:opacity-30 disabled:grayscale flex items-center gap-2 group/btn shadow-lg shadow-primary-900/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center mt-3 text-gray-500 uppercase tracking-widest font-bold opacity-50">
              atrIA Core v2.0 • Processamento Local Seguro
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}
