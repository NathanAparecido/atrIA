/**
 * ParticleCanvas — Clone Técnico Google Antigravity
 * Simulação de Esfera de Volume e Grade 3D Projetada.
 */

import { useRef, useEffect, useCallback } from 'react';

// ─── Configuração Técnica Exata ──────────────────────────
const CONFIG = {
  gridDensity: 25,           // Espaçamento da grade (px)
  mouseRadius: 130,          // Raio da esfera de volume (R_mouse)
  mouseSensitivity: 0.006,   // Força de empuxo da esfera
  springConstant: 0.04,      // Constante elástica (Lei de Hooke)
  friction: 0.88,            // Fricção do ambiente
  depthFactor: 0.005,        // Fator de escala da profundidade Z
  baseSize: 1.8,             // Tamanho base da partícula
  particleColor: '255, 255, 255', // Branco Puro (RGB)
};

class Particle {
  constructor(x, y) {
    // Posição de Equilíbrio (Âncora na Grade)
    this.anchorX = x;
    this.anchorY = y;
    this.anchorZ = 0;

    // Posição Atual
    this.x = x;
    this.y = y;
    this.z = 0;

    // Velocidade
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Flutuação Orgânica (Drift)
    this.driftX = (Math.random() - 0.5) * 0.2;
    this.driftY = (Math.random() - 0.5) * 0.2;
    this.driftZ = (Math.random() - 0.5) * 0.2;
  }

  update(mx, my, mouseActive) {
    if (mouseActive) {
      // 1. Cálculo da Distância 3D Simulada
      const dx = this.x - mx;
      const dy = this.y - my;
      const dz = this.z - 0; // Mouse está em Z=0
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // 2. Física da Esfera de Volume
      if (dist < CONFIG.mouseRadius) {
        // Força F = (D^2 - R^2) * sensibilidade
        // Como D < R, F é negativo (repulsão)
        const force = (dist * dist - CONFIG.mouseRadius * CONFIG.mouseRadius) * CONFIG.mouseSensitivity;
        
        // Vetor de Fuga Normalizado
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        this.vx += nx * force;
        this.vy += ny * force;
        this.vz += nz * force;
      }
    }

    // 3. Mola de Restauração (Lei de Hooke: F = -k * x)
    this.vx += (this.anchorX - this.x) * CONFIG.springConstant;
    this.vy += (this.anchorY - this.y) * CONFIG.springConstant;
    this.vz += (this.anchorZ - this.z) * CONFIG.springConstant;

    // 4. Drift (Flutuação)
    this.vx += this.driftX;
    this.vy += this.driftY;
    this.vz += this.driftZ;

    // 5. Integração e Fricção
    this.vx *= CONFIG.friction;
    this.vy *= CONFIG.friction;
    this.vz *= CONFIG.friction;

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }

  draw(ctx) {
    // 6. Projeção 2D baseada na Profundidade (Perspective)
    const perspective = 1 / (1 + Math.abs(this.z) * CONFIG.depthFactor);
    const size = CONFIG.baseSize * perspective;
    
    // Alpha varia com Z (mais longe/profundo = mais transparente)
    const alpha = Math.max(0.1, 0.8 * perspective);

    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${CONFIG.particleColor}, ${alpha})`;
    ctx.fill();
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const animationRef = useRef(null);

  const initGrid = useCallback((width, height) => {
    const particles = [];
    const step = CONFIG.gridDensity;
    
    // Criar grade estruturada
    for (let x = step / 2; x < width; x += step) {
      for (let y = step / 2; y < height; y += step) {
        particles.push(new Particle(x, y));
      }
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      initGrid(window.innerWidth, window.innerHeight);
    }

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    function animate() {
      // Fundo Deep Dark
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Additive Blending para brilho orgânico nas colisões
      ctx.globalCompositeOperation = 'lighter';

      const { x: mx, y: my, active } = mouseRef.current;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mx, my, active);
        particles[i].draw(ctx);
      }

      // Reset blending para o próximo frame
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 0, cursor: 'default' }}
      aria-hidden="true"
    />
  );
}


