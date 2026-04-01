import React from "react";
import { motion } from "framer-motion";

export function WarpBackground({ children, className = "" }) {
  return (
    <div className={`relative w-full min-h-screen overflow-hidden ${className}`}>
      {/* Perspetive Grid Warp Effect */}
      <div 
        className="absolute inset-0 pointer-events-none select-none z-0"
        style={{ perspective: "1000px" }}
      >
        <motion.div
           className="absolute w-[200%] h-[200%] left-[-50%] top-[-50%] border-t border-l border-[var(--color-border)] opacity-20 dark:opacity-30"
           style={{
             backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
             backgroundSize: "60px 60px",
             transformOrigin: "center 80%",
             rotateX: "75deg",
           }}
           animate={{
              y: ["0px", "60px"]
           }}
           transition={{
              repeat: Infinity,
              duration: 2,
              ease: "linear"
           }}
        />
        {/* Deep fade gradient at the back */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-[var(--color-bg)] h-[60%] top-0 z-0" />
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
