/**
 * Liminai — Página Inicial (Landing)
 *
 * Estrutura (inspirada em antigravity.google):
 *  - Hero FIXO (CinematicFooter): typewriter "venha inovar conosco → liminai"
 *    com cursor BRANCO (cursorColor passado no motion-footer), marquee e cta.
 *  - Ao rolar, TUDO muda: um véu escuro cobre o hero gradualmente (scrub)
 *    enquanto as seções de conteúdo (LandingSections) deslizam por cima com
 *    fundo sólido e cantos arredondados — efeito de "cortina".
 *  - A navbar morpha de barra larga transparente → pill fosca (no Navbar).
 *
 * NOTA TÉCNICA: o escurecimento é feito com um OVERLAY fixo, e não com
 * transform/filter no wrapper do hero — transform em um ancestral viraria
 * o containing block do footer position:fixed e quebraria o efeito cortina.
 *
 * FIX (jitter com página parada): a partir do lenis 1.2, `autoRaf` é TRUE
 * por padrão. Como também adicionávamos `lenis.raf()` ao gsap.ticker, o
 * Lenis era avançado DUAS vezes por frame com bases de tempo diferentes
 * (performance.now interno vs. tempo do ticker do GSAP). O lerp oscilava
 * e a página "respirava"/tremia sozinha mesmo sem scroll, com os scrubs
 * do ScrollTrigger amplificando o efeito. Correções:
 *  1. autoRaf: false — o gsap.ticker passa a ser o ÚNICO loop.
 *  2. gsap.ticker.remove() no cleanup — antes o callback vazava (com o
 *     StrictMode do React 18 o efeito monta 2x e acumulava tickers
 *     apontando para instâncias destruídas do Lenis).
 *  3. lagSmoothing restaurado no cleanup — lagSmoothing(0) é GLOBAL e
 *     vazava para as outras páginas (Chat, Login etc).
 */

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CinematicFooter } from '@/components/ui/motion-footer';
import LandingSections from '../components/landing/LandingSections';
import ThemeToggle from '../components/ThemeToggle';
import Navbar from '../components/Navbar';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const dimRef = useRef(null);

  // ── Lenis smooth scroll + GSAP ticker (loop ÚNICO) ───────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      autoRaf: false, // CRÍTICO: desliga o rAF interno; o gsap.ticker assume
    });

    // Lenis + ScrollTrigger precisam se conhecer para os scrubs ficarem suaves
    lenis.on('scroll', ScrollTrigger.update);

    // Referência nomeada para conseguir remover no cleanup
    const tickerCallback = (time) => {
      lenis.raf(time * 1000); // gsap.ticker entrega segundos; lenis espera ms
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);   // sem isso o callback vaza entre mounts
      gsap.ticker.lagSmoothing(500, 33);    // restaura o default global do GSAP
      lenis.destroy();
    };
  }, []);

  // ── Véu sobre o hero: escurece conforme o conteúdo cobre a tela ──────────
  useEffect(() => {
    if (!dimRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        dimRef.current,
        { opacity: 0 },
        {
          opacity: 0.6,
          ease: 'none',
          scrollTrigger: {
            start: 0,
            end: () => window.innerHeight, // primeira viewport de scroll
            scrub: 0.8,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      className="relative w-full min-h-screen font-sans selection:bg-white/20 overflow-x-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Navbar fixa — morpha de barra larga → pill fosca no scroll */}
      <Navbar />

      {/* Theme Toggle (fixo, fora do hero) */}
      <div className="fixed bottom-5 right-5 z-40">
        <ThemeToggle />
      </div>

      {/* ── Seção 1: Hero pinado (typewriter liminai, cursor branco) ── */}
      <CinematicFooter />

      {/* Véu de escurecimento do hero — entre o hero (fixed) e as seções */}
      <div
        ref={dimRef}
        className="fixed inset-0 z-[5] pointer-events-none"
        style={{ background: '#000', opacity: 0 }}
      />

      {/* ── Seções 2+: conteúdo desliza por cima do hero ── */}
      <LandingSections />
    </div>
  );
}
