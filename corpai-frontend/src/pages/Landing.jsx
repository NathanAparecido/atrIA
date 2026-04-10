/**
 * Liminai — Página Inicial (Landing)
 * Scroll para revelar o CinematicFooter com sign in.
 */

import { useRef, useEffect } from 'react';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { GooeyText } from '@/components/ui/gooey-text';
import { Particles } from '../components/magicui/Particles';
import { TorusOrb } from '../components/magicui/TorusOrb';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  const scrollRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen font-sans selection:bg-white/20 overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* ── Seção 1: CTA — visível ao abrir o site ── */}
      <CinematicFooter />

      {/* ── Seção 2: Hero — revelado no scroll ── */}
      <main className="relative z-10 w-full min-h-[120vh] flex flex-col items-center justify-center border-b rounded-b-3xl shadow-md" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>

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
          {/* Neon glow hugging the text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] md:w-[700px] md:h-[280px] rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #0d00ff 0%, transparent 70%)' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[120px] md:w-[500px] md:h-[180px] rounded-full blur-[60px] opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #4400ff 0%, transparent 70%)' }}
          />

          {/* GooeyText morphing: futuro → é → liminai (with ai in blue neon) */}
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

      {/* Torus wireframe — flutua fixo no lado direito, anima com scroll */}
      <TorusOrb scrollRef={scrollRef} />
    </div>
  );
}
