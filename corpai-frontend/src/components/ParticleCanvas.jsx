/**
 * ParticleCanvas — Estacas com Sombras em Pílula + Arco-Íris
 *
 * - Estacas esparsas (grid 45px) — poucas visíveis como na referência
 * - Sombra em formato pílula (lineCap round + largura grossa)
 * - Arco-íris: perto do cursor = vermelho, longe = violeta
 * - Breathing: raio oscila constantemente → atrai/repele dinamicamente
 * - Visibilidade varia com o breathing (às vezes mais, às vezes menos)
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const GRID_SPACING = 45;         // Esparso como na referência
const SUN_HEIGHT = 180;
const STAKE_MIN_H = 3;
const STAKE_MAX_H = 8;
const MAX_SHADOW_LEN = 14;
const REPEL_RADIUS = 160;
const REPEL_FORCE = 3.5;
const SPRING_K = 0.035;
const FRICTION = 0.90;
const PILL_WIDTH = 2.8;          // Largura da pílula
const BG_COLOR = '#121212';

class Stake {
  constructor(x, y) {
    const jitter = GRID_SPACING * 0.4;
    this.baseX = x + (Math.random() - 0.5) * jitter;
    this.baseY = y + (Math.random() - 0.5) * jitter;
    this.x = this.baseX;
    this.y = this.baseY;
    this.vx = 0;
    this.vy = 0;

    this.height = STAKE_MIN_H + Math.random() * (STAKE_MAX_H - STAKE_MIN_H);

    // Fase individual para breathing (desincronizado entre partículas)
    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathSpeed = 0.03 + Math.random() * 0.02;

    // Opacidade base muito baixa (maioria quase invisível)
    this.baseAlpha = 0.05 + Math.random() * 0.15;
  }

  update(mx, my, mouseActive, time) {
    if (mouseActive) {
      const dx = mx - this.x;
      const dy = my - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Breathing: raio oscila ±20% criando atração/repulsão constante
      const breathingRadius = REPEL_RADIUS * (1 + Math.sin(time * this.breathSpeed + this.breathPhase) * 0.2);

      if (dist < breathingRadius && dist > 0.5) {
        const force = ((breathingRadius - dist) / breathingRadius);
        const forceQ = force * force;
        this.vx -= (dx / dist) * forceQ * REPEL_FORCE;
        this.vy -= (dy / dist) * forceQ * REPEL_FORCE;
      }
    }

    // Mola de restauração
    this.vx += (this.baseX - this.x) * SPRING_K;
    this.vy += (this.baseY - this.y) * SPRING_K;

    // Atrito + integração
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, mx, my, time) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Comprimento da sombra (projeção)
    let shadowLen = this.height * (dist / SUN_HEIGHT);
    shadowLen = Math.min(shadowLen, MAX_SHADOW_LEN);

    // Breathing na opacidade: oscila entre mais e menos visível
    const breathAlpha = Math.sin(time * this.breathSpeed + this.breathPhase) * 0.3;
    const alpha = Math.max(0.02, this.baseAlpha + breathAlpha);

    // Pular se quase invisível (performance)
    if (alpha < 0.03 && shadowLen < 1) return;

    // Direção (para fora do cursor)
    let nx = 0, ny = 0;
    if (dist > 0.5) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      shadowLen = 0;
    }

    const endX = this.x + nx * shadowLen;
    const endY = this.y + ny * shadowLen;

    // ── Arco-íris baseado na distância ──
    // Perto do cursor = vermelho (hue 0), longe = violeta (hue 270)
    const t = Math.min(1, dist / 500);
    const hue = t * 270;
    const saturation = 85;
    const lightness = 55 + (1 - t) * 20; // Perto = mais brilhante

    // ── Desenhar sombra em formato pílula ──
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    ctx.lineWidth = PILL_WIDTH;
    ctx.lineCap = 'round'; // Pontas arredondadas = formato pílula
    ctx.stroke();
  }
}

// ─── Componente ────────────────────────────────────────────
export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let stakes = [];
    let W, H;
    let mx = -9999, my = -9999, mouseActive = false;
    let time = 0;
    let raf;

    function initGrid() {
      stakes = [];
      for (let y = GRID_SPACING / 2; y < H; y += GRID_SPACING) {
        for (let x = GRID_SPACING / 2; x < W; x += GRID_SPACING) {
          stakes.push(new Stake(x, y));
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

      for (let i = 0; i < stakes.length; i++) {
        stakes[i].update(mx, my, mouseActive, time);
        stakes[i].draw(ctx, mx, my, time);
      }

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
