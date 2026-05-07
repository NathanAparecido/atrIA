/**
 * liminai — Navbar da página inicial
 * Inspirado no padrão Navbar1 (shadcn-blocks), mas sem radix:
 * dropdowns próprios via state, drawer mobile próprio.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Sparkles, Layers, Compass, GraduationCap } from 'lucide-react';

const MENU = [
  { title: 'Produto', url: '/' },
  {
    title: 'Casos de uso',
    items: [
      {
        title: 'Em breve',
        description: 'Estamos preparando exemplos de aplicação por setor.',
        icon: <Sparkles className="size-5 shrink-0" />,
      },
      {
        title: 'NOC & operações',
        description: 'Pesquise procedimentos e escalações em linguagem natural.',
        icon: <Layers className="size-5 shrink-0" />,
      },
    ],
  },
  {
    title: 'Recursos',
    items: [
      {
        title: 'Documentação',
        description: 'Como indexar PDFs e tirar mais do RAG por setor.',
        icon: <GraduationCap className="size-5 shrink-0" />,
      },
      {
        title: 'Status',
        description: 'Saúde dos serviços e janelas de manutenção.',
        icon: <Compass className="size-5 shrink-0" />,
      },
    ],
  },
];

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handle(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function go(item) {
    if (item.url) navigate(item.url);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 transition-theme"
      style={{
        background: 'color-mix(in oklab, var(--color-bg) 70%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Desktop menu */}
        <ul className="hidden lg:flex items-center gap-1">
          {MENU.map((item) => (
            <li key={item.title} className="relative">
              {item.items ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === item.title ? null : item.title)}
                    className="px-3 py-2 text-sm rounded-md hover:bg-white/5 flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {item.title}
                    <ChevronDown
                      className={`size-3.5 transition-transform ${openMenu === item.title ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openMenu === item.title && (
                    <div
                      className="absolute top-full left-0 mt-2 w-80 rounded-lg p-2 z-[60]"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      }}
                    >
                      {item.items.map((sub) => (
                        <button
                          key={sub.title}
                          type="button"
                          onClick={() => go(sub)}
                          className="w-full flex gap-3 items-start text-left rounded-md p-3 hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--color-text)' }}
                        >
                          <div
                            className="mt-0.5 shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{
                              background: 'rgba(0,184,168,0.10)',
                              color: 'rgba(0,184,168,0.85)',
                              border: '1px solid rgba(0,184,168,0.20)',
                            }}
                          >
                            {sub.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{sub.title}</div>
                            {sub.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => go(item)}
                  className="px-3 py-2 text-sm rounded-md hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  {item.title}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden ml-auto p-2 rounded-md hover:bg-white/5"
          onClick={() => setMobileOpen((v) => !v)}
          style={{ color: 'var(--color-text)' }}
          aria-label="abrir menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          style={{
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <ul className="py-3 px-4 space-y-1">
            {MENU.map((item) => (
              <li key={item.title}>
                {item.items ? (
                  <details className="group">
                    <summary className="py-2 px-2 text-sm font-semibold cursor-pointer flex items-center justify-between rounded-md hover:bg-white/5">
                      {item.title}
                      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pl-2 mt-1 space-y-1">
                      {item.items.map((sub) => (
                        <button
                          key={sub.title}
                          type="button"
                          onClick={() => go(sub)}
                          className="w-full flex gap-3 items-start text-left rounded-md p-2 hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--color-text)' }}
                        >
                          <div className="shrink-0" style={{ color: 'rgba(0,184,168,0.85)' }}>
                            {sub.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{sub.title}</div>
                            {sub.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </details>
                ) : (
                  <button
                    type="button"
                    onClick={() => go(item)}
                    className="w-full text-left py-2 px-2 text-sm font-semibold rounded-md hover:bg-white/5"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {item.title}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
