/**
 * Liminai — Página Inicial (Landing)
 * Scroll para revelar o CinematicFooter com sign in.
 */

import { CinematicFooter } from '@/components/ui/motion-footer';
import { GooeyText } from '@/components/ui/gooey-text';
import { Particles } from '../components/magicui/Particles';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  return (
    <div className="relative w-full min-h-screen font-sans selection:bg-white/20 overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* Main content — scroll down to reveal footer */}
      <main className="relative z-10 w-full min-h-[120vh] flex flex-col items-center justify-center border-b rounded-b-3xl shadow-md" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>

        <Particles
          className="absolute inset-0 z-0 pointer-events-none"
          quantity={150}
          ease={80}
          color="#0d00ff"
          refresh
        />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* GooeyText morphing: futuro / é / liminai */}
          <GooeyText
            texts={["futuro", "é", "liminai"]}
            morphTime={1.5}
            cooldownTime={0.5}
            className="h-24 md:h-32 w-[90vw] max-w-2xl"
            textClassName="font-['Orbitron'] font-black"
          />

          <p className="text-[var(--color-text-muted)] text-sm md:text-base tracking-widest uppercase mt-16 mb-12">
            inteligência artificial corporativa
          </p>

          {/* Scroll indicator */}
          <div className="w-[1px] h-32 bg-gradient-to-b from-[var(--color-text-muted)] to-transparent" />
          <p className="text-[var(--color-text-muted)] text-xs tracking-widest uppercase mt-4 animate-pulse">
            scroll
          </p>
        </div>
      </main>

      {/* Cinematic Footer with Sign In */}
      <CinematicFooter />
    </div>
  );
}
