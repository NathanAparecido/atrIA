/**
 * ParticleCanvas — Estacas Verticais com Sombras Projetadas
 *
 * Modelo físico: estacas invisíveis verticais fincadas na tela.
 * O cursor = sol olhando de cima.
 * O que vemos são as SOMBRAS coloridas projetadas:
 *   - Perto do cursor (sol em cima): sombra curta (quase um ponto)
 *   - Longe do cursor: sombra longa, apontando para fora
 * Estacas se repelem/atraem pelo cursor.
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const GRID_SPACING = 22;
const SUN_HEIGHT = 200;          // Altura virtual do "sol" (cursor)
const STAKE_MIN_H = 4;          // Altura mínima da estaca
const STAKE_MAX_H = 12;         // Altura máxima
const MAX_SHADOW_LEN = 18;      // Sombra máxima (px)
const REPEL_RADIUS = 140;       // Raio de repulsão
const REPEL_FORCE = 4;
const SPRING_K = 0.04;
const FRICTION = 0.90;
const SHADOW_WIDTH = 1.8;
const BG_COLOR = '#121212';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#6366f1', '#f43f5e', '#a855f7', '#14b8a6',
];

class Stake {
  constructor(x, y) {
    // Jitter na posição da âncora para quebrar a grade
    const jitter = GRID_SPACING * 0.3;
    this.baseX = x + (Math.random() - 0.5) * jitter;
    this.baseY = y + (Math.random() - 0.5) * jitter;
    this.x = this.baseX;
    this.y = this.baseY;
    this.vx = 0;
    this.vy = 0;

    // Altura da estaca (determina comprimento máximo da sombra)
    this.height = STAKE_MIN_H + Math.random() * (STAKE_MAX_H - STAKE_MIN_H);

    // Cor da sombra
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Opacidade base
    this.alpha = 0.6 + Math.random() * 0.3;
  }

  update(mx, my, mouseActive) {
    if (mouseActive) {
      const dx = mx - this.x;
      const dy = my - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Repulsão: empurrar estacas para fora do cursor
      if (dist < REPEL_RADIUS && dist > 0.5) {
        const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS);
        const forceQ = force * force; // Quadrática para borda definida
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

  draw(ctx, mx, my) {
    // Vetor da estaca para longe do cursor (direção da sombra)
    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Comprimento da sombra = altura_estaca × (distância / altura_sol)
    // Perto do cursor (sol em cima): sombra ≈ 0
    // Longe: sombra cresce
    let shadowLen = this.height * (dist / SUN_HEIGHT);
    shadowLen = Math.min(shadowLen, MAX_SHADOW_LEN);

    // Direção normalizada (aponta para fora do cursor)
    let nx, ny;
    if (dist > 0.5) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      nx = 0;
      ny = 0;
      shadowLen = 0;
    }

    // Ponto da sombra: começa na base da estaca, se estende para fora
    const endX = this.x + nx * shadowLen;
    const endY = this.y + ny * shadowLen;

    // Desenhar a sombra (traço colorido)
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.lineWidth = SHADOW_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Desenhar a "cabeça" da estaca (ponto pequeno mais brilhante)
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = this.alpha * 0.5;
    ctx.fill();

    ctx.globalAlpha = 1;
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
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < stakes.length; i++) {
        stakes[i].update(mx, my, mouseActive);
        stakes[i].draw(ctx, mx, my);
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
