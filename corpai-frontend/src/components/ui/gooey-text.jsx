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
  // Applied the login page neon style: drop-shadow and a subtle text-shadow for intensity
  return `${before}<span style="color:${highlightColor};filter:drop-shadow(0 0 28px rgba(60,100,210,0.9)) drop-shadow(0 0 12px rgba(90,140,230,0.55));text-shadow:0 0 12px rgba(60,100,210,0.6)">${after}</span>`;
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
    let textIndex = 0;
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
        // --- START OF MORPH PHASE ---
        if (morph === 0) {
          const idxCurrent = textIndex % texts.length;
          const idxNext = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.innerHTML = formatText(texts[idxCurrent], highlightColor);
            text2Ref.current.innerHTML = formatText(texts[idxNext], highlightColor);
          }
        }

        morph += dt;
        let fraction = morph / morphTime;

        if (fraction >= 1) {
          // --- END OF MORPH PHASE ---
          morph = 0;
          cooldown = cooldownTime;
          // Move the index forward for the next cycle
          textIndex = (textIndex + 1) % texts.length;
          doCooldown(); // Reset styles to show the 'new' current word (text1)
        } else {
          setMorph(fraction);
        }
      }
    }

    // Initial setup: Show word 0, hide word 1
    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.innerHTML = formatText(texts[0], highlightColor);
      text2Ref.current.innerHTML = formatText(texts[1 % texts.length], highlightColor);
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
