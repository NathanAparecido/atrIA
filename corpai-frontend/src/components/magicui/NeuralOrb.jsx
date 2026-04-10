"use client";
import { useEffect, useRef } from "react";

// ─── Fibonacci sphere — distribui pontos uniformemente na superfície ──────────
function fibonacciSphere(n, r) {
  const pts = [];
  const gr  = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n);
    const phi   = (2 * Math.PI * i) / gr;
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    pts.push({
      x, y, z,
      ox: x, oy: y, oz: z,          // posição original (para explosão)
      vx: x / r, vy: y / r, vz: z / r, // direção de explosão
      sz: 0.5 + Math.random() * 1.4, // tamanho base variado
    });
  }
  return pts;
}

// ─── Rotação em Y ─────────────────────────────────────────────────────────────
function rotY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { ...p, x: p.x * c + p.z * s, z: -p.x * s + p.z * c };
}

// ─── Rotação em X ─────────────────────────────────────────────────────────────
function rotX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { ...p, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

// ─── Projeção 3D → 2D com perspectiva ────────────────────────────────────────
function project(p, fov, cx, cy) {
  const sc = fov / (fov + p.z);
  return { px: p.x * sc + cx, py: p.y * sc + cy, sc };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function NeuralOrb({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0, cx = 0, cy = 0, radius = 200, fov = 500;

    const state = {
      pts:    [],
      rotX:   0,   rotY:  0,
      tgtX:   0,   tgtY:  0,
      autoY:  0,   autoX: 0,
      mx:     0,   my:    0,
      scroll: 0,
      frame:  0,
      raf:    null,
      // pulsos radiais que emanam do core
      pulses: [],
    };

    // ── Resize ────────────────────────────────────────────────────────────────
    function resize() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cx = W / 2;
      cy = H / 2;
      radius = Math.min(W, H) * 0.295;
      fov    = Math.min(W, H) * 0.72;
      state.pts = fibonacciSphere(260, radius);
    }

    // ── Loop principal ────────────────────────────────────────────────────────
    function draw() {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Rotação automática suave
      state.autoY += 0.0045;
      state.autoX += 0.001;

      // Inclinação por mouse
      state.tgtX = state.autoX + (state.my / H - 0.5) * 1.4;
      state.tgtY = state.autoY + (state.mx / W - 0.5) * 1.4;
      state.rotX += (state.tgtX - state.rotX) * 0.035;
      state.rotY += (state.tgtY - state.rotY) * 0.035;

      // Progresso do scroll → fator de explosão
      const sp = Math.min(state.scroll / (window.innerHeight * 0.7), 1);
      const ef = Math.pow(Math.max(0, sp - 0.04), 1.6);

      // ── Aura externa ─────────────────────────────────────────────────────
      const auraO = (1 - ef) * 0.14;
      if (auraO > 0.005) {
        const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2);
        ag.addColorStop(0,   `rgba(13,0,255,${auraO})`);
        ag.addColorStop(0.5, `rgba(50,0,200,${auraO * 0.45})`);
        ag.addColorStop(1,   "transparent");
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, W, H);
      }

      // ── Transformação dos pontos (com explosão) ───────────────────────────
      const expDist = ef * radius * 3.5;
      const transformed = state.pts.map(p => {
        const tp = {
          ...p,
          x: p.ox + p.vx * expDist,
          y: p.oy + p.vy * expDist,
          z: p.oz + p.vz * expDist,
        };
        return rotX(rotY(tp, state.rotY), state.rotX);
      });

      // Ordenação back→front (Painter's algorithm)
      transformed.sort((a, b) => a.z - b.z);

      // ── Linhas de conexão ─────────────────────────────────────────────────
      const lineAlpha = Math.max(0, 1 - ef * 2.8);
      if (lineAlpha > 0.01) {
        const maxD = radius * 0.62;
        const maxD2 = maxD * maxD;
        for (let i = 0; i < transformed.length; i++) {
          const A = project(transformed[i], fov, cx, cy);
          for (let j = i + 1; j < transformed.length; j++) {
            const dx = transformed[i].x - transformed[j].x;
            const dy = transformed[i].y - transformed[j].y;
            const dz = transformed[i].z - transformed[j].z;
            const d2 = dx*dx + dy*dy + dz*dz;
            if (d2 >= maxD2) continue;
            const d  = Math.sqrt(d2);
            const B  = project(transformed[j], fov, cx, cy);
            const t  = (1 - d / maxD);
            const dz_norm = (transformed[i].z + radius * 1.5) / (radius * 3);
            const a = t * t * 0.45 * lineAlpha;
            ctx.beginPath();
            ctx.moveTo(A.px, A.py);
            ctx.lineTo(B.px, B.py);
            ctx.strokeStyle = `rgba(80,30,255,${a})`;
            ctx.lineWidth   = 0.5 + dz_norm * 0.5;
            ctx.stroke();
          }
        }
      }

      // ── Anéis orbitais decorativos ────────────────────────────────────────
      const ringO = Math.max(0, 1 - ef * 3.5);
      if (ringO > 0.01) {
        [0, Math.PI / 2.2, Math.PI / 1.2].forEach((offset, i) => {
          const angle = state.rotY * 0.35 + offset;
          const scaleYAxis = Math.abs(Math.sin(angle + 0.9)) * 0.22 + 0.03;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, scaleYAxis);
          ctx.beginPath();
          ctx.arc(0, 0, radius * (1.02 + i * 0.17), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(13,0,255,${0.18 * ringO})`;
          ctx.lineWidth   = 1.1;
          ctx.stroke();
          ctx.restore();
        });
      }

      // ── Nós (pontos na esfera) ────────────────────────────────────────────
      const globalNodeO = Math.max(0, 1 - ef * 1.9);
      transformed.forEach(tp => {
        const p     = project(tp, fov, cx, cy);
        const depth = (tp.z + radius * (1 + ef * 3.5)) / (radius * 2 * (1 + ef * 3.5));
        const a     = globalNodeO * (0.18 + depth * 0.82);
        const size  = tp.sz * p.sc * (0.55 + depth * 1.1);
        if (size < 0.1 || a < 0.02) return;

        ctx.shadowBlur  = depth > 0.6 ? 18 : 7;
        ctx.shadowColor = `rgba(100,50,255,${a * 0.65})`;

        const ng = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, size * 3.2);
        ng.addColorStop(0,   `rgba(230,210,255,${a})`);
        ng.addColorStop(0.35,`rgba(90,40,255,${a * 0.85})`);
        ng.addColorStop(1,   "rgba(13,0,255,0)");
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Pulsos radiais (emanam do core periodicamente) ────────────────────
      const coreO = Math.max(0, 1 - ef * 2.8);
      if (coreO > 0.01) {
        // Emite novo pulso a cada ~120 frames
        if (state.frame % 120 === 0) {
          state.pulses.push({ r: 0, a: 0.6 });
        }
        state.pulses = state.pulses.filter(pu => pu.a > 0.01);
        state.pulses.forEach(pu => {
          pu.r += 1.8;
          pu.a *= 0.975;
          ctx.beginPath();
          ctx.arc(cx, cy, pu.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(13,0,255,${pu.a * coreO})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // ── Core plasmático central ───────────────────────────────────────
        const t     = state.frame * 0.028;
        const pulse = 1 + Math.sin(t) * 0.13 + Math.sin(t * 2.7) * 0.05;
        const cr    = 26 * pulse;

        // Halo externo do plasma
        const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 5);
        pg.addColorStop(0,    `rgba(255,255,255,${0.98 * coreO})`);
        pg.addColorStop(0.08, `rgba(210,170,255,${0.85 * coreO})`);
        pg.addColorStop(0.25, `rgba(80,20,255,${0.55 * coreO})`);
        pg.addColorStop(0.55, `rgba(13,0,255,${0.18 * coreO})`);
        pg.addColorStop(1,    "transparent");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 5, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo branco brilhante
        ctx.shadowBlur  = 40;
        ctx.shadowColor = "rgba(200,160,255,0.95)";
        ctx.fillStyle   = `rgba(255,255,255,${coreO})`;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Cruzeta de luz (+) no core
        const arm = cr * 1.8;
        ctx.save();
        ctx.globalAlpha = 0.25 * coreO;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm); ctx.stroke();
        ctx.restore();
      }

      state.frame++;
      state.raf = requestAnimationFrame(draw);
    }

    // ── Observers & listeners ─────────────────────────────────────────────────
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onMouse  = e => { state.mx = e.clientX; state.my = e.clientY; };
    const onScroll = () => { state.scroll = window.scrollY; };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll",    onScroll);
    state.raf = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll",    onScroll);
      if (state.raf) cancelAnimationFrame(state.raf);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
