/**
 * ParticleCanvas — Grade Invisível + Sol Radial + Breathing
 *
 * - Grade 25px (invisível no repouso)
 * - Cursor = "Sol": perto é brilhante, longe é sombra
 * - Breathing: raio de repulsão oscila criando vibração viva
 * - Distorção elíptica radial (partículas esticam em direção ao mouse)
 * - Arco-íris por distância + luminosidade pelo Z
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const GRID_SPACING = 25;
const MOUSE_RADIUS = 150;
const REVEAL_RADIUS = 300;
const REPULSION_FORCE = 5;
const SPRING_K = 0.05;
const FRICTION = 0.92;
const Z_DEPTH = 50;
const BASE_SIZE = 1.3;
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
    this.alpha = 0;
    this.density = 10 + Math.random() * 20;
  }

  update(mx, my, mouseActive, time) {
    if (mouseActive) {
      const dx = mx - this.x;
      const dy = my - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ── 1. Revelação por proximidade ──
      if (dist < REVEAL_RADIUS) {
        const revealStrength = 1 - (dist / REVEAL_RADIUS);
        this.alpha += (revealStrength - this.alpha) * 0.12;
      } else {
        this.alpha *= 0.94;
      }

      // ── 2. Repulsão com Breathing (raio oscilante) ──
      const breathingRadius = MOUSE_RADIUS * (1 + Math.sin(time * 0.05 + this.density) * 0.08);

      if (dist < breathingRadius && dist > 0.5) {
        const forceRaw = (breathingRadius - dist) / breathingRadius;
        // Força quadrática para borda mais definida na esfera
        const forceSharp = forceRaw * forceRaw * 1.5;

        const dirX = dx / dist;
        const dirY = dy / dist;

        this.vx -= dirX * forceSharp * REPULSION_FORCE;
        this.vy -= dirY * forceSharp * REPULSION_FORCE;

        // Z: partículas empurradas "saltam" para frente
        this.z += (forceSharp * Z_DEPTH - this.z) * 0.2;
      } else {
        this.z *= 0.9;
      }
    } else {
      this.alpha *= 0.95;
      this.z *= 0.9;
    }

    // ── 3. Mola de restauração ──
    this.vx += (this.baseX - this.x) * SPRING_K;
    this.vy += (this.baseY - this.y) * SPRING_K;

    // ── 4. Atrito + integração ──
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, mx, my) {
    if (this.alpha < 0.01) return;

    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── Escala 3D ──
    const zNorm = this.z / Z_DEPTH;
    const scale = 1 + zNorm * 1.5;
    const size = BASE_SIZE * scale;

    // ── Arco-íris: hue por distância ──
    const t = Math.min(1, dist / REVEAL_RADIUS);
    const hue = t * 270; // perto=vermelho, longe=violeta

    // ── Sol/Sombra: perto do cursor = brilhante, longe = escuro ──
    // Perto (t≈0): lightness alta (80-90%), saturação viva
    // Longe (t≈1): lightness baixa (25-30%), sombra
    const lightness = 85 - t * 58;  // 85% → 27%
    const saturation = 95 - t * 20; // 95% → 75%

    // Boost extra pelo Z (partículas empurradas brilham ainda mais)
    const finalLightness = Math.min(95, lightness + zNorm * 15);

    // ── Distorção elíptica radial ──
    const angleRad = Math.atan2(dy, dx);
    // Alongar na direção radial (eixo que aponta para o mouse)
    const stretch = 1 + zNorm * 0.8;
    const radiusA = size * stretch; // eixo radial (alongado)
    const radiusB = size;           // eixo perpendicular (normal)

    ctx.beginPath();
    ctx.ellipse(this.x, this.y, radiusA, radiusB, angleRad, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${finalLightness}%, ${this.alpha})`;
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
    let time = 0;
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

    function onMouseMove(e) { mx = e.clientX; my = e.clientY; mouseActive = true; }
    function onMouseLeave() { mouseActive = false; }
    function onTouchMove(e) {
      if (e.touches.length) { mx = e.touches[0].clientX; my = e.touches[0].clientY; mouseActive = true; }
    }
    function onTouchEnd() { mouseActive = false; }

    function animate() {
      time++;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, mouseActive, time);
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
