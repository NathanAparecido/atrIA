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
        const easedFraction = easeInOutCubic(Math.min(fraction, 1));

        text2Ref.current.style.filter = `blur(${Math.min(6 / easedFraction - 6, 30)}px)`;
        text2Ref.current.style.opacity = `${Math.pow(easedFraction, 0.4) * 100}%`;

        const inv = 1 - easedFraction;
        text1Ref.current.style.filter = `blur(${Math.min(6 / inv - 6, 30)}px)`;
        text1Ref.current.style.opacity = `${Math.pow(inv, 0.4) * 100}%`;
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "100%";
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0%";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    function animate() {
      animId = requestAnimationFrame(animate);
      const newTime = new Date();
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime.getTime() - time.getTime()) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            const idx1 = textIndex % texts.length;
            const idx2 = (textIndex + 1) % texts.length;
            text1Ref.current.innerHTML = formatText(texts[idx1], highlightColor);
            text2Ref.current.innerHTML = formatText(texts[idx2], highlightColor);
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
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
