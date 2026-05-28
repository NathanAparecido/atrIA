/**
 * liminai — Navbar magnification (estilo Antigravity dock)
 *  - Pill flutuante de tamanho fixo (não morpha).
 *  - Cada item escala em função da distância do cursor (proximity scaling).
 *  - transform: scale() acelerado por GPU — sem reflow, não empurra vizinhos.
 *  - Submenus abrem como dropdown flutuante DESTACADO da pill.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
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
const HOVER_CLOSE_DELAY = 140;

// Magnification — ajuste fino aqui:
const MOUSE_FAR = 99999;                // sentinel "cursor longe"
const MAGNIFY_MAX = 1.28;               // escala do item sob o cursor
const MAGNIFY_RADIUS = 140;             // px: alcance do efeito
const MAGNIFY_SPRING = { stiffness: 320, damping: 22, mass: 0.45 };

function MagnifyItem({ mouseX, children }) {
  const ref = useRef(null);
  const center = useMotionValue(0);

  // Cacheia o centro X do item; reatualiza em resize/scroll para manter preciso.
  useEffect(() => {
    function update() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      center.set(rect.left + rect.width / 2);
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    const obs = new ResizeObserver(update);
    if (ref.current) obs.observe(ref.current);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      obs.disconnect();
    };
  }, [center]);

  const distance = useTransform([mouseX, center], ([mx, c]) =>
    Math.abs(mx - c)
  );
  const scale = useTransform(
    distance,
    [0, MAGNIFY_RADIUS],
    [MAGNIFY_MAX, 1],
    { clamp: true }
  );
  const smoothScale = useSpring(scale, MAGNIFY_SPRING);

  return (
    <motion.div
      ref={ref}
      style={{ scale: smoothScale, transformOrigin: '50% 50%' }}
      className="inline-flex"
    >
      {children}
    </motion.div>
  );
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const closeTimer = useRef(null);
  const navigate = useNavigate();
  const mouseX = useMotionValue(MOUSE_FAR);

  const activeItem = openMenu ? MENU.find((m) => m.title === openMenu) : null;
  const hasPanel = Boolean(activeItem?.items);

  // Glass on scroll
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Click-outside fecha o submenu
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
    if (item.url) navigate(item.url);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  return (
    <div className="fixed top-3 left-0 right-0 z-50 px-4 pointer-events-none">
      <div ref={navRef} className="max-w-xl mx-auto pointer-events-auto relative">
        <nav
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => {
            mouseX.set(MOUSE_FAR);
            closeOnLeave();
          }}
          onMouseEnter={cancelClose}
          className="rounded-full"
          style={{
            background: scrolled
              ? 'color-mix(in srgb, var(--color-surface) 90%, transparent)'
              : 'color-mix(in srgb, var(--color-bg) 55%, transparent)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border:
              '1px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
            boxShadow: scrolled
              ? '0 10px 28px rgba(0,0,0,0.28)'
              : '0 4px 16px rgba(0,0,0,0.12)',
            transition: 'background 220ms ease, box-shadow 220ms ease',
          }}
        >
          <div className="px-3 h-14 flex items-center justify-between gap-3">
            <ul className="hidden lg:flex items-center gap-2">
              {MENU.map((item) => (
                <li
                  key={item.title}
                  className="relative"
                  onMouseEnter={() => openOnHover(item.items ? item.title : null)}
                >
                  <MagnifyItem mouseX={mouseX}>
                    {item.items ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(openMenu === item.title ? null : item.title)
                        }
                        className="px-3 py-2 text-sm rounded-full flex items-center gap-1.5 transition-colors"
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => go(item)}
                        className="px-3 py-2 text-sm rounded-full transition-colors"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {item.title}
                      </button>
                    )}
                  </MagnifyItem>
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
        </nav>

        {/* Submenu flutuante DESTACADO da pill (não morpha a barra) */}
        <AnimatePresence>
          {hasPanel && (
            <motion.div
              key={`panel-${activeItem.title}`}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={cancelClose}
              onMouseLeave={closeOnLeave}
              className="hidden lg:block absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[520px] rounded-2xl overflow-hidden"
              style={{
                background:
                  'color-mix(in srgb, var(--color-surface) 95%, transparent)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border:
                  '1px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              <div className="p-3 grid grid-cols-2 gap-2">
                {activeItem.items.map((sub) => (
                  <button
                    key={sub.title}
                    type="button"
                    onClick={() => go(sub)}
                    className="group flex gap-3 items-start text-left rounded-lg p-3 transition-colors hover:bg-white/5"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden mt-2 overflow-hidden rounded-2xl"
              style={{
                background:
                  'color-mix(in srgb, var(--color-surface) 96%, transparent)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border:
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
      </div>
    </div>
  );
}
