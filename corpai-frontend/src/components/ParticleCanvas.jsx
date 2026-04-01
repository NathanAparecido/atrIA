/**
 * ParticleCanvas — Grade Invisível com Revelação por Proximidade
 * 
 * - Partículas ancoradas em grade 25px (invisíveis no repouso)
 * - Mouse repele partículas (esfera de volume 3D)
 * - Partículas revelam com arco-íris baseado em distância:
 *   perto = vermelho, longe = violeta
 * - Retorno elástico (Lei de Hooke) à posição original
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const GRID_SPACING = 25;
const MOUSE_RADIUS = 150;       // Raio de repulsão
const REVEAL_RADIUS = 280;      // Raio de visibilidade (maior que repulsão)
const REPULSION_FORCE = 5;      // Força de empurrão
const SPRING_K = 0.05;          // Constante elástica (retorno)
const FRICTION = 0.92;          // Atrito
const Z_DEPTH = 50;             // Profundidade máxima simulada
const BASE_SIZE = 1.3;          // Tamanho base
const BG_COLOR = '#121212';

class Particle {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.alpha = 0;              // Invisível no repouso
    this.density = 10 + Math.random() * 20;
  }

  update(mx, my, mouseActive) {
    if (mouseActive) {
      const dx = mx - this.x;
      const dy = my - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ── 1. Revelação: partículas perto do mouse ficam visíveis ──
      if (dist < REVEAL_RADIUS) {
        const revealStrength = 1 - (dist / REVEAL_RADIUS);
        // Alpha sobe rápido, baseado na proximidade
        this.alpha += (revealStrength - this.alpha) * 0.12;
      } else {
        // Fora do raio de revelação: desaparecer
        this.alpha *= 0.94;
      }

      // ── 2. Repulsão esférica 3D ──
      if (dist < MOUSE_RADIUS && dist > 0.5) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Empurrar na direção oposta ao mouse
        this.vx -= dirX * force * REPULSION_FORCE;
        this.vy -= dirY * force * REPULSION_FORCE;

        // Efeito 3D: Z aumenta perto do mouse (partículas "saltam")
        this.z += (force * Z_DEPTH - this.z) * 0.15;
      } else {
        // Z volta ao fundo suavemente
        this.z *= 0.9;
      }
    } else {
      // Mouse saiu: tudo desaparece gradualmente
      this.alpha *= 0.95;
      this.z *= 0.9;
    }

    // ── 3. Mola de restauração (Lei de Hooke) ──
    this.vx += (this.baseX - this.x) * SPRING_K;
    this.vy += (this.baseY - this.y) * SPRING_K;

    // ── 4. Atrito + integração ──
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, mx, my) {
    if (this.alpha < 0.01) return; // Não desenhar invisíveis (performance)

    // ── Escala 3D baseada em Z ──
    const scale = 1 + (this.z / Z_DEPTH) * 1.5;
    const size = BASE_SIZE * scale;

    // ── Arco-íris baseado na distância ATUAL ao mouse ──
    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Mapear distância para hue do arco-íris:
    // Perto (0) → Vermelho (hue 0)
    // Longe (REVEAL_RADIUS) → Violeta (hue 270)
    const t = Math.min(1, dist / REVEAL_RADIUS);
    const hue = t * 270;

    // Luminosidade: partículas com Z alto (perto do mouse) brilham mais
    const lightness = 50 + (this.z / Z_DEPTH) * 25;

    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, ${this.alpha})`;
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

    let particles = [];
    let W, H;
    let mx = -9999, my = -9999, mouseActive = false;
    let raf;

    function initGrid() {
      particles = [];
      for (let y = GRID_SPACING / 2; y < H; y += GRID_SPACING) {
        for (let x = GRID_SPACING / 2; x < W; x += GRID_SPACING) {
          particles.push(new Particle(x, y));
        }
      }
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initGrid();
    }

    function onMouseMove(e) {
      mx = e.clientX; my = e.clientY; mouseActive = true;
    }
    function onMouseLeave() { mouseActive = false; }
    function onTouchMove(e) {
      if (e.touches.length) {
        mx = e.touches[0].clientX; my = e.touches[0].clientY; mouseActive = true;
      }
    }
    function onTouchEnd() { mouseActive = false; }

    function animate() {
      // Fundo sólido (esconde partículas inativas)
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      // Additive blending para brilho luminoso
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, mouseActive);
        particles[i].draw(ctx, mx, my);
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
