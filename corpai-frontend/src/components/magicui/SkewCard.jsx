/**
 * SkewCard — painel inclinado com glow iridescente, baseado no padrão SkewCards.
 * Usa a paleta do projeto (#c020a8 / #00b8a8 / #5828c8 / #180848).
 *
 * Props:
 *   gradientFrom / gradientTo — cores do degradê (default: magenta → roxo)
 *   title, description, action — conteúdo
 *   onClick — clique no card inteiro
 */

export default function SkewCard({
  title,
  description,
  action,
  gradientFrom = '#c020a8',
  gradientTo   = '#5828c8',
  onClick,
}) {
  const gradient = `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-[300px] h-[360px] m-3 transition-all duration-500 text-left"
    >
      {/* Painel inclinado iridescente */}
      <span
        className="absolute top-0 left-[40px] w-1/2 h-full rounded-lg transition-all duration-500
                   skew-x-[15deg] group-hover:skew-x-0 group-hover:left-[16px] group-hover:w-[calc(100%-72px)]"
        style={{ background: gradient }}
      />
      {/* Mesmo painel com blur — bloom */}
      <span
        className="absolute top-0 left-[40px] w-1/2 h-full rounded-lg blur-[28px] transition-all duration-500
                   skew-x-[15deg] group-hover:skew-x-0 group-hover:left-[16px] group-hover:w-[calc(100%-72px)]
                   opacity-70 group-hover:opacity-90"
        style={{ background: gradient }}
      />

      {/* Conteúdo — fundo/borda usam tokens do tema (legível em dark e light) */}
      <div
        className="relative z-10 left-0 px-8 py-5 rounded-lg shadow-lg transition-all duration-500
                   group-hover:left-[-20px] group-hover:px-8 group-hover:py-12"
        style={{
          background: 'color-mix(in oklab, var(--color-surface) 92%, transparent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          marginTop: '40px',
        }}
      >
        <h3 className="text-xl font-bold mb-2 tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
        {action && (
          <span
            className="inline-block text-xs font-bold px-3 py-2 rounded transition-colors"
            style={{
              background: 'rgba(0,184,168,0.15)',
              color: 'rgba(0,184,168,0.9)',
              border: '1px solid rgba(0,184,168,0.30)',
            }}
          >
            {action}
          </span>
        )}
      </div>
    </button>
  );
}
