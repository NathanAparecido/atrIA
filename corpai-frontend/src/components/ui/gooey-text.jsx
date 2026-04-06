"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * formatText — if a text entry contains a pipe like "limin|ai",
 * the part after the pipe is wrapped in a colored span.
 */
function formatText(text, highlightColor) {
  const pipeIndex = text.indexOf("|");
  if (pipeIndex === -1) return text;
  const before = text.slice(0, pipeIndex);
  const after = text.slice(pipeIndex + 1);
  return `${before}<span style="color:${highlightColor};filter:drop-shadow(0 0 25px ${highlightColor})">${after}</span>`;
}

function plainText(text) {
  return text.replace("|", "");
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName,
  highlightColor = "#0d00ff"
}) {
  const text1Ref = React.useRef(null);
  const text2Ref = React.useRef(null);

  React.useEffect(() => {
    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;
    let animId;

    // Smooth easing curve for morph transitions
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const setMorph = (fraction) => {
      if (text1Ref.current && text2Ref.current) {
        const easedFraction = easeInOutCubic(Math.min(Math.max(fraction, 0), 1));

        // Text 1 blurs and fades out
        const blur1 = Math.min(8 * easedFraction, 20);
        text1Ref.current.style.filter = `blur(${blur1}px)`;
        text1Ref.current.style.opacity = `${(1 - easedFraction) * 100}%`;

        // Text 2 blurs in and fades in
        const blur2 = Math.min(8 * (1 - easedFraction), 20);
        text2Ref.current.style.filter = `blur(${blur2}px)`;
        text2Ref.current.style.opacity = `${easedFraction * 100}%`;
      }
    };

    const doCooldown = () => {
      if (text1Ref.current && text2Ref.current) {
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "100%";
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "0%";
      }
    };

    function animate() {
      animId = requestAnimationFrame(animate);
      const newTime = new Date();
      const dt = (newTime.getTime() - time.getTime()) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        // We are in morph phase
        morph += dt;
        let fraction = morph / morphTime;

        if (fraction >= 1) {
          // Morph finished, start cooldown
          cooldown = cooldownTime;
          morph = 0;
          textIndex = (textIndex + 1) % texts.length;
          
          if (text1Ref.current && text2Ref.current) {
            const idx1 = textIndex % texts.length;
            const idx2 = (textIndex + 1) % texts.length;
            text1Ref.current.innerHTML = formatText(texts[idx1], highlightColor);
            text2Ref.current.innerHTML = formatText(texts[idx2], highlightColor);
          }
          doCooldown();
        } else {
          setMorph(fraction);
        }
      }
    }

    // Initial setup
    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.innerHTML = formatText(texts[textIndex % texts.length], highlightColor);
      text2Ref.current.innerHTML = formatText(texts[(textIndex + 1) % texts.length], highlightColor);
      doCooldown();
    }

    animate();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [texts, morphTime, cooldownTime, highlightColor]);

  return (
    <div className={cn("relative", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="flex items-center justify-center"
        style={{ filter: "url(#threshold)" }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inline-block select-none text-center",
            textClassName
          )}
          style={{ color: 'var(--foreground)' }}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute inline-block select-none text-center",
            textClassName
          )}
          style={{ color: 'var(--foreground)' }}
        />
      </div>
    </div>
  );
}
