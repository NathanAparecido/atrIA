/**
 * ParticleCanvas — Efeito "Swarm" (Enxame) Antigravity
 * 1000+ partículas com cores variadas que orbitam o cursor em nuvem.
 * Alta performance via Canvas.
 */

import { useRef, useEffect, useCallback } from 'react';

// ─── Configuração ──────────────────────────────────────
const CONFIG = {
  particleCount: 1000,
  particleMinSize: 0.8,
  particleMaxSize: 2.2,
  friction: 0.94,
  ease: 0.1,
  mouseRadius: 350,
  palette: [
    { r: 239, g: 68, b: 68 },   // Vermelho (red-500)
    { r: 59, g: 130, b: 246 },  // Azul (blue-500)
    { r: 168, g: 85, b: 247 },  // Roxo (purple-500)
    { r: 236, g: 72, b: 153 },  // Rosa (fuchsia-500)
  ]
};

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.baseSize = CONFIG.particleMinSize + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize);
    this.size = this.baseSize;
    
    // Cada partícula tem um "offset" único para orbitar o mouse de forma dispersa
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * CONFIG.mouseRadius;
    this.offsetX = Math.cos(angle) * distance;
    this.offsetY = Math.sin(angle) * distance;
    
    // Velocidade e inércia
    this.vx = 0;
    this.vy = 0;
    
    // Escolher cor da paleta
    this.color = CONFIG.palette[Math.floor(Math.random() * CONFIG.palette.length)];
    this.opacity = 0.2 + Math.random() * 0.6;
    
    // Movimento independente (deriva)
    this.driftX = (Math.random() - 0.5) * 0.5;
    this.driftY = (Math.random() - 0.5) * 0.5;
  }

  update(mouseX, mouseY, mouseActive, canvasWidth, canvasHeight) {
    if (mouseActive) {
      // Alvo é o mouse + o offset único da partícula (para não amontoar)
      const targetX = mouseX + this.offsetX;
      const targetY = mouseY + this.offsetY;
      
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      
      this.vx += dx * 0.05;
      this.vy += dy * 0.05;
      
      // Mais brilho perto do movimento
      this.opacity = Math.min(0.9, this.opacity + 0.02);
    } else {
      // Deriva orgânica quando o mouse está longe
      this.vx += this.driftX;
      this.vy += this.driftY;
      this.opacity = Math.max(0.3, this.opacity - 0.01);
    }

    // Física
    this.vx *= CONFIG.friction;
    this.vy *= CONFIG.friction;
    this.x += this.vx;
    this.y += this.vy;

    // Wrap-around ultra-suave
    const padding = 50;
    if (this.x < -padding) this.x = canvasWidth + padding;
    if (this.x > canvasWidth + padding) this.x = -padding;
    if (this.y < -padding) this.y = canvasHeight + padding;
    if (this.y > canvasHeight + padding) this.y = -padding;
  }

  draw(ctx) {
    const { r, g, b } = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
    ctx.fill();
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const animationRef = useRef(null);

  const initParticles = useCallback((width, height) => {
    particlesRef.current = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particlesRef.current.push(new Particle(width, height));
    }
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      initParticles(window.innerWidth, window.innerHeight);
    }

    resize();
    window.addEventListener('resize', resize);

    function handleMouseMove(e) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    }

    function handleMouseLeave() {
      mouseRef.current.active = false;
    }

    function handleTouchMove(e) {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
        mouseRef.current.active = true;
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Limpar rastro sutil (motion blur opcional)
      ctx.clearRect(0, 0, w, h);

      const { x: mx, y: my, active } = mouseRef.current;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, active, w, h);
        particles[i].draw(ctx);
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{
        zIndex: 0,
        background: 'transparent',
      }}
      aria-hidden="true"
    />
  );
}

