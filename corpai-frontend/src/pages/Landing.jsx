/**
 * Liminai — Landing Page
 * Escadaria com corredor de torii (inspirado em Fushimi Inari Taisha).
 * O scroll sobe a escadaria, atravessa o portão e revela o CinematicFooter.
 */

import { useRef, useEffect, useState } from 'react'
import { CinematicFooter } from '@/components/ui/motion-footer'
import { FushimiGate } from '../components/magicui/FushimiGate'
import ThemeToggle from '../components/ThemeToggle'

// Distância de scroll (em px) que cobre a animação completa (≈ 2 alturas de tela)
const ANIM_DISTANCE = () => window.innerHeight * 2

export default function Landing() {
  const scrollRef            = useRef(0)
  const [canvasOpacity,      setCanvasOpacity]      = useState(1)
  const [liminaiOpacity,     setLiminaiOpacity]     = useState(0)
  const [indicatorOpacity,   setIndicatorOpacity]   = useState(1)

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / ANIM_DISTANCE(), 1)
      scrollRef.current = progress

      // Canvas: fica visível até 85%, depois dissolve gradualmente
      setCanvasOpacity(
        progress < 0.85 ? 1 : Math.max(0, 1 - (progress - 0.85) / 0.15)
      )

      // "liminai": aparece ao se aproximar do portão final, some ao atravessar
      const lp =
        progress < 0.60 ? 0 :
        progress < 0.76 ? (progress - 0.60) / 0.16 :
        progress < 0.86 ? 1 :
        Math.max(0, 1 - (progress - 0.86) / 0.12)
      setLiminaiOpacity(lp)

      // Indicador de scroll: some rápido
      setIndicatorOpacity(Math.max(0, 1 - progress * 7))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative w-full" style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* ── Seção principal: cria espaço para o scroll da animação ── */}
      <main className="relative min-h-[300vh] border-b rounded-b-3xl"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent' }}
      >
        {/* Canvas 3D da escadaria / portão */}
        <FushimiGate
          scrollRef={scrollRef}
          style={{ opacity: canvasOpacity, transition: 'opacity 0.4s ease' }}
        />

        {/* Theme toggle */}
        <div className="fixed top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* ── "liminai" — surge ao se aproximar do portão ── */}
        <div
          className="fixed inset-0 z-[15] flex items-center justify-center pointer-events-none"
          style={{ opacity: liminaiOpacity, transition: 'opacity 0.2s ease' }}
        >
          <div className="flex flex-col items-center gap-4">
            <span
              className="font-['Orbitron'] font-black tracking-[0.25em] lowercase select-none"
              style={{
                fontSize: 'clamp(2.4rem, 6.5vw, 5rem)',
                color: 'var(--color-text)',
                textShadow:
                  '0 0 30px rgba(13,0,255,0.85), 0 0 70px rgba(13,0,255,0.35)',
              }}
            >
              limin
              <span
                style={{
                  color: '#0d00ff',
                  textShadow:
                    '0 0 18px #0d00ff, 0 0 50px rgba(13,0,255,0.7)',
                }}
              >
                ai
              </span>
            </span>

            {/* Linha decorativa abaixo */}
            <div
              style={{
                width: '36%',
                height: '1px',
                background:
                  'linear-gradient(to right, transparent, #0d00ff, transparent)',
                opacity: 0.65,
              }}
            />
          </div>
        </div>

        {/* ── Indicador de scroll ── */}
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[15] flex flex-col items-center gap-3 pointer-events-none"
          style={{ opacity: indicatorOpacity, transition: 'opacity 0.3s ease' }}
        >
          <div
            className="w-[1px] h-20 bg-gradient-to-b from-[var(--color-text-muted)] to-transparent"
          />
          <p className="text-[var(--color-text-muted)] text-[10px] tracking-[0.35em] uppercase animate-pulse">
            scroll
          </p>
        </div>
      </main>

      {/* ── Footer cinematográfico (sign in) ── */}
      <CinematicFooter />
    </div>
  )
}
