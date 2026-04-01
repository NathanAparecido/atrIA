import React from "react";

export function Backlight({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {/* Background glow layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none scale-105">
        <div className="w-full h-full bg-purple-600/40 dark:bg-purple-900/40 blur-[80px] rounded-full" />
      </div>
      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
