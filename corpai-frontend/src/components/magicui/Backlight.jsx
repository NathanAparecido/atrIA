import React from "react";

export function Backlight({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {/* Background glow layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none scale-110">
        <div className="w-full h-full bg-[#0d00ff]/30 dark:bg-[#0d00ff]/20 blur-[100px] rounded-full" />
      </div>
      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
