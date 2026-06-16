/**
 * liminai — LiminaiOrb (v2)
 * O orb da seção "Como Funciona" da landing (NewChatMock), promovido a
 * componente único da identidade da IA.
 *
 * v2 — glow reimplementado com a MESMA técnica dos cards da landing
 * (SkewCard): uma réplica do próprio gradiente atrás do elemento, com
 * blur — o brilho carrega as cores do gradiente (magenta/teal/roxo),
 * não uma cor única. O boxShadow teal da v1 foi substituído.
 *
 * Paleta iridescente do projeto: #c020a8 / #00b8a8 / #5828c8 / #180848.
 * Gradiente idêntico ao orb do NewChatMock — não alterar os stops aqui
 * sem alterar lá (ideal: a landing importar ESTE componente).
 *
 * Props:
 *   size      px (default 32)
 *   glow      bloom iridescente atrás do orb (default true)
 *   className classes extras no wrapper
 */

const MAGENTA = '#c020a8';
const TEAL    = '#00b8a8';
const PURPLE  = '#5828c8';

const ORB_BG = [
  `radial-gradient(ellipse 190% 65% at 8% 92%, ${MAGENTA} 0%, transparent 48%)`,
  `radial-gradient(ellipse 110% 190% at 92% 8%, ${TEAL} 0%, transparent 48%)`,
  `radial-gradient(ellipse 130% 110% at 38% 42%, ${PURPLE} 0%, transparent 52%)`,
  '#180848',
].join(', ');

export default function LiminaiOrb({ size = 32, glow = true, className = '' }) {
  // blur proporcional: orb de 40px → ~14px de blur (mesma sensação do
  // blur-[28px] que os cards usam em painéis ~10x maiores)
  const blur = Math.max(6, Math.round(size * 0.35));

  return (
    <div
      aria-hidden
      className={`relative select-none flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Bloom — réplica borrada do gradiente, técnica do SkewCard */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: ORB_BG,
            filter: `blur(${blur}px)`,
            opacity: 0.75,
            transform: 'scale(1.15)',
          }}
        />
      )}

      {/* Orb */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: ORB_BG }}
      />
    </div>
  );
}
