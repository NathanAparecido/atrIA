/**
 * CorpAI / liminai — Wordmark (logotipo em texto).
 *
 * Fonte ÚNICA da marca "liminai": "limin" na cor do texto e "ai" no gradiente
 * da marca (teal → roxo → magenta), recortado no próprio texto.
 *
 * Por que existe: o gradiente do "ai" estava copiado e colado em vários lugares,
 * usando o fundo dos BOTÕES (que termina numa camada escura #180848). Recortado
 * dentro das letras, essa camada escura dominava e o "ai" ficava quase invisível.
 * Aqui ele é um linear-gradient vivo de ponta a ponta, feito para texto.
 *
 * Uso:
 *   <Wordmark />                      // tamanho padrão
 *   <Wordmark className="text-2xl" /> // controla o tamanho pelo className
 */

const GRADIENTE_AI = {
  background: 'linear-gradient(135deg, #00b8a8 0%, #5828c8 50%, #c020a8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function Wordmark({ className = '' }) {
  return (
    <span className={`font-black tracking-tight font-['Orbitron'] ${className}`}>
      limin<span style={GRADIENTE_AI}>ai</span>
    </span>
  );
}
