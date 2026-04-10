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
import { TorusOrb } from '../components/magicui/TorusOrb';
import ThemeToggle from '../components/ThemeToggle';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const scrollRef      = useRef(0);
  const heroRef        = useRef(null);
  const progressBarRef = useRef(null);
  const torusWrapRef   = useRef(null);

  // ── Lenis smooth scroll + GSAP ticker ────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });

    // Feed Lenis scroll value into scrollRef + progress bar + torus opacity
    lenis.on('scroll', ({ progress }) => {
      scrollRef.current = progress;

      // Progress bar — direct DOM update (no re-render)
      if (progressBarRef.current) {
        progressBarRef.current.style.height = `${progress * 100}%`;
      }

      // Torus: fade out when fully into hero section
      if (torusWrapRef.current) {
        const opacity = progress > 0.85
          ? Math.max(0, 1 - (progress - 0.85) / 0.15)
          : 0.85;
        torusWrapRef.current.style.opacity = opacity;
      }
    });

    // Sync GSAP ScrollTrigger with Lenis
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
          quantity={200}
          ease={60}
          color="#0d00ff"
          refresh
        />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Neon glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] md:w-[700px] md:h-[280px] rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #0d00ff 0%, transparent 70%)' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[120px] md:w-[500px] md:h-[180px] rounded-full blur-[60px] opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #4400ff 0%, transparent 70%)' }}
          />

          {/* GooeyText morphing: futuro → é → liminai */}
          <GooeyText
            texts={["futuro", "é", "limin|ai"]}
            morphTime={2}
            cooldownTime={0.8}
            highlightColor="#0d00ff"
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

      {/* ── Progress indicator — faixa vertical esquerda ─────────────────── */}
      <div
        className="fixed left-5 top-0 z-50 flex flex-col items-center pointer-events-none"
        style={{ height: '100vh' }}
      >
        {/* Track */}
        <div
          className="relative mt-12 rounded-full overflow-hidden"
          style={{ width: 2, height: 'calc(100vh - 6rem)', backgroundColor: 'color-mix(in oklch, var(--foreground) 8%, transparent)' }}
        >
          {/* Fill */}
          <div
            ref={progressBarRef}
            className="absolute top-0 left-0 w-full rounded-full"
            style={{
              height: '0%',
              background: 'linear-gradient(to bottom, #0d00ff, color-mix(in oklch, #0d00ff 40%, transparent))',
              boxShadow: '0 0 6px #0d00ff',
            }}
          />
        </div>
      </div>

      {/* Torus wireframe — flutua fixo no lado direito */}
      <TorusOrb scrollRef={scrollRef} wrapperRef={torusWrapRef} />
    </div>
  );
}
