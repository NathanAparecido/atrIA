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

        {/* Ambient neon aurora — layered radial glows */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Primary center glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full blur-[120px] opacity-30"
            style={{ background: 'radial-gradient(circle, #0d00ff 0%, transparent 70%)' }}
          />
          {/* Secondary offset glow — warm accent */}
          <div
            className="absolute top-[40%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[40vh] rounded-full blur-[100px] opacity-15"
            style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
          />
          {/* Tertiary subtle ambient */}
          <div
            className="absolute top-[60%] left-[35%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[35vh] rounded-full blur-[80px] opacity-10"
            style={{ background: 'radial-gradient(circle, #0066ff 0%, transparent 70%)' }}
          />
        </div>

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
          {/* GooeyText morphing: futuro → é → liminai (with ai in blue neon) */}
          <GooeyText
            texts={["futuro", "é", "limin|ai"]}
            morphTime={1.5}
            cooldownTime={0.5}
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

      {/* Cinematic Footer with Sign In */}
      <CinematicFooter />
    </div>
  );
}
