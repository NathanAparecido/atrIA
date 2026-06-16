/**
 * liminai — BentoMocks
 * Mocks ESTÁTICOS (sem animação) usados no bento grid da landing.
 *
 *  • StaticChatMock — reprodução fiel do ChatMessage real (um "print" da
 *    interface): bolha do usuário com o gradiente iridescente da marca e
 *    bolha da IA com o LiminaiOrb. Sem streaming, sem cursor piscando.
 *  • MonitoringMock — painel de monitoramento do perímetro (serviços
 *    on-premise, todos online). Estático.
 *
 * Tokens e estilos espelham os reais (ChatMessage.jsx / variáveis CSS do app),
 * para que o mock pareça a tela de verdade.
 */

import LiminaiOrb from '../LiminaiOrb';

const TEAL = '#00b8a8';

// Mesmo gradiente da bolha do usuário no ChatMessage real.
const USER_BUBBLE_BG = [
  'radial-gradient(ellipse 210% 80%  at 0%   100%, #c020a8 0%, transparent 48%)',
  'radial-gradient(ellipse 160% 210% at 100% 0%,   #00b8a8 0%, transparent 48%)',
  'radial-gradient(ellipse 155% 135% at 44%  42%,  #5828c8 0%, transparent 52%)',
  'radial-gradient(ellipse 115% 105% at 76%  78%,  #8830d8 0%, transparent 44%)',
  '#180848',
].join(', ');

/* ── Conversa estática, fiel à interface ────────────────────────────── */
export function StaticChatMock() {
  return (
    <div className="flex flex-col gap-3 text-sm w-full">
      {/* Pergunta do usuário — bolha iridescente, alinhada à direita */}
      <div className="flex justify-end">
        <div
          className="max-w-[78%] px-4 py-3"
          style={{
            backgroundImage: USER_BUBBLE_BG,
            backgroundColor: '#180848',
            border: '1px solid rgba(0,184,168,0.22)',
            color: '#ffffff',
            borderRadius: '16px 16px 4px 16px',
          }}
        >
          <p className="text-sm leading-relaxed">Qual o procedimento de escalação do NOC?</p>
        </div>
      </div>

      {/* Resposta da IA — orb + bolha surface, alinhada à esquerda */}
      <div className="flex gap-3 justify-start">
        <LiminaiOrb size={30} glow={false} className="mt-0.5" />
        <div
          className="max-w-[88%] px-4 py-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px 16px 16px 16px',
            color: 'var(--color-text)',
          }}
        >
          <p className="text-sm leading-relaxed">
            Conforme o runbook do NOC: acione o gerente de plantão (ramal 4419),
            abra um incidente P1 no painel e, sem retorno em 15&nbsp;min, escale
            para a diretoria de operações.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Painel de monitoramento do perímetro (estático) ────────────────── */
const SERVICOS = [
  { nome: 'liminai-api', uptime: '99.99%' },
  { nome: 'Grafana', uptime: '100%' },
  { nome: 'Zabbix', uptime: '99.98%' },
  { nome: 'Dify', uptime: '100%' },
];

// Pequena sparkline estática (latência), só decorativa.
const SPARK = [10, 12, 9, 14, 11, 13, 8, 12, 10, 15, 9, 11];

export function MonitoringMock() {
  return (
    <div
      className="w-full rounded-xl p-3 flex flex-col gap-2.5"
      style={{ background: 'color-mix(in srgb, var(--color-surface) 60%, transparent)', border: '1px solid var(--color-border)' }}
    >
      {/* cabeçalho do painel */}
      <div className="flex items-center justify-between">
        <span className="landing-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          monitoramento · perímetro
        </span>
        <span
          className="landing-mono inline-flex items-center gap-1.5 text-[10px] rounded-md px-2 py-0.5"
          style={{ background: `color-mix(in srgb, ${TEAL} 12%, transparent)`, color: TEAL, border: `1px solid color-mix(in srgb, ${TEAL} 25%, transparent)` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
          todos online
        </span>
      </div>

      {/* lista de serviços */}
      <div className="flex flex-col">
        {SERVICOS.map((s) => (
          <div key={s.nome} className="flex items-center justify-between py-1.5 text-[11px]">
            <span className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL, boxShadow: `0 0 6px ${TEAL}` }} />
              {s.nome}
            </span>
            <span className="landing-mono" style={{ color: 'var(--color-text-muted)' }}>{s.uptime}</span>
          </div>
        ))}
      </div>

      {/* sparkline de latência (estática) */}
      <div className="flex items-end gap-0.5 h-8 pt-1">
        {SPARK.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${(h / 15) * 100}%`, background: `color-mix(in srgb, ${TEAL} ${35 + (h / 15) * 45}%, transparent)` }}
          />
        ))}
      </div>
    </div>
  );
}
