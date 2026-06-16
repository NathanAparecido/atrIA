/**
 * liminai — ExpandingCards (Como funciona)
 *
 * Adaptação JSX do componente TSX original (projeto é .jsx, sem TypeScript):
 *  - Tipos removidos; API mantida (items, defaultActiveIndex).
 *  - `imgSrc` continua suportado, mas cada item também aceita `visual`
 *    (ReactNode) — usado para renderizar mocks (terminal, tela de chat)
 *    em vez de imagem. Se ambos existirem, `visual` vence.
 *  - `number` ("01", "02"…) preservado do design anterior: a seção é uma
 *    sequência real e a numeração comunica isso (decisão registrada no
 *    LandingSections original).
 *  - Cores migradas do shadcn (bg-card etc.) para os tokens da landing
 *    (--color-surface / --color-border / --color-text).
 *  - Desktop: colunas 5fr/1fr. Mobile: linhas 5fr/1fr (acordeão vertical).
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export const ExpandingCards = React.forwardRef(
  ({ className, items, defaultActiveIndex = 0, ...props }, ref) => {
    const [activeIndex, setActiveIndex] = React.useState(defaultActiveIndex);
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
      const handleResize = () => setIsDesktop(window.innerWidth >= 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const gridStyle = React.useMemo(() => {
      if (activeIndex === null) return {};
      const track = items
        .map((_, index) => (index === activeIndex ? '5fr' : '1fr'))
        .join(' ');
      return isDesktop
        ? { gridTemplateColumns: track, gridTemplateRows: '1fr' }
        : { gridTemplateRows: track, gridTemplateColumns: '1fr' };
    }, [activeIndex, items, isDesktop]);

    const handleInteraction = (index) => setActiveIndex(index);

    return (
      <ul
        ref={ref}
        className={cn(
          'w-full max-w-6xl gap-2 grid list-none p-0 m-0',
          'h-[600px] md:h-[500px]',
          'transition-[grid-template-columns,grid-template-rows] duration-500 ease-out',
          className
        )}
        style={gridStyle}
        {...props}
      >
        {items.map((item, index) => {
          const active = activeIndex === index;
          return (
            <li
              key={item.id}
              className={cn(
                'group relative cursor-pointer overflow-hidden rounded-2xl border min-h-0 min-w-0 md:min-w-[80px]'
              )}
              style={{
                borderColor: active
                  ? `color-mix(in srgb, ${item.accent || '#00b8a8'} 35%, transparent)`
                  : 'var(--color-border)',
                background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)',
                transition: 'border-color 0.4s ease',
              }}
              onMouseEnter={() => handleInteraction(index)}
              onFocus={() => handleInteraction(index)}
              onClick={() => handleInteraction(index)}
              tabIndex={0}
              data-active={active}
            >
              {/* ── Camada visual: mock (ReactNode) ou imagem ── */}
              {item.visual ? (
                <div
                  className="absolute inset-0 flex items-center justify-center p-6 pb-36 transition-all duration-300 ease-out"
                  style={{
                    filter: active ? 'grayscale(0)' : 'grayscale(1)',
                    opacity: active ? 1 : 0.35,
                    transform: active ? 'scale(1)' : 'scale(1.08)',
                  }}
                >
                  {item.visual}
                </div>
              ) : (
                <img
                  src={item.imgSrc}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-300 ease-out group-data-[active=true]:scale-100 group-data-[active=true]:grayscale-0 scale-110 grayscale"
                />
              )}

              {/* Gradiente para legibilidade do texto sobre o visual */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

              {/* Número da etapa — canto sup. direito, só quando expandido */}
              {item.number && (
                <span
                  className="landing-mono absolute top-5 right-5 text-sm font-medium opacity-0 transition-opacity duration-300 group-data-[active=true]:opacity-100"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {item.number}
                </span>
              )}

              <article className="absolute inset-0 flex flex-col justify-end gap-2 p-5">
                {/* Título vertical no estado colapsado (desktop) */}
                <h3 className="hidden origin-left rotate-90 whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] text-white/70 opacity-100 transition-all duration-300 ease-out md:block group-data-[active=true]:opacity-0">
                  {item.title}
                </h3>

                <div
                  className="opacity-0 transition-all duration-300 delay-75 ease-out group-data-[active=true]:opacity-100"
                  style={{ color: item.accent || '#00b8a8' }}
                >
                  {item.icon}
                </div>

                <h3 className="landing-card-title text-xl text-white opacity-0 transition-all duration-300 delay-150 ease-out group-data-[active=true]:opacity-100">
                  {item.title}
                </h3>

                <p className="w-full max-w-md text-sm leading-relaxed text-white/80 opacity-0 transition-all duration-300 delay-200 ease-out group-data-[active=true]:opacity-100">
                  {item.description}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    );
  }
);
ExpandingCards.displayName = 'ExpandingCards';
