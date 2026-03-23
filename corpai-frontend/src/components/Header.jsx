/**
 * CorpAI — Header
 * Logo, nome do usuário, navegação e botão de logout.
 */

import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout, canUpload, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navItems = [
    { path: '/', label: 'Chat', always: true },
    { path: '/documentos', label: 'Documentos', show: canUpload },
    { path: '/admin', label: 'Admin', show: isAdmin },
  ];

  const setorLabel = {
    noc: 'NOC',
    suporte_n2: 'Suporte N2',
    suporte_n3: 'Suporte N3',
    financeiro: 'Financeiro',
    diretoria: 'Diretoria',
    vendas: 'Vendas',
    marketing: 'Marketing',
    vendas_dc: 'Vendas DC',
    infra: 'Infraestrutura',
    suporte_rua: 'Suporte Rua',
    global: 'Global',
  };

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 transition-theme"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      
      {/* Logo e Nome */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-corpai-500 to-corpai-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">
          Corp<span className="text-corpai-400">AI</span>
        </h1>
      </div>

      {/* Navegação */}
      <nav className="flex items-center gap-1">
        {navItems.filter(item => item.always || item.show).map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              location.pathname === item.path
                ? 'bg-corpai-600/20 text-corpai-400 font-medium'
                : 'hover:bg-white/5'
            }`}
            style={{ color: location.pathname === item.path ? undefined : 'var(--color-text-muted)' }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Usuário e Ações */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {user?.nome_completo || user?.username}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {setorLabel[user?.setor] || user?.setor} • {user?.role}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
          title="Sair"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
