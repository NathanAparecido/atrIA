/**
 * liminai — AppSidebar
 * Sidebar retrátil que é o shell de navegação do app inteiro.
 *
 * Estrutura (expandida, 288px):
 *   ┌──────────────────────────────┐
 *   │ ● liminai            [«]     │  topo: orb + wordmark + colapsar
 *   │ [+ nova conversa]            │
 *   │ chat · documentos · admin    │  navegação (role-gated)
 *   │ ──────────────────────────   │
 *   │ HOJE                         │  conversas agrupadas por dia
 *   │   conversa 1                 │  (apenas quando a página passa
 *   │ ONTEM                        │   as props de conversas)
 *   │   conversa 2 ...             │
 *   │ ──────────────────────────   │
 *   │ ☀ │ tereza · admin    [sair] │  rodapé: tema + usuário + logout
 *   └──────────────────────────────┘
 *
 * Colapsada (64px): trilho de ícones — orb (expande), nova conversa,
 * nav, e avatar do usuário no rodapé. Estado persiste em localStorage.
 *
 * Mobile (<768px): overlay com backdrop; botão hambúrguer fixo abre.
 *
 * Props:
 *   conversas, conversaAtual, onSelectConversa, onNovaConversa,
 *   onDeletarConversa — opcionais; quando ausentes (páginas documentos/
 *   admin) a seção de conversas mostra um atalho "ir para o chat".
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, FileText, ShieldCheck, Plus, Trash2,
  PanelLeftClose, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LiminaiOrb from './LiminaiOrb';
import Wordmark from './Wordmark';
import ThemeToggle from './ThemeToggle';
import FallbackAvatar from './magicui/FallbackAvatar';
import { getProfilePic } from '../lib/profilePic';

const LS_KEY = 'liminai.sidebar.colapsada';

/** Agrupa conversas por recência. Se nenhuma tiver data, devolve grupo único. */
function agruparPorRecencia(conversas) {
  const temData = conversas.some(c => c.atualizado_em);
  if (!temData) return [{ label: null, itens: conversas }];

  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioOntem = new Date(inicioHoje); inicioOntem.setDate(inicioOntem.getDate() - 1);
  const inicio7dias = new Date(inicioHoje); inicio7dias.setDate(inicio7dias.getDate() - 7);

  const grupos = { hoje: [], ontem: [], semana: [], anteriores: [] };
  for (const c of conversas) {
    const d = c.atualizado_em ? new Date(c.atualizado_em) : null;
    if (d && d >= inicioHoje) grupos.hoje.push(c);
    else if (d && d >= inicioOntem) grupos.ontem.push(c);
    else if (d && d >= inicio7dias) grupos.semana.push(c);
    else grupos.anteriores.push(c);
  }

  return [
    { label: 'Hoje',           itens: grupos.hoje },
    { label: 'Ontem',          itens: grupos.ontem },
    { label: 'Últimos 7 dias', itens: grupos.semana },
    { label: 'Anteriores',     itens: grupos.anteriores },
  ].filter(g => g.itens.length > 0);
}

// ─── Item de conversa — exclusão em dois cliques inline (mesma UX do Sidebar v2) ─
function ConversaItem({ conv, ativa, onSelect, onDelete }) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        ativa ? '' : 'hover:bg-white/5'
      }`}
      style={ativa
        ? { background: 'rgba(0,184,168,0.12)', color: 'rgba(0,184,168,0.9)' }
        : { color: 'var(--color-text)' }}
      onClick={() => !confirmando && onSelect(conv.id)}
    >
      {confirmando ? (
        <>
          <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
            Excluir conversa?
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setConfirmando(false); }}
            className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Excluir
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmando(false); }}
            className="px-2 py-0.5 rounded text-xs transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span className="text-sm truncate flex-1">{conv.titulo}</span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmando(true); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0"
              title="Excluir conversa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Item de navegação ───────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, path, colapsada, onNavigate }) {
  const location = useLocation();
  const ativo = location.pathname === path;

  return (
    <button
      onClick={() => onNavigate(path)}
      title={colapsada ? label : undefined}
      className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors
        ${colapsada ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
        ${ativo ? 'font-semibold' : 'hover:bg-white/5'}`}
      style={ativo
        ? { background: 'rgba(0,184,168,0.12)', color: 'rgba(0,184,168,0.9)' }
        : { color: 'var(--color-text-muted)' }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!colapsada && <span className="truncate">{label}</span>}
    </button>
  );
}

// ─── Avatar do usuário — mesma lógica pfp/FallbackAvatar do Header ──────────
function UserAvatar({ user, pfp, size = 32 }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, border: '1.5px solid rgba(0,184,168,0.35)' }}
    >
      {pfp
        ? <img src={pfp} alt={user?.username || 'perfil'} className="w-full h-full object-cover" />
        : <FallbackAvatar name={user?.nome_completo || user?.username || 'liminai'} size={size} animated />
      }
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function AppSidebar({
  conversas,
  conversaAtual,
  onSelectConversa,
  onNovaConversa,
  onDeletarConversa,
}) {
  const { user, logout, canUpload, isAdmin, isGerente } = useAuth();
  const navigate = useNavigate();

  const [colapsada, setColapsada] = useState(
    () => localStorage.getItem(LS_KEY) === '1'
  );
  const [mobileAberta, setMobileAberta] = useState(false);
  const [pfp, setPfp] = useState(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, colapsada ? '1' : '0');
  }, [colapsada]);

  useEffect(() => {
    if (!user?.username) return;
    const refresh = () => setPfp(getProfilePic(user.username));
    refresh();
    window.addEventListener('liminai:pfp-change', refresh);
    return () => window.removeEventListener('liminai:pfp-change', refresh);
  }, [user?.username]);

  const temConversas = Array.isArray(conversas);
  const grupos = useMemo(
    () => (temConversas ? agruparPorRecencia(conversas) : []),
    [conversas, temConversas]
  );

  // Navegação — mesmas regras de role do Header
  const navItems = [
    { icon: MessageSquare, label: 'chat',       path: '/chat',       show: true },
    { icon: FileText,      label: 'documentos', path: '/documentos', show: canUpload },
    { icon: ShieldCheck,   label: 'admin',      path: '/admin',      show: isAdmin || isGerente },
  ].filter(i => i.show);

  function irPara(path) {
    navigate(path);
    setMobileAberta(false);
  }

  function selecionar(id) {
    onSelectConversa?.(id);
    setMobileAberta(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const primeiroNome = (user?.nome_completo || user?.username || 'usuário').split(' ')[0];

  // Oculta "global" do display de setor — setor invisível ao usuário
  const setorDisplay = user?.setor === 'global' ? null : user?.setor;

  // ─── Corpo da sidebar (compartilhado desktop/mobile) ──────────────────────
  const corpo = (
    <aside
      className={`h-full flex flex-col border-r transition-all duration-200 ease-out overflow-hidden
        ${colapsada ? 'w-16' : 'w-72'}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* ── Topo: orb + wordmark + colapsar ── */}
      <div className={`flex items-center h-14 flex-shrink-0 border-b
        ${colapsada ? 'justify-center px-0' : 'justify-between px-4'}`}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {colapsada ? (
          <button onClick={() => setColapsada(false)} title="expandir" className="p-1 rounded-lg hover:bg-white/5">
            <LiminaiOrb size={26} glow={false} />
          </button>
        ) : (
          <>
            <button onClick={() => irPara('/chat')} className="flex items-center gap-2.5 min-w-0">
              <LiminaiOrb size={26} glow={false} />
              <Wordmark className="text-base truncate" />
            </button>
            <button
              onClick={() => setColapsada(true)}
              title="recolher"
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Nova conversa ── */}
      <div className={colapsada ? 'p-2' : 'p-3'}>
        <button
          onClick={() => { onNovaConversa ? onNovaConversa() : irPara('/chat'); setMobileAberta(false); }}
          title={colapsada ? 'nova conversa' : undefined}
          className={`w-full flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90
            ${colapsada ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
              'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
              'radial-gradient(ellipse 130% 120% at 50%  50%,  #5828c8 0%, transparent 52%)',
            ].join(', '),
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.28)',
          }}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!colapsada && 'nova conversa'}
        </button>
      </div>

      {/* ── Navegação ── */}
      <nav className={`flex flex-col gap-0.5 ${colapsada ? 'px-2' : 'px-3'}`}>
        {navItems.map(item => (
          <NavItem key={item.path} {...item} colapsada={colapsada} onNavigate={irPara} />
        ))}
      </nav>

      <div className={`my-3 border-t flex-shrink-0 ${colapsada ? 'mx-2' : 'mx-3'}`}
        style={{ borderColor: 'var(--color-border)' }} />

      {/* ── Conversas agrupadas por dia ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {colapsada ? null : !temConversas ? (
          <button
            onClick={() => irPara('/chat')}
            className="w-full text-left px-6 py-2 text-xs hover:underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            suas conversas ficam no chat →
          </button>
        ) : grupos.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Nenhuma conversa por aqui.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Comece uma — seu histórico fica salvo e separado por setor.
            </p>
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-4">
            {grupos.map(grupo => (
              <div key={grupo.label || 'todas'}>
                {grupo.label && (
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {grupo.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {grupo.itens.map(conv => (
                    <ConversaItem
                      key={conv.id}
                      conv={conv}
                      ativa={conversaAtual === conv.id}
                      onSelect={selecionar}
                      onDelete={onDeletarConversa}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rodapé: tema + usuário + sair ── */}
      <div className={`flex-shrink-0 border-t ${colapsada ? 'p-2' : 'p-3'}`}
        style={{ borderColor: 'var(--color-border)' }}
      >
        {colapsada ? (
          <button
            onClick={() => irPara('/perfil')}
            title={`${primeiroNome} · ${user?.role || ''}`}
            className="w-full flex justify-center p-1 rounded-lg hover:bg-white/5"
          >
            <UserAvatar user={user} pfp={pfp} size={32} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => irPara('/perfil')}
              className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              title="editar perfil"
            >
              <UserAvatar user={user} pfp={pfp} size={32} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-xs font-medium truncate w-full text-left"
                  style={{ color: 'var(--color-text)' }}>{primeiroNome}</span>
                <span className="text-[10px] truncate w-full text-left"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {setorDisplay ? `${setorDisplay} · ` : ''}{user?.role}
                </span>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors flex-shrink-0"
              title="sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block h-full">{corpo}</div>

      {/* Mobile: botão hambúrguer + overlay */}
      <button
        onClick={() => setMobileAberta(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        title="abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileAberta && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="h-full" onClick={e => e.stopPropagation()}>{corpo}</div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileAberta(false)}>
            <button className="absolute top-3 right-3 p-2 text-white/70" title="fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
