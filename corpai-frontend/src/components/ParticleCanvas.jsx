/**
 * ParticleCanvas — Confete de Estacas Coloridas + Iluminação por Cursor
 *
 * - Pequenos traços/linhas (estacas) espalhados pela tela
 * - Cores variadas (confete colorido)
 * - Invisíveis/sutis normalmente
 * - Cursor age como "lanterna": ilumina e revela os traços próximos
 * - Micro-movimentos orgânicos
 */

import { useRef, useEffect } from 'react';

// ─── Configuração ──────────────────────────────────────────
const STICK_COUNT = 600;
const REVEAL_RADIUS = 350;       // Raio da "lanterna"
const STICK_MIN_LEN = 3;
const STICK_MAX_LEN = 10;
const STICK_WIDTH = 1.5;
const DRIFT_SPEED = 0.008;
const BG_COLOR = '#121212';

// Paleta de cores do confete (como na imagem do Antigravity)
const COLORS = [
  '#ef4444', // vermelho
  '#f97316', // laranja
  '#eab308', // amarelo
  '#22c55e', // verde
  '#3b82f6', // azul
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#6366f1', // índigo
  '#f43f5e', // rosa-vermelho
];

class Stick {
  constructor(canvasW, canvasH) {
    // Posição aleatória pela tela toda
    this.x = Math.random() * canvasW;
    this.y = Math.random() * canvasH;

    // Ângulo do traço (rotação)
    this.angle = Math.random() * Math.PI * 2;

    // Comprimento da estaca
    this.length = STICK_MIN_LEN + Math.random() * (STICK_MAX_LEN - STICK_MIN_LEN);

    // Cor aleatória
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Opacidade base (quase invisível)
    this.baseAlpha = 0.04 + Math.random() * 0.06; // 4-10% — muito sutil
    this.alpha = this.baseAlpha;

    // Micro-movimento (drift orgânico)
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftAmp = 0.3 + Math.random() * 0.5;
    this.driftSpeed = DRIFT_SPEED + Math.random() * 0.005;

    // Rotação lenta
    this.rotSpeed = (Math.random() - 0.5) * 0.003;
  }

  update(mx, my, mouseActive, time) {
    // Micro-movimento orgânico
    this.x += Math.sin(time * this.driftSpeed + this.driftPhase) * this.driftAmp * 0.1;
    this.y += Math.cos(time * this.driftSpeed + this.driftPhase + 1.5) * this.driftAmp * 0.1;

    // Rotação lenta constante
    this.angle += this.rotSpeed;

    if (mouseActive) {
      const dx = this.x - mx;
      const dy = this.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REVEAL_RADIUS) {
        // Iluminação: quanto mais perto do cursor, mais visível
        const proximity = 1 - (dist / REVEAL_RADIUS);
        // Quadrática para luz mais concentrada no centro
        const intensity = proximity * proximity;
        const targetAlpha = this.baseAlpha + intensity * 0.9;
        this.alpha += (targetAlpha - this.alpha) * 0.15;
      } else {
        // Fora da lanterna: voltar ao quase invisível
        this.alpha += (this.baseAlpha - this.alpha) * 0.05;
      }
    } else {
      this.alpha += (this.baseAlpha - this.alpha) * 0.05;
    }
  }

  draw(ctx) {
    if (this.alpha < 0.01) return;

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const halfLen = this.length / 2;

    const x1 = this.x - cos * halfLen;
    const y1 = this.y - sin * halfLen;
    const x2 = this.x + cos * halfLen;
    const y2 = this.y + sin * halfLen;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.lineWidth = STICK_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();
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

    let sticks = [];
    let W, H;
    let mx = -9999, my = -9999, mouseActive = false;
    let time = 0;
    let raf;

    function init() {
      sticks = [];
      for (let i = 0; i < STICK_COUNT; i++) {
        sticks.push(new Stick(W, H));
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
      init();
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

      for (let i = 0; i < sticks.length; i++) {
        sticks[i].update(mx, my, mouseActive, time);
        sticks[i].draw(ctx);
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
