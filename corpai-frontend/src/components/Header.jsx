/**
 * liminai — Header
 */

import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const IRIS_TEXT = {
  background: [
    'radial-gradient(ellipse 190% 65% at 8% 92%,  #901870 0%, transparent 48%)',
    'radial-gradient(ellipse 110% 190% at 92% 8%,  #007868 0%, transparent 48%)',
    'radial-gradient(ellipse 130% 110% at 38% 42%, #3a1488 0%, transparent 52%)',
    'radial-gradient(ellipse 85%  75%  at 78% 72%, #6020a0 0%, transparent 44%)',
    'radial-gradient(ellipse 70%  50%  at 55% 15%, #007058 0%, transparent 40%)',
    '#0c0632',
  ].join(', '),
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// Gradiente iridescente — mesmo do Login
const IRIS_BG = [
  'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
  'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
  'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
  '#180848',
].join(', ');

export default function Header() {
  const { user, logout, canUpload, isAdmin, isLiderSetor } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navItems = [
    { path: '/chat',       label: 'chat',       always: true },
    { path: '/documentos', label: 'documentos', show: canUpload },
    { path: '/admin',      label: 'admin',      show: isAdmin || isLiderSetor },
  ];

  const firstName = (user?.nome_completo || user?.username || '').split(' ')[0];

  // Oculta "global" do display de setor — setor invisível ao usuário
  const setorDisplay = user?.setor === 'global' ? null : user?.setor;

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-5 transition-theme shrink-0"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Wordmark */}
      <button
        onClick={() => navigate('/chat')}
        className="flex items-center gap-2.5 group"
      >
        {/* ícone iridescente — inicial "L" */}
        <div
          className="relative w-8 h-8 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
          style={{
            backgroundImage: IRIS_BG,
            border: '1px solid rgba(0,184,168,0.25)',
          }}
        >
          <span
            className="relative text-white font-black text-sm"
            style={{ fontFamily: 'Orbitron, sans-serif', letterSpacing: '-0.05em' }}
          >
            L
          </span>
        </div>

        {/* nome */}
        <span className="text-base font-black tracking-tight font-['Orbitron']">
          limin<span style={IRIS_TEXT}>ai</span>
        </span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-0.5">
        {navItems.filter(i => i.always || i.show).map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                active ? 'font-semibold' : 'hover:bg-white/5'
              }`}
              style={active
                ? { background: 'rgba(0,184,168,0.12)', color: 'rgba(0,184,168,0.9)' }
                : { color: 'var(--color-text-muted)' }
              }
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
            {firstName}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {setorDisplay ? `${setorDisplay} · ` : ''}{user?.role}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors"
          title="sair"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
