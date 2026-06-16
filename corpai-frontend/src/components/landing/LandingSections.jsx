/**
 * liminai — Seções de conteúdo da Landing (inspiradas em antigravity.google)
 *
 * Estrutura (na ordem em que o usuário rola):
 *  1. Manifesto   — declaração grande revelada palavra por palavra no scroll.
 *  2. Features    — grid de 3 cards (rag por setor · air-gapped · roles).
 *  3. Segurança   — painel técnico com as garantias reais do produto (#seguranca).
 *  4. Como funciona — 3 passos numerados (é uma sequência real, por isso números).
 *  5. CTA final   — convite + entrar.
 *
 * Conteúdo vem do README do projeto — nada inventado.
 * Estilo: contenção à la Antigravity — superfícies calmas, bordas finas,
 * acentos na tríade da marca (teal/roxo/magenta do ai iridescente).
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useState } from 'react';
import {
  Database, ShieldCheck, Users, FileUp, MessageSquareText,
  Quote, Lock, Server, Network, KeyRound, EyeOff, PlugZap,
  FileText, CloudOff, Files,
} from 'lucide-react';
import { ExpandingCards } from './ExpandingCards';
import {
  TerminalMock, NewChatMock, AnswerMock,
  TokenMock, RolesMock, PerimeterMock, ZeroMock,
} from './HowItWorksMocks';
import { StaticChatMock, MonitoringMock } from './BentoMocks';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Tríade da identidade liminai (mesma do "ai" iridescente) + base
const TEAL    = '#00b8a8';
const PURPLE  = '#5828c8';
const MAGENTA = '#c020a8';
const TRIAD   = [TEAL, PURPLE, MAGENTA];

// chip de ícone colorido por uma cor da tríade
const chip = (hex) => ({
  background: `color-mix(in srgb, ${hex} 12%, transparent)`,
  color: hex,
  border: `1px solid color-mix(in srgb, ${hex} 25%, transparent)`,
});

const STYLES = `
.landing-section {
  position: relative;
  width: 100%;
  padding: clamp(5rem, 12vh, 9rem) 1.5rem;
}
.landing-body {
  font-family: 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', 'Manrope', system-ui, sans-serif;
}
.landing-card-title {
  font-family: 'Space Grotesk', 'Manrope', sans-serif;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.landing-mono {
  font-family: 'Martian Mono', 'JetBrains Mono', monospace;
}
.landing-display {
  font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 300;
  letter-spacing: -0.01em;
  text-transform: none;
}
.landing-display-md {
  font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 400;
  text-transform: none;
}
.landing-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Martian Mono', 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent, #00b8a8);
}
.landing-eyebrow::before {
  content: "";
  width: 22px;
  height: 1px;
  background: var(--accent, #00b8a8);
  opacity: 0.6;
}
.landing-card {
  border-radius: 1.5rem;
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  transition: transform 0.4s cubic-bezier(0.16,1,0.3,1),
              border-color 0.4s ease, box-shadow 0.4s ease;
}
.landing-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent, #00b8a8) 30%, transparent);
  box-shadow: 0 24px 60px -30px color-mix(in srgb, var(--accent, #00b8a8) 35%, transparent);
}
.landing-manifesto-word {
  display: inline-block;
  opacity: 0.12;
  will-change: opacity;
}
.landing-check {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 0.85rem;
  border: 1px solid transparent;
  transition: border-color 0.3s ease, background 0.3s ease;
}
.landing-check:hover {
  border-color: color-mix(in srgb, var(--accent, #00b8a8) 25%, transparent);
  background: color-mix(in srgb, var(--accent, #00b8a8) 10%, transparent);
}
.landing-scrollpath {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
@media (max-width: 767px) {
  .landing-scrollpath { display: none; }
}
/* ── Corrente de bolinhas flutuantes (referência: antigravity.google) ── */
.landing-chain {
  position: relative;
  height: 150px;
  pointer-events: none;
}
.landing-chain-bubble {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-surface) 85%, transparent);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  animation: chain-bob var(--bob-dur, 4s) ease-in-out var(--bob-delay, 0s) infinite alternate;
  will-change: transform;
}
@keyframes chain-bob {
  from { transform: translateY(calc(var(--bob-amp, 8px) * -1)) rotate(-2deg); }
  to   { transform: translateY(var(--bob-amp, 8px)) rotate(2deg); }
}
@media (max-width: 767px) {
  .landing-chain { display: none; }
}

/* ── Bento grid (anatomia Linear: âncora 2x2 + células de apoio) ── */
.landing-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;            /* gap uniforme — regra dos 12-24px */
}
.landing-bento > * { border-radius: 20px; }  /* raio Apple, consistente */
.landing-bento-anchor { grid-column: span 2; grid-row: span 2; }
.landing-bento-wide   { grid-column: span 2; }
@media (max-width: 1023px) {
  .landing-bento { grid-template-columns: 1fr; }
  .landing-bento-anchor, .landing-bento-wide { grid-column: span 1; grid-row: span 1; }
}

/* perímetro do card âncora (air-gapped) */
.landing-perimeter {
  position: relative;
  border: 1.5px dashed color-mix(in srgb, #00b8a8 35%, transparent);
  border-radius: 16px;
}
.landing-pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 1px solid #00b8a8;
  animation: perimeter-pulse 2.6s ease-out infinite;
}
@keyframes perimeter-pulse {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0; }
}

/* mockup de chat */
.landing-mock-cursor {
  display: inline-block;
  width: 2px;
  height: 0.95em;
  vertical-align: text-bottom;
  background: var(--color-text);
  animation: mock-blink 1s steps(1) infinite;
}
@keyframes mock-blink { 50% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .landing-chain-bubble, .landing-pulse-ring { animation: none; }
  .landing-scrollpath { display: none; }
  .landing-card, .landing-check { transition: none; }
}
`;

// ── conteúdo (do README — verdadeiro, não marketing genérico) ───────────────

const SECURITY = [
  { icon: <Server className="size-4" />,   text: 'LLM local nunca exposto externamente (bind 127.0.0.1)' },
  { icon: <KeyRound className="size-4" />, text: 'JWT com expiração configurável e senhas via ambiente' },
  { icon: <EyeOff className="size-4" />,   text: 'Namespace isolado por setor, extraído do JWT — nunca do request' },
  { icon: <Lock className="size-4" />,     text: 'Banco vetorial com autenticação por token' },
  { icon: <Network className="size-4" />,  text: 'Rede Docker isolada entre os serviços' },
  { icon: <PlugZap className="size-4" />,  text: 'Zero dependências externas em runtime' },
];

const HOW_ITEMS = [
  {
    id: 'indexar', number: '01', accent: TEAL,
    icon: <FileUp className="size-5" />,
    title: 'Indexe os documentos',
    description: 'Líderes de setor sobem PDFs, docs e planilhas. O conteúdo é processado e vetorizado dentro do seu servidor.',
    visual: <TerminalMock />,
  },
  {
    id: 'perguntar', number: '02', accent: PURPLE,
    icon: <MessageSquareText className="size-5" />,
    title: 'Pergunte em linguagem natural',
    description: '"Qual o procedimento de escalação do NOC?" — sem decorar pastas, sem Ctrl+F em PDF de 80 páginas.',
    visual: <NewChatMock />,
  },
  {
    id: 'responder', number: '03', accent: MAGENTA,
    icon: <Quote className="size-5" />,
    title: 'Receba respostas com contexto',
    description: 'A resposta vem da sua base, restrita ao que o seu setor pode ver. O conhecimento da empresa, acessível.',
    visual: <AnswerMock />,
  },
  {
    id: 'token', number: '04', accent: PURPLE,
    icon: <KeyRound className="size-5" />,
    title: 'O setor vem do token',
    description: 'O namespace consultado é extraído do token de autenticação — nunca do request. Cada setor enxerga apenas a própria base.',
    visual: <TokenMock />,
  },
  {
    id: 'roles', number: '05', accent: MAGENTA,
    icon: <Users className="size-5" />,
    title: 'Permissões por papel',
    description: 'Colaborador pergunta, gerente sobe e organiza documentos, admin gerencia usuários. Permissões claras, sem exceções.',
    visual: <RolesMock />,
  },
  {
    id: 'perimetro', number: '06', accent: TEAL,
    icon: <ShieldCheck className="size-5" />,
    title: 'Nada sai do perímetro',
    description: 'Os modelos rodam localmente e nunca são expostos à internet. Tudo o que a IA sabe vive — e permanece — dentro do seu servidor.',
    visual: <PerimeterMock />,
  },
  {
    id: 'auditavel', number: '07', accent: TEAL,
    icon: <EyeOff className="size-5" />,
    title: 'Auditável no código',
    description: 'Zero requisições externas em runtime. A garantia está no código que você pode inspecionar, não em uma promessa de contrato.',
    visual: <ZeroMock />,
  },
];

/* ── Corrente de bolinhas flutuantes (antigravity.google) ─────────────────
   Chips circulares dispostos ao longo de um arco, cada um com bob próprio
   (duração/amplitude/delay variados) — parecem soltos, mas seguem a curva. */
const CHAIN = [
  // [Icone, x%, y(px no band), tamanho px, delay s, duração s]
  [FileText,          4, 72, 52, 0.0, 4.2],
  [Files,            12, 48, 60, 0.6, 3.6],
  [Database,         21, 28, 52, 1.1, 4.6],
  [MessageSquareText,30, 14, 64, 0.2, 3.9],
  [Lock,             40,  6, 56, 1.5, 4.4],
  [ShieldCheck,      50,  2, 68, 0.8, 3.4],
  [Server,           60,  6, 56, 1.9, 4.1],
  [KeyRound,         70, 14, 64, 0.4, 4.8],
  [Network,          79, 28, 52, 1.3, 3.7],
  [Users,            88, 48, 60, 0.9, 4.3],
  [FileUp,           96, 72, 52, 1.7, 4.0],
];

function FloatingChain() {
  return (
    <div className="landing-chain max-w-6xl mx-auto" aria-hidden="true" data-reveal>
      {CHAIN.map(([Icon, x, y, size, delay, dur], i) => (
        <div
          key={i}
          className="landing-chain-bubble"
          style={{
            left: `${x}%`,
            top: `${y}px`,
            width: `${size}px`,
            height: `${size}px`,
            '--bob-delay': `${delay}s`,
            '--bob-dur': `${dur}s`,
            '--bob-amp': `${6 + (i % 3) * 3}px`,
          }}
        >
          <Icon style={{ width: size * 0.42, height: size * 0.42 }} />
        </div>
      ))}
    </div>
  );
}

export default function LandingSections() {
  const rootRef = useRef(null);
  const manifestoRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const glowPathRef = useRef(null);
  const ghostPathRef = useRef(null);
  const headRef = useRef(null);
  const lineLenRef = useRef(0);
  const lineProgRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!rootRef.current) return;

    const cleanupFns = [];

    const ctx = gsap.context(() => {
      // Manifesto: cada palavra "acende" conforme o scroll avança (scrub)
      const words = manifestoRef.current?.querySelectorAll('.landing-manifesto-word');
      if (words?.length) {
        gsap.to(words, {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: manifestoRef.current,
            start: 'top 75%',
            end: 'bottom 45%',
            scrub: 1,
          },
        });
      }

      // Linha desenhada no scroll — nasce logo após a seção do typewriter
      // (topo desta cortina de conteúdo) e percorre as seções até o CTA.
      //
      // IMPORTANTE: o path é construído em PIXELS REAIS (medindo o container),
      // sem preserveAspectRatio="none" nem vector-effect. Antes, o stretch do
      // viewBox fazia o navegador medir o dasharray em espaço de tela e o
      // getTotalLength() em unidades do viewBox — o traço "acabava" com ~50%
      // do caminho e a cor sumia no trecho final.
      const path = pathRef.current;
      const glowPath = glowPathRef.current;
      const ghost = ghostPathRef.current;
      const head = headRef.current;
      const svg = svgRef.current;

      // âncoras da curva em frações do container (x, y) — mesma rota de antes
      // Rota recalculada: a linha corre pelas MARGENS nas zonas de cards
      // (bento e passos), cruzando o centro apenas em respiros de texto.
      const ANCHORS = [
        ['M', [0.5, 0]],
        ['C', [0.5, 0.05], [0.9, 0.06], [0.93, 0.13]],
        ['C', [0.96, 0.2], [0.07, 0.21], [0.05, 0.3]],
        ['C', [0.03, 0.39], [0.95, 0.38], [0.95, 0.47]],
        ['C', [0.95, 0.56], [0.05, 0.57], [0.05, 0.66]],
        ['C', [0.05, 0.76], [0.5, 0.77], [0.5, 0.83]],
        ['C', [0.5, 0.89], [0.5, 0.94], [0.5, 0.985]],
      ];

      const applyProgress = () => {
        const len = lineLenRef.current;
        const prog = lineProgRef.current;
        if (!len || !path) return;
        const offset = len * (1 - prog);
        path.style.strokeDashoffset = `${offset}`;
        if (glowPath) glowPath.style.strokeDashoffset = `${offset}`;
        if (head) {
          const pt = path.getPointAtLength(len * prog);
          head.setAttribute('cx', pt.x);
          head.setAttribute('cy', pt.y);
          head.style.opacity = prog > 0.003 ? 1 : 0;
        }
      };

      const buildPath = () => {
        if (!svg || !path || !rootRef.current) return;
        const W = rootRef.current.offsetWidth;
        const H = rootRef.current.offsetHeight;
        if (!W || !H) return;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const d = ANCHORS
          .map(([cmd, ...pts]) =>
            cmd + ' ' + pts.map(([fx, fy]) => `${(fx * W).toFixed(1)},${(fy * H).toFixed(1)}`).join(' ')
          )
          .join(' ');
        [path, glowPath, ghost].forEach((el) => el && el.setAttribute('d', d));
        const len = path.getTotalLength();
        lineLenRef.current = len;
        [path, glowPath].forEach((el) => {
          if (!el) return;
          el.style.strokeDasharray = `${len}`;
        });
        applyProgress(); // reaplica o progresso atual após rebuild/resize
      };

      if (path && svg) {
        buildPath();

        gsap.to(lineProgRef, {
          current: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 80%',     // começa a desenhar assim que a cortina entra
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
          onUpdate: applyProgress,
        });

        // resize/reflow (fontes, imagens, viewport) → reconstrói em px reais
        const ro = new ResizeObserver(() => {
          buildPath();
          ScrollTrigger.refresh();
        });
        ro.observe(rootRef.current);
        cleanupFns.push(() => ro.disconnect());
      }

      // Reveals genéricos: tudo que tiver [data-reveal] sobe e aparece
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' },
          }
        );
      });
    }, rootRef);

    // A altura real da página só estabiliza depois de fontes/recursos
    // carregarem — sem este refresh o ScrollTrigger guarda um "end" antigo
    // e a linha congela/some perto do final da página.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
    const lateRefresh = setTimeout(refresh, 800);

    return () => {
      window.removeEventListener('load', refresh);
      clearTimeout(lateRefresh);
      cleanupFns.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  const manifesto =
    'Uma IA que conhece a sua operação. Treinada nos seus documentos, rodando na sua infraestrutura. Nada — nem uma requisição — sai do seu servidor.';

  return (
    <div
      ref={rootRef}
      className="landing-body relative z-10 w-full"
      style={{
        textTransform: 'none',
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: '1.5rem 1.5rem 0 0',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.45)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Linha desenhada no scroll (nasce após o typewriter/hero) ── */}
      <svg
        ref={svgRef}
        className="landing-scrollpath"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="scrollpath-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={TEAL} />
            <stop offset="20%"  stopColor={PURPLE} />
            <stop offset="40%"  stopColor={MAGENTA} />
            <stop offset="60%"  stopColor={TEAL} />
            <stop offset="80%"  stopColor={PURPLE} />
            <stop offset="100%" stopColor={MAGENTA} />
          </linearGradient>
          <filter id="scrollpath-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* trilho fantasma (rota completa, bem sutil) */}
        <path
          ref={ghostPathRef}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
          opacity="0.35"
        />
        {/* glow por trás do traço principal */}
        <path
          ref={glowPathRef}
          fill="none"
          stroke="url(#scrollpath-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.35"
          filter="url(#scrollpath-blur)"
        />
        {/* traço principal que se desenha */}
        <path
          ref={pathRef}
          fill="none"
          stroke="url(#scrollpath-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* cabeça de luz que segue o desenho */}
        <circle
          ref={headRef}
          r="5"
          fill="#ffffff"
          opacity="0"
          style={{ filter: `drop-shadow(0 0 6px ${TEAL}) drop-shadow(0 0 14px ${MAGENTA})` }}
        />
      </svg>

      {/* ── 1. Manifesto ── */}
      <section className="landing-section" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <span className="landing-eyebrow" style={{ '--accent': TEAL }} data-reveal>Por que existe</span>
          <p
            ref={manifestoRef}
            className="landing-display mt-8 text-3xl md:text-5xl lg:text-6xl leading-[1.18]"
            style={{ color: 'var(--color-text)' }}
          >
            {manifesto.split(' ').map((w, i) => (
              <span key={i} className="landing-manifesto-word">
                {w}&nbsp;
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ── Corrente flutuante (entre manifesto e bento) ── */}
      <FloatingChain />

      {/* ── 2. Features (bento grid, anatomia Linear) ── */}
      <section className="landing-section" style={{ paddingTop: 0, zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <span className="landing-eyebrow" style={{ '--accent': PURPLE }} data-reveal>O produto</span>
          <h2
            className="landing-display-md mt-6 text-2xl md:text-4xl max-w-2xl"
            style={{ color: 'var(--color-text)' }}
            data-reveal
          >
            Conhecimento corporativo, com fronteiras respeitadas
          </h2>

          <div className="landing-bento mt-12">

            {/* ÂNCORA 2x2 — conversa real, estática e fiel à interface */}
            <div
              className="landing-card landing-bento-anchor p-7 flex flex-col"
              style={{ '--accent': PURPLE }}
              data-reveal
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={chip(PURPLE)}>
                  <MessageSquareText className="size-5" />
                </div>
                <div className="landing-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  base do setor noc
                </div>
              </div>

              <h3 className="landing-card-title mt-5 text-xl" style={{ color: 'var(--color-text)' }}>
                Respostas com a fonte do seu setor
              </h3>
              <p className="mt-2 text-sm leading-relaxed max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                Cada resposta nasce da base de conhecimento do próprio setor —
                citável, auditável, sem sair do perímetro.
              </p>

              {/* conversa estática (fiel ao ChatMessage real) */}
              <div className="mt-6 flex-1 flex items-end">
                <StaticChatMock />
              </div>
            </div>

            {/* APOIO — RAG por setor (chips de namespaces) */}
            <div className="landing-card p-6 flex flex-col" style={{ '--accent': PURPLE }} data-reveal>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={chip(PURPLE)}>
                <Database className="size-4" />
              </div>
              <h3 className="landing-card-title mt-4 text-base" style={{ color: 'var(--color-text)' }}>
                RAG por setor
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Namespace isolado, extraído do token — nunca do request.
              </p>
              <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
                {['noc', 'financeiro', 'rh', 'global'].map((ns, i) => (
                  <span
                    key={ns}
                    className="landing-mono rounded-md px-2 py-1 text-[10px]"
                    style={i === 0
                      ? { background: 'color-mix(in srgb, #5828c8 18%, transparent)', color: '#a78bfa', border: '1px solid color-mix(in srgb, #5828c8 40%, transparent)' }
                      : { color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  >
                    {ns}
                  </span>
                ))}
              </div>
            </div>

            {/* APOIO — Controle por roles (chips de papéis) */}
            <div className="landing-card p-6 flex flex-col" style={{ '--accent': MAGENTA }} data-reveal>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={chip(MAGENTA)}>
                <Users className="size-4" />
              </div>
              <h3 className="landing-card-title mt-4 text-base" style={{ color: 'var(--color-text)' }}>
                Controle por roles
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Permissões claras, sem exceções.
              </p>
              <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
                {['colaborador', 'gerente', 'admin'].map((r) => (
                  <span
                    key={r}
                    className="landing-mono rounded-md px-2 py-1 text-[10px]"
                    style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* LARGO — on-premise com painel de monitoramento */}
            <div
              className="landing-card landing-bento-wide p-6 flex flex-col"
              style={{ '--accent': TEAL }}
              data-reveal
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={chip(TEAL)}>
                  <ShieldCheck className="size-4" />
                </div>
                <div className="landing-mono inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  <CloudOff className="size-3.5" />
                  SEM INTERNET EM RUNTIME
                </div>
              </div>
              <h3 className="landing-card-title mt-4 text-base" style={{ color: 'var(--color-text)' }}>
                100% on-premise, air-gapped de verdade
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Tudo roda dentro do seu perímetro — observável em tempo real, nunca exposto.
              </p>
              <div className="mt-4 flex-1 flex items-end">
                <MonitoringMock />
              </div>
            </div>

            {/* STAT — zero requisições externas */}
            <div
              className="landing-card p-6 flex flex-col items-start justify-between"
              style={{ '--accent': TEAL }}
              data-reveal
            >
              <span className="landing-mono text-6xl font-medium leading-none" style={{ color: '#00b8a8' }}>
                0
              </span>
              <p className="mt-3 text-sm leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                requisições externas em runtime. Auditável no código, não em contrato.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. Segurança ── */}
      <section id="seguranca" className="landing-section" style={{ paddingTop: 0, zIndex: 1 }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div data-reveal>
            <span className="landing-eyebrow" style={{ '--accent': MAGENTA }}>Segurança</span>
            <h2
              className="landing-display-md mt-6 text-2xl md:text-4xl"
              style={{ color: 'var(--color-text)' }}
            >
              Desenhado para quem não pode confiar na nuvem
            </h2>
            <p
              className="mt-5 text-base leading-relaxed max-w-md"
              style={{ color: 'var(--color-text-muted)' }}
            >
              O liminai assume o pior cenário por padrão: rede hostil, dados
              sensíveis, auditoria amanhã. Cada garantia abaixo está no código —
              não em uma promessa de contrato.
            </p>
          </div>

          <div
            className="landing-card p-4 md:p-6"
            style={{ background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)' }}
            data-reveal
          >
            <div className="space-y-1">
              {SECURITY.map((s, i) => (
                <div key={s.text} className="landing-check" style={{ '--accent': TRIAD[i % 3] }}>
                  <span className="mt-0.5 shrink-0" style={{ color: TRIAD[i % 3] }}>
                    {s.icon}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Como funciona (sequência real → numeração faz sentido) ── */}
      <section className="landing-section" style={{ paddingTop: 0, zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          <span className="landing-eyebrow" style={{ '--accent': TEAL }} data-reveal>Como funciona</span>
          <div className="mt-10" data-reveal>
            <ExpandingCards
              items={HOW_ITEMS}
              defaultActiveIndex={0}
              className="h-[840px] md:h-[500px]"
            />
          </div>
        </div>
      </section>

      {/* ── 5. CTA final + rodapé ── */}
      <section className="landing-section" style={{ paddingBottom: '3rem', zIndex: 1 }}>
        <div className="max-w-4xl mx-auto text-center" data-reveal>
          <h2
            className="landing-display-md text-3xl md:text-5xl"
            style={{ color: 'var(--color-text)' }}
          >
            Pronto para perguntar?
          </h2>
          <p className="mt-4 text-base" style={{ color: 'var(--color-text-muted)' }}>
            Entre com a sua conta corporativa e converse com a base do seu setor.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-8 inline-flex items-center gap-2 rounded-full font-semibold text-sm px-8 py-3.5 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
            style={{
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              boxShadow: `0 0 0 1px color-mix(in srgb, ${PURPLE} 35%, transparent),
                          0 8px 40px -8px color-mix(in srgb, ${MAGENTA} 45%, transparent),
                          0 -8px 40px -8px color-mix(in srgb, ${TEAL} 45%, transparent)`,
            }}
          >
            Entrar
          </button>
        </div>

        <footer
          className="max-w-6xl mx-auto mt-24 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <span className="font-['Orbitron'] font-black text-sm" style={{ color: 'var(--color-text)' }}>
            liminai
          </span>
          <span>Inteligência artificial corporativa · 100% on-premise</span>
          <span>© {new Date().getFullYear()} — Uso interno corporativo</span>
        </footer>
      </section>
    </div>
  );
}
