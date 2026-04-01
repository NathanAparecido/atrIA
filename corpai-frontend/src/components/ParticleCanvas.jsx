/**
 * ParticleCanvas — Efeito de partículas interativas
 * Partículas seguem o cursor com física de atração gravitacional.
 * Usa HTML5 Canvas para alta performance.
 */

import { useRef, useEffect, useCallback } from 'react';

// ─── Configuração ──────────────────────────────────────
const CONFIG = {
  particleCount: 180,
  particleMinSize: 1.2,
  particleMaxSize: 3.5,
  attractionForce: 0.08,
  friction: 0.92,
  driftSpeed: 0.4,
  connectionDistance: 120,
  connectionOpacity: 0.15,
  mouseRadius: 250,
  particleColor: { r: 92, g: 124, b: 250 },   // corpai-500
  particleGlow: { r: 76, g: 110, b: 245 },     // corpai-600
  lineColor: { r: 92, g: 124, b: 250 },        // corpai-500
};

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.baseSize = CONFIG.particleMinSize + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize);
    this.size = this.baseSize;
    this.vx = (Math.random() - 0.5) * CONFIG.driftSpeed;
    this.vy = (Math.random() - 0.5) * CONFIG.driftSpeed;
    this.opacity = 0.3 + Math.random() * 0.5;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.01 + Math.random() * 0.02;
  }

  update(mouseX, mouseY, mouseActive, canvasWidth, canvasHeight) {
    // Pulsação orgânica
    this.pulsePhase += this.pulseSpeed;
    this.size = this.baseSize + Math.sin(this.pulsePhase) * 0.5;

    if (mouseActive) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONFIG.mouseRadius) {
        // Força de atração gravitacional (mais forte perto)
        const force = CONFIG.attractionForce * (1 - dist / CONFIG.mouseRadius);
        const angle = Math.atan2(dy, dx);

        this.vx += Math.cos(angle) * force;
        this.vy += Math.sin(angle) * force;

        // Partículas perto do cursor brilham mais
        this.opacity = Math.min(1, 0.5 + (1 - dist / CONFIG.mouseRadius) * 0.5);
        this.size = this.baseSize + (1 - dist / CONFIG.mouseRadius) * 2;
      } else {
        this.opacity += (0.3 + Math.sin(this.pulsePhase) * 0.15 - this.opacity) * 0.05;
      }
    } else {
      this.opacity += (0.3 + Math.sin(this.pulsePhase) * 0.15 - this.opacity) * 0.05;
    }

    // Fricção para desaceleração suave
    this.vx *= CONFIG.friction;
    this.vy *= CONFIG.friction;

    // Deriva orgânica constante (para nunca ficarem paradas)
    this.vx += (Math.random() - 0.5) * 0.03;
    this.vy += (Math.random() - 0.5) * 0.03;

    // Mover
    this.x += this.vx;
    this.y += this.vy;

    // Wrap-around (teleportar para o outro lado)
    if (this.x < -10) this.x = canvasWidth + 10;
    if (this.x > canvasWidth + 10) this.x = -10;
    if (this.y < -10) this.y = canvasHeight + 10;
    if (this.y > canvasHeight + 10) this.y = -10;
  }

  draw(ctx) {
    const { r, g, b } = CONFIG.particleColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
    ctx.fill();

    // Glow sutil
    if (this.opacity > 0.5) {
      const { r: gr, g: gg, b: gb } = CONFIG.particleGlow;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${this.opacity * 0.1})`;
      ctx.fill();
    }
  }
}

function drawConnections(ctx, particles) {
  const { r, g, b } = CONFIG.lineColor;
  const maxDist = CONFIG.connectionDistance;

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDist) {
        const opacity = CONFIG.connectionOpacity * (1 - dist / maxDist);
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
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
    // Respeitar prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      if (particlesRef.current.length === 0) {
        initParticles(window.innerWidth, window.innerHeight);
      }
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

    function handleTouchEnd() {
      mouseRef.current.active = false;
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);

    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const { x: mx, y: my, active } = mouseRef.current;

      // Update e draw
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, active, w, h);
      }

      drawConnections(ctx, particles);

      for (let i = 0; i < particles.length; i++) {
        particles[i].draw(ctx);
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-auto"
      style={{
        zIndex: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      aria-hidden="true"
    />
  );
}
