"use client";

import React from 'react';
import { useDemo } from './DemoContext';
import { Sparkles, X } from 'lucide-react';

interface DemoBannerProps {
  onSignUp: () => void;
  onExitDemo: () => void;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ onSignUp, onExitDemo }) => {
  const { canUseWorkshop, canUseAgent } = useDemo();
  const remaining = (canUseWorkshop ? 1 : 0) + (canUseAgent ? 1 : 0);

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-lg">
      <div className="flex items-center gap-3">
        <Sparkles size={16} className="shrink-0" />
        <span className="font-medium">
          Demo Mode — {remaining > 0 ? `${remaining} workflow${remaining !== 1 ? 's' : ''} remaining` : 'All free trials used'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onSignUp}
          className="bg-white text-primary-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-primary-50 transition-colors"
        >
          Sign Up for Full Access
        </button>
        <button
          onClick={onExitDemo}
          className="text-white/70 hover:text-white transition-colors p-1"
          title="Exit Demo"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
