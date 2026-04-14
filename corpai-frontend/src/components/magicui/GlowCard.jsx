import { useEffect, useRef } from 'react';

/**
 * GlowCard — iridescent metallic border glow that follows the pointer.
 * Blue-dominant palette that sweeps through violet → cyan on mouse move.
 */

const GLOW_STYLES = `
  [data-glow]::before,
  [data-glow]::after {
    pointer-events: none;
    content: "";
    position: absolute;
    inset: calc(var(--border-size) * -1);
    border: var(--border-size) solid transparent;
    border-radius: calc(var(--radius) * 1px);
    background-attachment: fixed;
    background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
    background-repeat: no-repeat;
    background-position: 50% 50%;
    mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    mask-clip: padding-box, border-box;
    mask-composite: intersect;
  }

  /* Iridescent colour sweep — uses pointer-driven --hue */
  [data-glow]::before {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(
        var(--hue, 220)
        calc(var(--saturation, 92) * 1%)
        calc(var(--lightness, 66) * 1%)
        / var(--border-spot-opacity, 1)
      ),
      transparent 100%
    );
    filter: brightness(2.0) saturate(1.1);
  }

  /* Specular white highlight */
  [data-glow]::after {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.4) calc(var(--spotlight-size) * 0.4) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(0 0% 100% / var(--border-light-opacity, 0.45)),
      transparent 100%
    );
  }

  /* Outer diffuse bloom */
  [data-glow] [data-glow] {
    position: absolute;
    inset: 0;
    will-change: filter;
    opacity: var(--outer, 1);
    border-radius: calc(var(--radius) * 1px);
    border-width: calc(var(--border-size) * 20);
    filter: blur(calc(var(--border-size) * 10));
    background: none;
    pointer-events: none;
    border: none;
  }

  [data-glow] > [data-glow]::before {
    inset: -10px;
    border-width: 10px;
  }
`;

export function GlowCard({
  children,
  className = '',
  customSize = false,
  width,
  height,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    const syncPointer = (e) => {
      const { clientX: x, clientY: y } = e;
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--x', x.toFixed(2));
      cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
      cardRef.current.style.setProperty('--y', y.toFixed(2));
      cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
    };

    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  const inlineStyles = {
    // Dark iridescent metal — steel-navy (205°) sweeps 160° through titanium-violet to teal-chrome
    '--base': 205,
    '--spread': 160,
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    '--saturation': 72,
    '--lightness': 48,

    '--radius': 16,
    '--border': 1.5,
    '--size': 240,
    '--outer': 1,
    '--border-size': 'calc(var(--border, 1.5) * 1px)',
    '--spotlight-size': 'calc(var(--size, 240) * 1px)',

    '--bg-spot-opacity': 0.12,
    '--border-spot-opacity': 1,
    '--border-light-opacity': 0.38,

    // Subtle dark metallic surface (respects the background token)
    '--backdrop': 'color-mix(in oklch, var(--background) 88%, hsl(210 45% 10%))',
    '--backup-border': 'color-mix(in oklch, hsl(210 60% 40%) 24%, transparent)',

    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(
        var(--hue, 205)
        calc(var(--saturation, 72) * 1%)
        calc(var(--lightness, 48) * 1%)
        / var(--bg-spot-opacity, 0.12)
      ),
      transparent
    )`,
    backgroundColor: 'var(--backdrop)',
    backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
    backgroundPosition: '50% 50%',
    backgroundAttachment: 'fixed',
    border: 'var(--border-size) solid var(--backup-border)',
    position: 'relative',
    touchAction: 'none',
    ...(width  !== undefined ? { width:  typeof width  === 'number' ? `${width}px`  : width  } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOW_STYLES }} />
      <div
        ref={cardRef}
        data-glow
        style={inlineStyles}
        className={`rounded-2xl relative shadow-[0_1rem_3rem_-1rem_hsl(210_60%_8%)] backdrop-blur-sm ${className}`}
      >
        {/* Diffuse outer bloom layer */}
        <div data-glow />
        {children}
      </div>
    </>
  );
}
