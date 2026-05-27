"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DemoSession } from '../types';
import { setDemoMode as setAiDemoMode } from '../services/aiClient';

const DEMO_SESSION_KEY = 'typoscale_demo_session';
const DEMO_COMPLETED_KEY = 'typoscale_demo_completed';

interface DemoContextType {
  isDemoMode: boolean;
  demoSession: DemoSession | null;
  canUseWorkshop: boolean;
  canUseAgent: boolean;
  markWorkshopUsed: () => void;
  markAgentUsed: () => void;
  startDemo: () => boolean;
  exitDemo: () => void;
  hasUsedDemoBefore: boolean;
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  demoSession: null,
  canUseWorkshop: false,
  canUseAgent: false,
  markWorkshopUsed: () => {},
  markAgentUsed: () => {},
  startDemo: () => false,
  exitDemo: () => {},
  hasUsedDemoBefore: false,
});

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [hasUsedDemoBefore, setHasUsedDemoBefore] = useState(false);

  // Restore demo session and check if demo was ever used
  useEffect(() => {
    try {
      const completed = localStorage.getItem(DEMO_COMPLETED_KEY);
      if (completed) setHasUsedDemoBefore(true);

      const stored = localStorage.getItem(DEMO_SESSION_KEY);
      if (stored) {
        const session: DemoSession = JSON.parse(stored);
        if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
          setDemoSession(session);
          setAiDemoMode(true);
        } else {
          localStorage.removeItem(DEMO_SESSION_KEY);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const startDemo = useCallback((): boolean => {
    if (localStorage.getItem(DEMO_COMPLETED_KEY)) {
      setHasUsedDemoBefore(true);
      return false;
    }
    const session: DemoSession = {
      workshopUsed: false,
      agentUsed: false,
      createdAt: Date.now(),
    };
    setDemoSession(session);
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(DEMO_COMPLETED_KEY, 'true');
    setHasUsedDemoBefore(true);
    setAiDemoMode(true);
    return true;
  }, []);

  const exitDemo = useCallback(() => {
    setDemoSession(null);
    localStorage.removeItem(DEMO_SESSION_KEY);
    setAiDemoMode(false);
  }, []);

  const markWorkshopUsed = useCallback(() => {
    setDemoSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, workshopUsed: true };
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAgentUsed = useCallback(() => {
    setDemoSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, agentUsed: true };
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isDemoMode = demoSession !== null;
  const canUseWorkshop = isDemoMode && !demoSession!.workshopUsed;
  const canUseAgent = isDemoMode && !demoSession!.agentUsed;

  return (
    <DemoContext.Provider value={{
      isDemoMode,
      demoSession,
      canUseWorkshop,
      canUseAgent,
      markWorkshopUsed,
      markAgentUsed,
      startDemo,
      exitDemo,
      hasUsedDemoBefore,
    }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
