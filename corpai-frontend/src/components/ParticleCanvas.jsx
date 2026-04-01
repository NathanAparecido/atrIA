/**
 * ParticleCanvas — Versão Final "Antigravity Engineering"
 * Foco: Projeção Radial, Deformação de Volume e Snappiness.
 */

import { useRef, useEffect } from 'react';

// ─── Configuração de Alta Precisão ──────────────────────────
const GRID_SPACING = 38;
const MOUSE_RADIUS = 180;
const SPRING_K = 0.15;
const FRICTION = 0.85;
const MAX_STRETCH = 15;
const PILL_WIDTH = 3.2;
const BG_COLOR = '#101010';

class Stake {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.z = 0;
    this.alpha = 0;

    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathSpeed = 0.04 + Math.random() * 0.02;
  }

  update(mx, my, mouseActive, time) {
    const dx = mx - this.x;
    const dy = my - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 1. Zona de Revelação
    const revealRadius = 450;
    if (mouseActive && dist < revealRadius) {
      const revealPower = 1 - (dist / revealRadius);
      this.alpha += (revealPower - this.alpha) * 0.1; 
    } else {
      this.alpha *= 0.9; 
    }

    // 2. Esfera de Volume (Movimentação Agressiva)
    // Pulse aumentado para 45: faz as partículas da borda "respirarem" muito mais
    const pulse = Math.sin(time * this.breathSpeed + this.breathPhase) * 45;
    const currentRadius = MOUSE_RADIUS + pulse;

    if (mouseActive && dist < currentRadius && dist > 0.1) {
      const force = (currentRadius - dist) / currentRadius;
      
      // Força lateral linear (impacta mais as distantes que a quadrática)
      const lateralForce = force * 15;
      
      // Evita a formação do vácuo no centro (partículas não são expulsas do núcleo)
      const centerProtection = Math.min(1, dist / 60);

      const dirX = dx / dist;
      const dirY = dy / dist;

      this.vx -= dirX * lateralForce * centerProtection;
      this.vy -= dirY * lateralForce * centerProtection;
      
      // Z continua projetando volume
      const zPower = force * force;
      this.z += (zPower * MAX_STRETCH - this.z) * 0.2;
    } else {
      this.z *= 0.85;
    }

    // Mola (Retorno Snappy)
    this.vx += (this.baseX - this.x) * SPRING_K;
    this.vy += (this.baseY - this.y) * SPRING_K;
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, mx, my) {
    if (this.alpha < 0.05) return; 

    const dx = this.x - mx;
    const dy = this.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1; 

    const stretchX = (dx / dist) * this.z;
    const stretchY = (dy / dist) * this.z;

    const endX = this.x + stretchX;
    const endY = this.y + stretchY;

    const thickness = PILL_WIDTH * (0.5 + (this.z / MAX_STRETCH) * 0.5);

    const t = Math.min(1, dist / 600);
    const hue = t * 280;
    const lightness = 45 + (this.z / MAX_STRETCH) * 25;

    // Atenua a renderização no epicentro (mantém "quase invisíveis" embaixo do cursor)
    const centerFade = Math.max(0.2, Math.min(1, dist / 60));
    const finalAlpha = this.alpha * centerFade;

    ctx.beginPath();
    if (this.z < 0.5) {
        ctx.arc(this.x, this.y, thickness / 2, 0, Math.PI * 2);
    } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
    }
    
    ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness}%, ${finalAlpha})`;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    let stakes = [];
    let W, H, raf, time = 0;
    let mx = -999, my = -999, mouseActive = false;

    function init() {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stakes = [];
      for (let y = GRID_SPACING; y < H; y += GRID_SPACING) {
        for (let x = GRID_SPACING; x < W; x += GRID_SPACING) {
          stakes.push(new Stake(x, y));
        }
      }
    }

    function onMove(e) {
      mx = e.clientX || (e.touches && e.touches[0].clientX);
      my = e.clientY || (e.touches && e.touches[0].clientY);
      mouseActive = true;
    }
    function onLeave() { mouseActive = false; }

    function animate() {
      time++;
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < stakes.length; i++) {
        stakes[i].update(mx, my, mouseActive, time);
        stakes[i].draw(ctx, mx, my);
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(animate);
    }

    init();
    window.addEventListener('resize', init);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onLeave);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', init);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 touch-none"
      style={{ zIndex: 0, cursor: 'default' }}
      aria-hidden="true"
    />
  );
}
