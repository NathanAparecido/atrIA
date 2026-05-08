/**
 * liminai — Navbar da página inicial
 * Inspirada na nav de antigravity.google:
 *  - Sticky no topo, fundo transparente que vira glassmorphism ao scrollar.
 *  - Borda inferior sutil ganha vida só depois de descer um pouco.
 *  - Mega menu desce com fade + slide; hover abre, click também.
 *  - Chevron rotaciona 180° suavemente.
 *  - Links sem submenu têm sublinhado animado expandindo do centro.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

const SCROLL_THRESHOLD = 24;
const HOVER_CLOSE_DELAY = 120;

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const closeTimer = useRef(null);
  const navigate = useNavigate();

  // Glass on scroll
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click-outside fecha dropdown
  useEffect(() => {
    function handle(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function openOnHover(title) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenMenu(title);
  }

  function closeOnHover() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), HOVER_CLOSE_DELAY);
  }

  function go(item) {
    if (item.url) navigate(item.url);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled
          ? 'color-mix(in srgb, var(--color-bg) 65%, transparent)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled
          ? '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)'
          : '1px solid transparent',
        boxShadow: scrolled ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Desktop menu */}
        <ul className="hidden lg:flex items-center gap-1">
          {MENU.map((item) => (
            <li
              key={item.title}
              className="relative"
              onMouseEnter={() => item.items && openOnHover(item.title)}
              onMouseLeave={() => item.items && closeOnHover()}
            >
              {item.items ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu(openMenu === item.title ? null : item.title)
                    }
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-1.5 transition-colors"
                    style={{ color: 'var(--color-text)' }}
                    aria-expanded={openMenu === item.title}
                  >
                    <span>{item.title}</span>
                    <ChevronDown
                      className={`size-3.5 transition-transform duration-300 ease-out ${
                        openMenu === item.title ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {openMenu === item.title && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 mt-2 w-80 rounded-lg p-2 z-[60]"
                        style={{
                          background:
                            'color-mix(in srgb, var(--color-surface) 92%, transparent)',
                          backdropFilter: 'blur(20px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                          boxShadow:
                            '0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}
                      >
                        {item.items.map((sub) => (
                          <button
                            key={sub.title}
                            type="button"
                            onClick={() => go(sub)}
                            className="group w-full flex gap-3 items-start text-left rounded-md p-3 transition-colors hover:bg-white/5"
                            style={{ color: 'var(--color-text)' }}
                          >
                            <div
                              className="mt-0.5 shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
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
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => go(item)}
                  className="relative px-4 py-2 text-sm rounded-md transition-colors
                             after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2
                             after:h-px after:w-0 after:bg-current after:opacity-70
                             after:transition-[width] after:duration-300 after:ease-out
                             hover:after:w-[calc(100%-2rem)]"
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
          className="lg:hidden ml-auto p-2 rounded-md hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          style={{ color: 'var(--color-text)' }}
          aria-label="abrir menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden overflow-hidden"
            style={{
              background:
                'color-mix(in srgb, var(--color-surface) 96%, transparent)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderTop:
                '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
            }}
          >
            <ul className="py-3 px-4 space-y-1">
              {MENU.map((item) => (
                <li key={item.title}>
                  {item.items ? (
                    <details className="group">
                      <summary className="py-2 px-2 text-sm font-semibold cursor-pointer flex items-center justify-between rounded-md hover:bg-white/5 transition-colors">
                        {item.title}
                        <ChevronDown className="size-3.5 transition-transform duration-300 group-open:rotate-180" />
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
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
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
                      className="w-full text-left py-2 px-2 text-sm font-semibold rounded-md hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {item.title}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
