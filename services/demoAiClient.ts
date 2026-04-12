/**
 * Demo AI Client - Routes demo AI calls through /api/demo/generate.
 * No auth required. Strict token limits on server side.
 */

import { ProjectBlueprint, ProjectMemory, OutlineItem, ChapterMode } from '../types';

async function callDemoAI(action: string, params: Record<string, any>): Promise<any> {
  const res = await fetch('/api/demo/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errorData.error || `Demo AI request failed (${res.status})`);
  }

  const data = await res.json();
  return data.result;
}

export const demoAnalyzeTopicAndConfigure = async (
  topic: string,
  type: string,
  genre: string,
): Promise<ProjectBlueprint> => {
  return callDemoAI('analyzeTopicAndConfigure', { topic, type, genre });
};

export const demoGenerateProjectOutline = async (
  blueprint: ProjectBlueprint,
): Promise<{ outline: OutlineItem[]; modes: ChapterMode[] }> => {
  return callDemoAI('generateProjectOutline', { blueprint });
};
