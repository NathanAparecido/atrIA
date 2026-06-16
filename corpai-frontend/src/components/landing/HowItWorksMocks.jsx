/**
 * liminai — Mocks visuais para os 7 ExpandingCards do "Como funciona"
 *
 * Visual fictício até as imagens reais chegarem. Tudo CSS puro — produto é
 * air-gapped, placeholder não deve depender de URL externa.
 *
 * Cards 01–03 (a sequência de uso):
 *  - TerminalMock   → "Indexe os documentos" (janela estilo terminal macOS)
 *  - NewChatMock    → "Pergunte em linguagem natural" (tela de conversa nova)
 *  - AnswerMock     → "Receba respostas com contexto" (resposta + citações)
 *
 * Cards 04–07 (o que acontece por baixo — conteúdo real das seções
 * Features/Segurança da própria landing):
 *  - TokenMock      → "O setor vem do token" (token JWT → namespace)
 *  - RolesMock      → "Permissões por papel" (colaborador/líder/admin)
 *  - PerimeterMock  → "Nada sai do perímetro" (lock + nuvem cortada)
 *  - ZeroMock       → "Auditável no código" (stat 0 requisições externas)
 */

import LiminaiOrb from '../LiminaiOrb';

const TEAL    = '#00b8a8';
const PURPLE  = '#5828c8';
const MAGENTA = '#c020a8';

const frame = {
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'rgba(2,6,23,0.85)',
};

/* ── 01 · Terminal estilo macOS ────────────────────────────────────────── */
export function TerminalMock() {
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border" style={{ borderColor: frame.borderColor }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <span className="landing-mono ml-3 text-[10px] text-white/40">liminai — indexação</span>
      </div>
      <pre className="landing-mono p-4 text-[11px] leading-relaxed overflow-x-auto" style={{ background: frame.background }}>
        <code>
          <span className="text-white/50">$ </span>
          <span className="text-white/90">liminai index ./procedimentos/</span>{'\n'}
          <span style={{ color: TEAL }}>✓</span>
          <span className="text-white/75"> NOC_escalacao.pdf</span>
          <span className="text-white/40"> — 42 chunks</span>{'\n'}
          <span style={{ color: TEAL }}>✓</span>
          <span className="text-white/75"> SLA_incidentes.xlsx</span>
          <span className="text-white/40"> — 18 chunks</span>{'\n'}
          <span style={{ color: TEAL }}>✓</span>
          <span className="text-white/75"> plantao_noturno.docx</span>
          <span className="text-white/40"> — 27 chunks</span>{'\n'}
          <span style={{ color: PURPLE }}>→</span>
          <span className="text-white/60"> vetorizado · 100% on-premise</span>
        </code>
      </pre>
    </div>
  );
}

/* ── 02 · Tela de nova conversa do chat (sidebar + saudação + input) ────── */
export function NewChatMock() {
  // linhas fake da sidebar — largura relativa simula títulos de conversa
  const CONVERSAS = [
    { g: 'hoje',  w: '78%' },
    { g: null,    w: '64%' },
    { g: null,    w: '71%' },
    { g: 'ontem', w: '58%' },
    { g: null,    w: '68%' },
  ];
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border flex" style={frame}>
      {/* ── Sidebar (mini) ── */}
      <div
        className="flex flex-col flex-shrink-0 w-[96px] py-3 px-2.5 gap-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* topo: orb + wordmark (sem glow) */}
        <div className="flex items-center gap-1.5">
          <LiminaiOrb size={14} glow={false} />
          <span className="font-['Orbitron'] font-black text-[10px] tracking-tight text-white/85">
            limin<span style={{ color: TEAL }}>ai</span>
          </span>
        </div>

        {/* botão nova conversa */}
        <div
          className="h-5 rounded-md flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${PURPLE} 22%, transparent)`,
            border: `1px solid color-mix(in srgb, ${TEAL} 28%, transparent)`,
          }}
        >
          <span className="text-[8px] text-white/90 font-medium">+ nova</span>
        </div>

        {/* conversas fake agrupadas */}
        <div className="flex flex-col gap-1.5">
          {CONVERSAS.map((c, i) => (
            <div key={i}>
              {c.g && (
                <p className="landing-mono text-[7px] font-bold uppercase tracking-widest mb-1 mt-1 text-white/35">
                  {c.g}
                </p>
              )}
              <div className="h-1.5 rounded-full" style={{ width: c.w, background: 'rgba(255,255,255,0.16)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Área de chat ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-8">
        {/* badge setor — canto sup. esq. p/ não colidir com o "02" do card */}
        <span className="landing-mono absolute top-3 left-4 text-[9px] text-white/35">
          setor: NOC
        </span>

        {/* saudação: orb com glow + título serif (igual à tela real) */}
        <div className="flex items-center gap-2.5 mb-5">
          <LiminaiOrb size={24} glow />
          <span
            className="text-sm font-medium whitespace-nowrap text-white/90"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}
          >
            tereza, já produziu hoje?
          </span>
        </div>

        {/* input de mensagem */}
        <div
          className="w-full rounded-xl px-3 pt-2.5 pb-2 border"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-[10px] mb-3 text-white/40">digite sua mensagem…</p>
          <div className="flex items-center justify-between text-white/35">
            <div className="flex items-center gap-2.5">
              {/* + */}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" /></svg>
              {/* sliders */}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
            </div>
            {/* enviar */}
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${TEAL} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${TEAL} 30%, transparent)` }}
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke={TEAL}><path strokeLinecap="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" /></svg>
            </div>
          </div>
        </div>

        <p className="text-[7px] mt-2.5 text-white/30 text-center">
          liminai pode cometer erros. sempre verifique informações críticas.
        </p>
      </div>
    </div>
  );
}

/* ── 03 · Resposta com citações de fonte ───────────────────────────────── */
export function AnswerMock() {
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border p-4 flex flex-col gap-3" style={frame}>
      <div className="flex flex-col gap-1.5">
        <div className="h-2 rounded-full w-[92%]" style={{ background: 'rgba(255,255,255,0.18)' }} />
        <div className="h-2 rounded-full w-[78%]" style={{ background: 'rgba(255,255,255,0.18)' }} />
        <div className="h-2 rounded-full w-[85%]" style={{ background: 'rgba(255,255,255,0.12)' }} />
      </div>
      <div
        className="rounded-lg px-3 py-2 border text-[10px] landing-mono"
        style={{
          borderColor: `color-mix(in srgb, ${MAGENTA} 30%, transparent)`,
          background: `color-mix(in srgb, ${MAGENTA} 8%, transparent)`,
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        <span style={{ color: MAGENTA }}>fonte:</span> Procedimento de Escalação NOC — turno noturno · p. 12
      </div>
      <div
        className="rounded-lg px-3 py-2 border text-[10px] landing-mono"
        style={{
          borderColor: `color-mix(in srgb, ${TEAL} 30%, transparent)`,
          background: `color-mix(in srgb, ${TEAL} 8%, transparent)`,
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        <span style={{ color: TEAL }}>fonte:</span> SLA_incidentes.xlsx · aba P1
      </div>
    </div>
  );
}

/* ── 04 · Token JWT → namespace do setor ───────────────────────────────── */
export function TokenMock() {
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border p-4 flex flex-col gap-3" style={frame}>
      <div
        className="landing-mono rounded-lg px-3 py-2.5 text-[10px] border break-all"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }}
      >
        <span style={{ color: PURPLE }}>eyJhbGci</span>.<span style={{ color: TEAL }}>{'{ "setor": "noc" }'}</span>.<span className="text-white/30">x9fK…</span>
      </div>
      <div className="flex items-center justify-center text-white/30 text-xs">↓ extraído do token, nunca do request</div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {['noc', 'financeiro', 'rh', 'global'].map((ns, i) => (
          <span
            key={ns}
            className="landing-mono rounded-md px-2 py-1 text-[10px] border"
            style={i === 0
              ? { background: `color-mix(in srgb, ${PURPLE} 18%, transparent)`, color: '#a78bfa', borderColor: `color-mix(in srgb, ${PURPLE} 40%, transparent)` }
              : { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {ns}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 05 · Papéis e permissões ──────────────────────────────────────────── */
export function RolesMock() {
  const ROLES = [
    ['colaborador',    'pergunta na base do próprio setor', TEAL],
    ['gerente', 'sobe e gerencia documentos',        PURPLE],
    ['admin',          'gerencia usuários e setores',       MAGENTA],
  ];
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border p-4 flex flex-col gap-2" style={frame}>
      {ROLES.map(([role, desc, hex]) => (
        <div
          key={role}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: hex, boxShadow: `0 0 8px ${hex}` }}
          />
          <div className="min-w-0">
            <div className="landing-mono text-[10px] text-white/85">{role}</div>
            <div className="text-[10px] text-white/40 truncate">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 06 · Perímetro fechado (air-gapped) ───────────────────────────────── */
export function PerimeterMock() {
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border p-5 flex flex-col items-center gap-4" style={frame}>
      <div
        className="relative w-full rounded-xl border border-dashed py-6 flex flex-col items-center gap-2"
        style={{ borderColor: `color-mix(in srgb, ${TEAL} 40%, transparent)` }}
      >
        <span className="landing-mono absolute -top-2 px-2 text-[9px]" style={{ color: TEAL, background: 'rgba(2,6,23,1)' }}>
          perímetro corporativo
        </span>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
          style={{
            background: `color-mix(in srgb, ${TEAL} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${TEAL} 30%, transparent)`,
            color: TEAL,
          }}
        >
          🔒
        </div>
        <span className="landing-mono text-[9px] text-white/45">ollama · chroma · postgres</span>
      </div>
      <div className="landing-mono flex items-center gap-2 text-[10px] text-white/40">
        <span className="line-through decoration-red-400/70">☁ nuvem</span>
        <span style={{ color: TEAL }}>sem internet em runtime</span>
      </div>
    </div>
  );
}

/* ── 07 · Stat: zero requisições externas ──────────────────────────────── */
export function ZeroMock() {
  return (
    <div className="w-full max-w-[340px] rounded-lg overflow-hidden shadow-2xl border p-6 flex flex-col items-center gap-2" style={frame}>
      <span className="landing-mono text-7xl font-medium leading-none" style={{ color: TEAL }}>
        0
      </span>
      <span className="text-[11px] text-white/55 text-center leading-snug">
        requisições externas em runtime
      </span>
      <span className="landing-mono text-[9px] text-white/30">auditável no código, não em contrato</span>
    </div>
  );
}
