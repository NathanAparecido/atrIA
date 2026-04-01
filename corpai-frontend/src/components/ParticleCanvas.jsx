/**
 * ParticleCanvas — Aura de Partículas com Gradiente Arco-Íris
 * Partículas orbitam o cursor com micro-movimentos orgânicos.
 * Cor baseada em distância: perto = vermelho, longe = violeta.
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const PARTICLE_COUNT = 500;
const MAX_RADIUS = 220;      // Raio máximo da aura
const MIN_RADIUS = 15;       // Raio mínimo (não ficam em cima do cursor)
const EASE = 0.06;           // Suavidade do seguimento
const BASE_ALPHA = 0.85;
const BG_COLOR = '#121212';

class Particle {
  constructor() {
    // Distância fixa do cursor (define o "anel" desta partícula)
    this.targetDist = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);

    // Ângulo orbital (gira ao redor do cursor)
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.015;

    // Posição atual (começa fora da tela, vai surgir ao mover o mouse)
    this.x = -999;
    this.y = -999;

    // Tamanho aleatório
    this.size = 1.0 + Math.random() * 2.5;

    // Micro-movimento (jitter orgânico)
    this.jitterPhaseX = Math.random() * Math.PI * 2;
    this.jitterPhaseY = Math.random() * Math.PI * 2;
    this.jitterSpeed = 0.02 + Math.random() * 0.04;
    this.jitterAmp = 2 + Math.random() * 4;

    // Opacidade individual
    this.alpha = 0;

    // Hue calculado pela distância (arco-íris)
    // Perto (0) = vermelho (0°), Longe (1) = violeta (270°)
    const t = (this.targetDist - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
    this.hue = t * 270;
    // Saturação e luminosidade
    this.sat = 85 + Math.random() * 15;  // 85-100%
    this.lit = 55 + Math.random() * 15;  // 55-70%
  }

  update(mx, my, mouseActive, time) {
    // Rotacionar ao redor do cursor
    this.angle += this.rotationSpeed;

    // Posição alvo: ponto orbital ao redor do mouse
    const jitterX = Math.sin(time * this.jitterSpeed + this.jitterPhaseX) * this.jitterAmp;
    const jitterY = Math.cos(time * this.jitterSpeed + this.jitterPhaseY) * this.jitterAmp;

    const targetX = mx + Math.cos(this.angle) * this.targetDist + jitterX;
    const targetY = my + Math.sin(this.angle) * this.targetDist + jitterY;

    // Ease suave em direção ao alvo
    this.x += (targetX - this.x) * EASE;
    this.y += (targetY - this.y) * EASE;

    // Fade in/out baseado no estado do mouse
    if (mouseActive) {
      this.alpha += (BASE_ALPHA - this.alpha) * 0.05;
    } else {
      this.alpha *= 0.96; // Fade out suave
    }
  }

  draw(ctx) {
    if (this.alpha < 0.01) return;

    // Partículas mais distantes são mais transparentes
    const distFactor = 1 - (this.targetDist - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
    const finalAlpha = this.alpha * (0.3 + distFactor * 0.7);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, ${this.sat}%, ${this.lit}%, ${finalAlpha})`;
    ctx.fill();
  }
}

// ─── Componente ────────────────────────────────────────────
export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    // Criar partículas
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    let W, H;
    let mx = -999, my = -999, mouseActive = false;
    let time = 0;
    let raf;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMouseMove(e) {
      mx = e.clientX;
      my = e.clientY;
      mouseActive = true;
    }
    function onMouseLeave() {
      mouseActive = false;
    }
    function onTouchMove(e) {
      if (e.touches.length) {
        mx = e.touches[0].clientX;
        my = e.touches[0].clientY;
        mouseActive = true;
      }
    }
    function onTouchEnd() {
      mouseActive = false;
    }

    function animate() {
      time++;

      // Fundo
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      // Additive blending para brilho nas sobreposições
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, mouseActive, time);
        particles[i].draw(ctx);
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 0, cursor: 'default' }}
      aria-hidden="true"
    />
  );
}
