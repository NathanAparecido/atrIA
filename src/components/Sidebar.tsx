import { ChatSession, User } from '../types';
import { Plus, MessageSquare, Trash2, LogOut, Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  user: User | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  isDark: boolean;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function Sidebar({
  user,
  sessions,
  currentSessionId,
  isDark,
  isOpen,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onToggleTheme,
  onLogout,
  onToggleSidebar,
}: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen glass border-r border-white/10 w-72 flex flex-col z-50 transform transition-all duration-500 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-primary-900 border border-white/20 flex items-center justify-center relative overflow-hidden shadow-inner">
                <span className="text-2xl font-black text-white font-orbitron tracking-tighter">a</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-blue rounded-full animate-pulse-blue"></span>
              </div>
              <span className="text-xl font-bold text-primary-900 dark:text-white font-inter tracking-tight">atrIA</span>
            </div>
          </div>

          <button
            onClick={onNewChat}
            className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-xl flex items-center gap-3 justify-center transition-all duration-300 shadow-lg shadow-primary-900/20 group hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span className="font-semibold tracking-wide">Nova Sessão atrIA</span>
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${currentSessionId === session.id
                ? 'bg-primary-600/10 dark:bg-accent-blue/10 border border-primary-600/20 dark:border-accent-blue/20 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className={`p-2 rounded-lg ${currentSessionId === session.id ? 'text-primary-600 dark:text-accent-blue' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-500 dark:group-hover:text-accent-blue'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-primary-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {session.title || 'Nova Discussão'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-widest font-bold">
                    {new Date(session.updated_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all text-red-500"
                title="Deletar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer - User Controls */}
        <div className="border-t border-white/10 p-4 space-y-3 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm glass rounded-xl border-white/5">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block truncate text-gray-900 dark:text-gray-100 font-medium">{user?.email?.split('@')[0]}</span>
              <span className="block text-[10px] text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onToggleTheme}
              className="flex-1 px-3 py-2.5 glass hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 transition-all group"
              title="Alternar tema"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-yellow-500 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-primary-600" />
              )}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{isDark ? 'Luz' : 'Sombra'}</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-600/20 rounded-xl transition-all duration-300"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>


      {/* Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className={`fixed top-4 z-40 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${isOpen ? 'left-[17rem]' : 'left-4'
          }`}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-900 dark:text-gray-100" />
        )}
      </button>
    </>
  );
}
