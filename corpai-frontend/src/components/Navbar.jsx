/**
 * liminai — Navbar magnification (Antigravity dock, refinado)
 *
 * Física da magnificação:
 *  - Decay GAUSSIANO (não-linear): scale(d) = 1 + MAX_BOOST · e^(-d²/2σ²)
 *      No centro:        ~1.80x
 *      A 1·σ do cursor:  ~1.49x  (vizinho imediato)
 *      A 2·σ do cursor:  ~1.11x  (vizinho distante)
 *      A 3·σ do cursor:  ~1.01x  (efetivamente neutro)
 *  - Spring de ESCALA com damping baixo → leve overshoot elástico.
 *  - Spring de TRANSLAÇÃO crítico → push lateral sem bambolear.
 *  - GAP DINÂMICO: cada item ganha translateX via tanh assinado, criando
 *    espaço para o vizinho magnificado sem reflow (puro GPU).
 *  - Dissipação na SAÍDA do cursor: tween levemente longo (~0.55s) com
 *    ease-out expo para sensação de inércia.
 *  - Frame loop: Framer Motion já encadeia tudo em requestAnimationFrame.
 *  - transform-origin: center bottom — crescimento "brota" da base da pill.
 *  - will-change: transform — força camada GPU dedicada por item.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  animate,
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

// === Magnification tuning — ajuste fino aqui =================================
const MOUSE_OFF = -99999;                  // sentinel "cursor fora da nav"
const MAX_BOOST = 0.8;                     // pico de escala = 1 + 0.8 = 1.80x
const SIGMA = 90;                          // px: σ do decay gaussiano
const MAX_PUSH = 36;                       // px: translação lateral máxima (gap dinâmico)
const RETURN_DURATION = 0.55;              // s: dissipação na saída (inércia)
const RETURN_EASE = [0.16, 1, 0.3, 1];     // expo-out (sem overshoot na volta)

// Spring de ESCALA — damping baixo gera overshoot elástico (~10%).
// Equivale à sensação de cubic-bezier(0.175, 0.885, 0.32, 1.275).
const SCALE_SPRING = { stiffness: 380, damping: 18, mass: 0.7 };

// Spring de TRANSLAÇÃO — crítico, sem oscilação lateral.
const PUSH_SPRING = { stiffness: 380, damping: 24, mass: 0.6 };
// ============================================================================

function MagnifyItem({ mouseX, children }) {
  const ref = useRef(null);
  const center = useMotionValue(0);

  // Cacheia o centro X "real" do item (antes de qualquer transform).
  // ResizeObserver + listeners cobrem mudanças de layout/scroll.
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

  // Distância ASSINADA cursor→item (positiva = item está à direita do cursor).
  const signed = useTransform([mouseX, center], ([mx, c]) => c - mx);

  // Escala não-linear via gaussiana.
  // d=0 → 1+MAX_BOOST; |d|=σ → 1+MAX_BOOST·0.607; |d|=2σ → 1+MAX_BOOST·0.135.
  const scale = useTransform(signed, (d) => {
    const g = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
    return 1 + MAX_BOOST * g;
  });

  // Push lateral — S-curve saturando: zero no centro, máximo nas extremidades.
  // tanh é simétrico, suave e GPU-cheap. Cria o "gap dinâmico".
  const tx = useTransform(signed, (d) => {
    return Math.sign(d) * MAX_PUSH * Math.tanh(Math.abs(d) / (SIGMA * 1.4));
  });

  const sScale = useSpring(scale, SCALE_SPRING);
  const sTx = useSpring(tx, PUSH_SPRING);

  return (
    <motion.div
      ref={ref}
      style={{
        scale: sScale,
        x: sTx,
        transformOrigin: '50% 100%',  // center bottom — cresce a partir da base
        willChange: 'transform',
      }}
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
  const mouseX = useMotionValue(MOUSE_OFF);

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
          onMouseMove={(e) => {
            mouseX.stop();
            mouseX.set(e.clientX);
          }}
          onMouseLeave={() => {
            // Dissipação com inércia: tween levemente longo, ease-out expo.
            // Os springs por item amaciam a chegada em scale=1 naturalmente.
            animate(mouseX, MOUSE_OFF, {
              duration: RETURN_DURATION,
              ease: RETURN_EASE,
            });
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
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            <ul className="hidden lg:flex items-center gap-5">
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
