"use client";

import React, { useEffect, useRef, useState } from "react";

function MousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return mousePosition;
}

export function Particles({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  color = "#ffffff",
  colors,          // optional: array of hex strings for iridescent multi-color
  refresh = false,
}) {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const context = useRef(null);
  const circles = useRef([]);
  const mousePosition = MousePosition();
  const mouse = useRef({ x: 0, y: 0 });
  const canvasSize = useRef({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 3;

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    initCanvas();
    animate();
    window.addEventListener("resize", initCanvas);

    return () => {
      window.removeEventListener("resize", initCanvas);
    };
  }, [color]);

  useEffect(() => {
    onMouseMove();
  }, [mousePosition.x, mousePosition.y]);

  useEffect(() => {
    initCanvas();
  }, [refresh]);

  const initCanvas = () => {
    resizeCanvas();
    drawParticles();
  };

  const onMouseMove = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = mousePosition.x - rect.left;
      const y = mousePosition.y - rect.top;
      const inside = x < w && x > 0 && y < h && y > 0;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    }
  };

  const resizeCanvas = () => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      circles.current = [];
      canvasSize.current.w = canvasContainerRef.current.offsetWidth;
      canvasSize.current.h = canvasContainerRef.current.offsetHeight;
      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      context.current.scale(dpr, dpr);
    }
  };

  const circleParams = () => {
    const x = Math.floor(Math.random() * canvasSize.current.w);
    const y = Math.floor(Math.random() * canvasSize.current.h);
    const translateX = 0;
    const translateY = 0;
    const pX = 0;
    const pY = 0;
    const size = Math.floor(Math.random() * 2) + 0.4;
    const alpha = 0;
    const targetAlpha = parseFloat((Math.random() * 0.45 + 0.15).toFixed(2));
    const particleColor = colors && colors.length > 0
      ? colors[Math.floor(Math.random() * colors.length)]
      : color;
    const dx = (Math.random() - 0.5) * 0.1;
    const dy = (Math.random() - 0.5) * 0.1;
    const magnetism = 0.1 + Math.random() * 4;
    return {
      x,
      y,
      translateX,
      translateY,
      pX,
      pY,
      size,
      alpha,
      targetAlpha,
      dx,
      dy,
      magnetism,
      color: particleColor,
    };
  };

  const rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  const drawCircle = (circle, update = false) => {
    if (context.current) {
      const { x, y, translateX, translateY, size, alpha } = circle;
      const { r, g, b } = rgb(circle.color || color);

      context.current.translate(translateX, translateY);

      // Glitter: tight bright core with soft halo
      context.current.shadowBlur = size * 2.5;
      context.current.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.55})`;
      context.current.beginPath();
      context.current.arc(x, y, size * 0.55, 0, 2 * Math.PI);
      context.current.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.6, 1)})`;
      context.current.fill();
      context.current.shadowBlur = 0;

      // Cross glint on larger specks (glitter sparkle)
      if (size > 1) {
        const gl = size * 2.8;
        context.current.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.45})`;
        context.current.lineWidth = 0.4;
        context.current.lineCap = 'round';
        context.current.beginPath();
        context.current.moveTo(x - gl, y);
        context.current.lineTo(x + gl, y);
        context.current.stroke();
        context.current.beginPath();
        context.current.moveTo(x, y - gl);
        context.current.lineTo(x, y + gl);
        context.current.stroke();
      }

      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!update) {
        circles.current.push(circle);
      }
    }
  };

  const clearContext = () => {
    if (context.current) {
      context.current.clearRect(
        0,
        0,
        canvasSize.current.w,
        canvasSize.current.h,
      );
    }
  };

  const drawParticles = () => {
    clearContext();
    const particleCount = quantity;
    for (let i = 0; i < particleCount; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  };

  const remapValue = (
    value,
    start1,
    stop1,
    start2,
    stop2,
  ) => {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  };

  const animate = () => {
    clearContext();
    circles.current.forEach((circle, i) => {
      // Handle the alpha
      const edge = [
        circle.x + circle.translateX - circle.size, // left
        canvasSize.current.w - circle.x - circle.translateX - circle.size, // right
        circle.y + circle.translateY - circle.size, // top
        canvasSize.current.h - circle.y - circle.translateY - circle.size, // bottom
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(
        remapValue(closestEdge, 0, 20, 0, 1).toFixed(2),
      );
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx;
      circle.y += circle.dy;
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) /
        ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) /
        ease;
      // circle should stay within the canvas
      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        // remove the circle from the array
        circles.current.splice(i, 1);
        // add a new circle
        const newCircle = circleParams();
        drawCircle(newCircle);
      } else {
        drawCircle(
          {
            ...circle,
            x: circle.x,
            y: circle.y,
            translateX: circle.translateX,
            translateY: circle.translateY,
            alpha: circle.alpha,
            color: circle.color,
          },
          true,
        );
      }
    });
    window.requestAnimationFrame(animate);
  };

  return (
    <div className={className} ref={canvasContainerRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
