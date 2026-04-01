import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-2xl font-bold tracking-tight text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "" }) {
  return (
    <p className={`text-sm text-white/60 font-medium ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}
