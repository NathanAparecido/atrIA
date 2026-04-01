/**
 * ParticleCanvas — Clone Técnico Google Antigravity
 * Esfera de Volume 3D, Grade Estruturada, Spatial Hashing.
 */

import { useRef, useEffect, useCallback } from 'react';

// ─── Configuração ──────────────────────────────────────────
const BG_COLOR = '#121212';
const PARTICLE_RGB = '255,255,255';
const GRID_STEP = 25;
const MOUSE_RADIUS = 130;
const MOUSE_SENS = 0.00005;
const SPRING_K = 0.02;
const FRICTION = 0.88;
const DEPTH_FACTOR = 0.004;
const BASE_SIZE = 1.8;
const BASE_ALPHA = 0.7;
const DRIFT_STRENGTH = 0.004;
const HASH_CELL = 170; // ≥ outerRadius (1.3 × 130 = 169px)

// ─── Spatial Hash ──────────────────────────────────────────
class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  clear() {
    this.buckets.clear();
  }

  _key(cx, cy) {
    return (cx * 73856093) ^ (cy * 19349663);
  }

  insert(particle, index) {
    const cx = Math.floor(particle.x / this.cellSize);
    const cy = Math.floor(particle.y / this.cellSize);
    const key = this._key(cx, cy);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(index);
  }

  // Retorna índices de partículas nas 9 células ao redor de (px, py)
  query(px, py) {
    const cx = Math.floor(px / this.cellSize);
    const cy = Math.floor(py / this.cellSize);
    const result = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.buckets.get(this._key(cx + dx, cy + dy));
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            result.push(bucket[i]);
          }
        }
      }
    }
    return result;
  }
}

// ─── Partícula ─────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.anchorX = x;
    this.anchorY = y;
    this.anchorZ = 0;

    this.x = x;
    this.y = y;
    this.z = 0;

    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Drift aleatório e fraco por partícula
    this.driftPhaseX = Math.random() * Math.PI * 2;
    this.driftPhaseY = Math.random() * Math.PI * 2;
    this.driftPhaseZ = Math.random() * Math.PI * 2;
    this.driftSpeed = 0.005 + Math.random() * 0.01;
  }

  applyMouseForce(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const dz = this.z; // Mouse em Z=0
    const distSq = dx * dx + dy * dy + dz * dz;
    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;

    // Aplica força dentro e ligeiramente fora do raio (1.3R)
    const outerRadiusSq = rSq * 1.69; // (1.3R)^2
    if (distSq > outerRadiusSq) return;

    const dist = Math.sqrt(distSq);
    if (dist < 0.5) return; // Evitar divisão por ~0

    // Vetor normalizado (mouse → partícula = direção de fuga)
    const invDist = 1 / dist;
    const nx = dx * invDist;
    const ny = dy * invDist;
    const nz = dz * invDist;

    // F = (D² - R²) * sensibilidade
    // D < R → F negativo → repulsão (empurra para superfície)
    // D ≈ R → F ≈ 0 (equilíbrio na superfície)
    // D > R (perto) → F positivo → atração suave de volta
    const force = (distSq - rSq) * MOUSE_SENS;

    // Aplicar: -force * normal → quando F<0, empurra na direção da normal (para fora)
    this.vx -= nx * force;
    this.vy -= ny * force;
    this.vz -= nz * force;
  }

  update(time) {
    // Mola de Restauração (Lei de Hooke)
    this.vx += (this.anchorX - this.x) * SPRING_K;
    this.vy += (this.anchorY - this.y) * SPRING_K;
    this.vz += (this.anchorZ - this.z) * SPRING_K;

    // Drift orgânico (sinusoidal, muito fraco)
    this.vx += Math.sin(time * this.driftSpeed + this.driftPhaseX) * DRIFT_STRENGTH;
    this.vy += Math.cos(time * this.driftSpeed + this.driftPhaseY) * DRIFT_STRENGTH;
    this.vz += Math.sin(time * this.driftSpeed + this.driftPhaseZ) * DRIFT_STRENGTH * 0.5;

    // Fricção
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.vz *= FRICTION;

    // Integração
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
  }

  draw(ctx) {
    // Projeção perspectiva baseada em Z
    const perspective = 1 / (1 + Math.abs(this.z) * DEPTH_FACTOR);
    const size = BASE_SIZE * perspective;
    const alpha = Math.max(0.08, BASE_ALPHA * perspective);

    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${PARTICLE_RGB},${alpha})`;
    ctx.fill();
  }
}

// ─── Componente ────────────────────────────────────────────
export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    particles: [],
    hash: new SpatialHash(HASH_CELL),
    mouse: { x: -9999, y: -9999, active: false },
    raf: null,
    time: 0,
  });

  const initGrid = useCallback((w, h) => {
    const particles = [];
    for (let x = GRID_STEP / 2; x < w; x += GRID_STEP) {
      for (let y = GRID_STEP / 2; y < h; y += GRID_STEP) {
        particles.push(new Particle(x, y));
      }
    }
    stateRef.current.particles = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const state = stateRef.current;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initGrid(w, h);
    }

    resize();
    window.addEventListener('resize', resize);

    function onMouseMove(e) {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;
      state.mouse.active = true;
    }
    function onMouseLeave() {
      state.mouse.active = false;
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    function animate() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const particles = state.particles;
      const hash = state.hash;
      const { x: mx, y: my, active } = state.mouse;

      state.time++;

      // Limpar com fundo escuro
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      // Additive blending para sobreposição luminosa
      ctx.globalCompositeOperation = 'lighter';

      // Spatial hashing: inserir todas as partículas
      if (active) {
        hash.clear();
        for (let i = 0; i < particles.length; i++) {
          hash.insert(particles[i], i);
        }

        // Aplicar força do mouse apenas nas partículas próximas
        const nearby = hash.query(mx, my);
        for (let i = 0; i < nearby.length; i++) {
          particles[nearby[i]].applyMouseForce(mx, my);
        }
      }

      // Atualizar e desenhar todas
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(state.time);
        particles[i].draw(ctx);
      }

      ctx.globalCompositeOperation = 'source-over';
      state.raf = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      if (state.raf) cancelAnimationFrame(state.raf);
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
