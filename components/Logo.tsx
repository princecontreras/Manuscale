
"use client";
import React from 'react';

export const Logo: React.FC<{ className?: string, light?: boolean }> = ({ className = "", light = false }) => (
  <div className={`flex items-baseline select-none tracking-tight ${className}`}>
    <span className={`font-serif italic font-bold text-2xl ${light ? 'text-primary-400' : 'text-primary-600'}`}>
      Typo
    </span>
    <span className={`font-sans font-black text-2xl tracking-tighter ${light ? 'text-primary-300' : 'text-primary-700'}`}>
      scale
    </span>
    <span className={`text-3xl leading-none ml-0.5 ${light ? 'text-primary-400' : 'text-primary-600'}`}>.</span>
  </div>
);
