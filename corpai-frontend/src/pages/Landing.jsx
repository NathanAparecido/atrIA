/**
 * CorpAI — Página Inicial (Landing)
 * Scroll para revelar o CinematicFooter com sign in.
 */

import { CinematicFooter } from '@/components/ui/motion-footer';
import { Particles } from '../components/magicui/Particles';
import { TextAnimate } from '../components/magicui/TextAnimate';
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
          color="#8b5cf6"
          refresh
        />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8 font-['Orbitron'] text-7xl md:text-9xl font-black flex tracking-tighter">
            <TextAnimate animation="blurInUp" by="character" once delayOffset={0} className="text-[var(--color-text)]">
              atr
            </TextAnimate>
            <TextAnimate animation="blurInUp" by="character" once delayOffset={0.3} className="text-[#8b5cf6] drop-shadow-[0_0_25px_rgba(139,92,246,0.8)]">
              IA
            </TextAnimate>
          </div>

          <p className="text-[var(--color-text-muted)] text-sm md:text-base tracking-widest uppercase mb-12">
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
