/**
 * Liminai — Página Inicial (Landing)
 * Scroll para revelar o CinematicFooter com sign in.
 */

import { useRef, useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { GooeyText } from '@/components/ui/gooey-text';
import { Particles } from '../components/magicui/Particles';
import ThemeToggle from '../components/ThemeToggle';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const scrollRef = useRef(0);
  const heroRef   = useRef(null);

  // ── Lenis smooth scroll + GSAP ticker ────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });

    lenis.on('scroll', ({ progress }) => {
      scrollRef.current = progress;
    });

    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  // ── Hero entrance animation ───────────────────────────────────────────────
  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, scale: 0.96 },
        {
          opacity: 1,
          scale: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top 85%',
            end: 'top 30%',
            scrub: 1.2,
          },
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative w-full min-h-screen font-sans selection:bg-white/20 overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* ── Seção 1: CTA — visível ao abrir o site ── */}
      <CinematicFooter />

      {/* ── Seção 2: Hero — revelado no scroll ── */}
      <main
        ref={heroRef}
        className="relative z-10 w-full min-h-[120vh] flex flex-col items-center justify-center border-b rounded-b-3xl shadow-md"
        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', opacity: 0 }}
      >

        <Particles
          className="absolute inset-0 z-[1] pointer-events-none"
          quantity={150}
          ease={80}
          color="#3a5878"
          refresh
        />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Neon glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] md:w-[700px] md:h-[280px] rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #3a5878 0%, transparent 70%)' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[120px] md:w-[500px] md:h-[180px] rounded-full blur-[60px] opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #4a4878 0%, transparent 70%)' }}
          />

          {/* GooeyText morphing: futuro → é → liminai */}
          <GooeyText
            texts={["futuro", "é", "limin|ai"]}
            morphTime={2}
            cooldownTime={0.8}
            highlightColor="#3a5878"
            className="h-32 md:h-48 w-[90vw] max-w-4xl flex items-center justify-center"
            textClassName="font-['Orbitron'] font-black text-7xl md:text-9xl lg:text-[10rem]"
          />

          {/* Scroll indicator */}
          <div className="mt-20 flex flex-col items-center">
            <div className="w-[1px] h-32 bg-gradient-to-b from-[var(--color-text-muted)] to-transparent" />
            <p className="text-[var(--color-text-muted)] text-xs tracking-widest uppercase mt-4 animate-pulse">
              scroll
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
