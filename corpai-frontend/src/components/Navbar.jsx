/**
 * liminai — Navbar (fiel ao antigravity.google)
 *
 * Comportamento:
 *  - Barra COLADA no topo (top: 0), largura total, sem pill flutuante.
 *  - HIDE ON SCROLL: rolar para baixo esconde a barra (translateY(-100%));
 *    rolar para cima a traz de volta. Com o mega-menu aberto, não esconde.
 *  - Fundo: transparente no topo absoluto da página; sólido (var(--color-bg))
 *    com borda inferior assim que há scroll ou quando o menu está aberto.
 *  - MEGA-MENU estilo Antigravity: painel de LARGURA TOTAL acoplado à barra
 *    (mesmo fundo, sem gap), com coluna esquerda (título + botão) e lista de
 *    itens à direita com cabeçalho de seção. O item ativo da barra ganha uma
 *    pill de fundo com chevron rotacionado (como na screenshot).
 *  - Véu escurecendo o conteúdo atrás quando o menu está aberto.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Wordmark from './Wordmark';
import {
  Menu, X, ChevronDown, Sparkles, Layers, Compass,
  GraduationCap, ShieldCheck, LogIn,
} from 'lucide-react';

const MENU = [
  { title: 'Produto', url: '/' },
  {
    title: 'Casos de uso',
    heading: 'Veja o liminai aplicado à sua operação',
    overviewLabel: 'Ver visão geral',
    overviewUrl: '/',
    sectionLabel: 'Casos de uso',
    items: [
      { title: 'NOC & operações', icon: <Layers className="size-4 shrink-0" /> },
      { title: 'Em breve — mais setores', icon: <Sparkles className="size-4 shrink-0" /> },
    ],
  },
  {
    title: 'Recursos',
    heading: 'Tudo para indexar, perguntar e operar',
    overviewLabel: 'Ver visão geral',
    overviewUrl: '/',
    sectionLabel: 'Recursos',
    items: [
      { title: 'Documentação', icon: <GraduationCap className="size-4 shrink-0" /> },
      { title: 'Status dos serviços', icon: <Compass className="size-4 shrink-0" /> },
    ],
  },
  { title: 'Segurança', anchor: '#seguranca', icon: <ShieldCheck className="size-3.5" /> },
];

const HOVER_CLOSE_DELAY = 140;
const HIDE_AFTER = 80; // px de scroll antes de permitir esconder

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const navRef = useRef(null);
  const closeTimer = useRef(null);
  const lastY = useRef(0);
  const openMenuRef = useRef(null);
  const navigate = useNavigate();

  openMenuRef.current = openMenu;
  const activeItem = openMenu ? MENU.find((m) => m.title === openMenu) : null;
  const hasPanel = Boolean(activeItem?.items);

  // ── Hide on scroll down / reveal on scroll up ─────────────────────────────
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 8);

      const goingDown = y > lastY.current;
      if (openMenuRef.current) {
        // com mega-menu aberto a barra não esconde; scroll fecha o menu
        if (Math.abs(y - lastY.current) > 4) setOpenMenu(null);
        setHidden(false);
      } else if (goingDown && y > HIDE_AFTER) {
        setHidden(true);
      } else if (!goingDown) {
        setHidden(false);
      }
      lastY.current = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click-outside fecha o mega-menu
  useEffect(() => {
    function handle(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openOnHover(title) {
    cancelClose();
    setOpenMenu(title);
  }

  function closeOnLeave() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), HOVER_CLOSE_DELAY);
  }

  function go(item) {
    if (item.anchor) {
      document.querySelector(item.anchor)?.scrollIntoView({ behavior: 'smooth' });
    } else if (item.url) {
      navigate(item.url);
    }
    setOpenMenu(null);
    setMobileOpen(false);
  }

  const solidBg = scrolled || hasPanel || mobileOpen;

  return (
    <>
      {/* Véu sobre a página quando o mega-menu está aberto (como na referência) */}
      <AnimatePresence>
        {hasPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onMouseEnter={closeOnLeave}
          />
        )}
      </AnimatePresence>

      <header
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          textTransform: 'none',
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseLeave={closeOnLeave}
        onMouseEnter={cancelClose}
      >
        {/* ── Barra ── */}
        <nav
          style={{
            background: solidBg ? 'var(--color-bg)' : 'transparent',
            borderBottom: solidBg && !hasPanel
              ? '1px solid var(--color-border)'
              : '1px solid transparent',
            transition: 'background 240ms ease, border-color 240ms ease',
          }}
        >
          <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-8">
            {/* Wordmark (esquerda) */}
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
              className="flex items-center gap-2 select-none shrink-0"
              aria-label="liminai — início"
            >
              <Wordmark className="text-xl tracking-tighter leading-none text-[var(--color-text)]" />
            </button>

            {/* Links (logo após o wordmark, como na referência) */}
            <ul className="hidden lg:flex items-center gap-1">
              {MENU.map((item) => {
                const isOpen = openMenu === item.title;
                return (
                  <li
                    key={item.title}
                    onMouseEnter={() => openOnHover(item.items ? item.title : null)}
                  >
                    {item.items ? (
                      <button
                        type="button"
                        onClick={() => setOpenMenu(isOpen ? null : item.title)}
                        className="px-4 py-2 text-sm rounded-full flex items-center gap-1.5 transition-colors"
                        style={{
                          color: 'var(--color-text)',
                          // pill de fundo no item ATIVO — como "Products" na screenshot
                          background: isOpen ? 'var(--color-surface-hover)' : 'transparent',
                        }}
                        aria-expanded={isOpen}
                      >
                        <span>{item.title}</span>
                        <ChevronDown
                          className={`size-3.5 transition-transform duration-300 ease-out ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => go(item)}
                        className="px-4 py-2 text-sm rounded-full flex items-center gap-1.5 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {item.icon}
                        {item.title}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* CTA (direita) — equivalente ao "Download" */}
            <div className="hidden lg:flex items-center ml-auto shrink-0">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 rounded-full font-semibold text-sm px-5 py-2.5 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
                style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}
              >
                <LogIn className="size-4" />
                Entrar
              </button>
            </div>

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
        </nav>

        {/* ── Mega-menu de largura total, acoplado à barra ── */}
        <AnimatePresence>
          {hasPanel && (
            <motion.div
              key={`panel-${activeItem.title}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block overflow-hidden"
              style={{
                background: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              }}
            >
              <div className="max-w-7xl mx-auto px-5 py-12 grid grid-cols-[1fr_1px_1.2fr] gap-12 items-start">
                {/* Coluna esquerda: título grande + botão pill */}
                <div>
                  <h3
                    className="text-2xl md:text-3xl tracking-tight max-w-sm leading-snug"
                    style={{
                      color: 'var(--color-text)',
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontWeight: 400,
                      textTransform: 'none',
                    }}
                  >
                    {activeItem.heading}
                  </h3>
                  <button
                    type="button"
                    onClick={() => go({ url: activeItem.overviewUrl })}
                    className="mt-7 inline-flex items-center rounded-full text-sm font-semibold px-5 py-2.5 transition-colors"
                    style={{
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {activeItem.overviewLabel}
                  </button>
                </div>

                {/* Divisor vertical (como na referência) */}
                <div className="h-full w-px" style={{ background: 'var(--color-border)' }} />

                {/* Coluna direita: cabeçalho de seção + lista simples icon+label */}
                <div>
                  <p
                    className="text-sm mb-4"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {activeItem.sectionLabel}
                  </p>
                  <ul className="space-y-1">
                    {activeItem.items.map((sub) => (
                      <li key={sub.title}>
                        <button
                          type="button"
                          onClick={() => go(sub)}
                          className="w-full flex items-center gap-3 text-left rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-white/5"
                          style={{ color: 'var(--color-text)' }}
                        >
                          <span style={{ color: 'var(--color-text-muted)' }}>{sub.icon}</span>
                          {sub.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden overflow-hidden"
              style={{
                background: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <ul className="py-3 px-5 space-y-1">
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
                              className="w-full flex items-center gap-3 text-left rounded-md p-2 text-sm font-medium hover:bg-white/5 transition-colors"
                              style={{ color: 'var(--color-text)' }}
                            >
                              <span style={{ color: 'var(--color-text-muted)' }}>{sub.icon}</span>
                              {sub.title}
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
                <li className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); navigate('/login'); }}
                    className="w-full flex items-center justify-center gap-2 rounded-full font-semibold text-sm py-2.5"
                    style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}
                  >
                    <LogIn className="size-4" />
                    Entrar
                  </button>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
