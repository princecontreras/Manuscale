/**
 * AI Client Proxy - All AI calls route through /api/ai server endpoints.
 * This keeps API keys server-side only.
 */

import { getAuth } from 'firebase/auth';
import { ProjectBlueprint, ProjectMemory, OutlineItem, NarrativeProfile, MarketingAssets, AgentRole, DirectorDirective, ChapterMode } from '../types';

// --- Shared utilities (client-safe, no API key needed) ---

export const generateCopyright = (authorName: string): string => {
  const year = new Date().getFullYear();
  return `© ${year} ${authorName}. All rights reserved.\n\nNo part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher.`;
};

export const calibrateStyleFromSample = (_sample: string, _signal?: AbortSignal) => {
  return { voice: "Professional" };
};

// Client-safe relevance matching (no AI)
export const getRelevantContext = async (
  beat: string,
  memory: ProjectMemory,
  _signal?: AbortSignal
): Promise<any[]> => {
  const keywords = beat.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const allItems = [
    ...memory.research,
    ...memory.keyFigures,
    ...memory.concepts,
    ...memory.glossary
  ];
  return allItems
    .filter(item => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    })
    .slice(0, 8);
};



// --- Core API call helper ---

// Module-level demo mode flag — set by DemoContext
let _isDemoMode = false;
export function setDemoMode(value: boolean) { _isDemoMode = value; }

async function getIdToken(): Promise<string | null> {
  try {
    const user = getAuth().currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}

async function callAI(action: string, params: Record<string, any>, signal?: AbortSignal): Promise<any> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('Request cancelled.');

    const token = _isDemoMode ? null : await getIdToken();
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, params, ...(_isDemoMode ? { demoMode: true } : {}) }),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      return data.result;
    }

    const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}`, retryable: false }));
    const isRetryable = errorData.retryable || res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504;

    if (isRetryable && attempt < maxRetries - 1) {
      // Respect Retry-After header (in seconds) from 429 responses; otherwise exponential backoff
      const retryAfterHeader = res.headers.get('Retry-After');
      const delay = retryAfterHeader
        ? parseInt(retryAfterHeader) * 1000
        : 3000 * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    lastError = new Error(errorData.error || `AI request failed (${res.status})`);
  }

  throw lastError || new Error('AI request failed');
}

// --- Proxied AI Functions ---

export const analyzeTopicAndConfigure = async (
  topic: string,
  type: string,
  genre: string,
  signal?: AbortSignal,
  _onProgress?: (msg: string) => void
): Promise<ProjectBlueprint> => {
  return callAI('analyzeTopicAndConfigure', { topic, type, genre }, signal);
};

export const generateProjectOutline = async (
  blueprint: ProjectBlueprint,
  memory?: ProjectMemory,
  signal?: AbortSignal
): Promise<{ outline: OutlineItem[]; modes: ChapterMode[] }> => {
  return callAI('generateProjectOutline', { blueprint, memory }, signal);
};

export const generateAuthorityBible = async (
  blueprint: ProjectBlueprint,
  outline: OutlineItem[],
  initialMemory?: ProjectMemory,
  signal?: AbortSignal
): Promise<ProjectMemory> => {
  return callAI('generateAuthorityBible', { blueprint, outline, initialMemory }, signal);
};

export const streamChapterContent = async (
  blueprint: ProjectBlueprint,
  profile: NarrativeProfile,
  chapter: OutlineItem,
  memory: ProjectMemory,
  onChunk: (chunk: string) => void,
  prevContext: string,
  nextContext: string,
  fullOutline: OutlineItem[],
  globalSummary: string,
  additionalContext?: string,
  signal?: AbortSignal
): Promise<string> => {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('Request cancelled.');

    const token = _isDemoMode ? null : await getIdToken();
    const res = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        params: {
          blueprint,
          profile,
          chapter,
          memory,
          prevContext,
          nextContext,
          fullOutline,
          globalSummary,
          additionalContext,
        },
        ...(_isDemoMode ? { demoMode: true } : {}),
      }),
      signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}`, retryable: false }));
      const isRetryable = errorData.retryable || res.status === 429 || res.status === 503 || res.status === 502;
      if (isRetryable && attempt < maxRetries) {
        const delay = 4000 * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(errorData.error || 'Stream failed');
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'chunk') {
              onChunk(payload.data);
            } else if (payload.type === 'done') {
              fullContent = payload.data;
            } else if (payload.type === 'error') {
              // Carry retryable flag so the outer loop can decide whether to retry
              const err = new Error(payload.error) as any;
              err.__retryable = payload.retryable === true;
              throw err;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      return fullContent;
    } catch (streamErr: any) {
      // Retry on retryable stream-level API errors (e.g., 503 from Gemini mid-stream)
      if (streamErr?.__retryable && attempt < maxRetries) {
        const delay = 4000 * Math.pow(2, attempt) + Math.random() * 1000;
        lastError = streamErr;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw streamErr;
    }
  } // end retry loop

  throw lastError || new Error('Stream failed after retries');
};

export const agenticChapterGeneration = async (
  blueprint: ProjectBlueprint,
  profile: NarrativeProfile,
  chapter: OutlineItem,
  memory: ProjectMemory,
  onChunk: (chunk: string) => void,
  prevContext: string,
  nextContext: string,
  fullOutline: OutlineItem[],
  globalSummary: string,
  facts: string,
  signal?: AbortSignal
): Promise<string> => {
  return streamChapterContent(blueprint, profile, chapter, memory, onChunk, prevContext, nextContext, fullOutline, globalSummary, facts, signal);
};

export const gatherChapterFacts = async (
  beat: string,
  blueprint: ProjectBlueprint,
  signal?: AbortSignal
): Promise<{ context: string; sources: { title: string; uri: string }[] }> => {
  return callAI('gatherChapterFacts', { beat, blueprint }, signal);
};

export const generateBibliography = async (
  sources: { title: string; uri: string }[],
  signal?: AbortSignal
): Promise<string> => {
  return callAI('generateBibliography', { sources }, signal);
};

// --- Client-side caching for image generation ---
const imageGenerationCache = new Map<string, string>();

// Generate a cache key from prompt and quality
const getImageCacheKey = (prompt: string, quality: string): string => {
  // Use a simple hash to avoid storing very long keys
  // For privacy, we hash rather than store prompts directly
  const key = `${prompt}_${quality}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `img_${Math.abs(hash).toString(36)}`;
};

export const generateImageFromPrompt = async (
  prompt: string,
  quality: string = 'fast',
  signal?: AbortSignal
): Promise<string | null> => {
  // Check client-side cache first
  const cacheKey = getImageCacheKey(prompt, quality);
  const cached = imageGenerationCache.get(cacheKey);
  if (cached) {
    console.log('📦 Using cached cover image');
    return cached;
  }

  // Call API
  const result = await callAI('generateImageFromPrompt', { prompt, quality }, signal);
  
  // Cache the result if successful
  if (result) {
    imageGenerationCache.set(cacheKey, result);
    // Limit cache size to prevent memory issues (keep last 20 images)
    if (imageGenerationCache.size > 20) {
      const firstKey = imageGenerationCache.keys().next().value;
      if (firstKey !== undefined) {
        imageGenerationCache.delete(firstKey);
      }
    }
  }
  
  return result;
};

export const generateBookMockup = async (
  title: string,
  coverImageBase64: string,
  signal?: AbortSignal
): Promise<string | null> => {
  return callAI('generateBookMockup', { title, coverImageBase64 }, signal);
};

export const generateMarketingPack = async (
  blueprint: ProjectBlueprint,
  signal?: AbortSignal
): Promise<MarketingAssets> => {
  return callAI('generateMarketingPack', { blueprint }, signal);
};

export const generateAboutAuthor = async (
  authorName: string,
  bookSummary: string
): Promise<string> => {
  return callAI('generateAboutAuthor', { authorName, bookSummary });
};

export const generateDedication = async (
  bookTitle: string,
  bookSummary: string
): Promise<string> => {
  return callAI('generateDedication', { bookTitle, bookSummary });
};

export const generateSpeech = async (
  text: string,
  voiceName?: string,
  quality?: string,
  signal?: AbortSignal
): Promise<string | null> => {
  return callAI('generateSpeech', { text, voiceName, quality }, signal);
};

export const analyzeChapterAftermath = async (
  content: string,
  memory: ProjectMemory,
  type?: string,
  signal?: AbortSignal
): Promise<{ summary: string; newLore: any }> => {
  return callAI('analyzeChapterAftermath', { content, memory, type }, signal);
};

export const compressGlobalSummary = async (
  summary: string,
  existingSummary: string,
  signal?: AbortSignal
): Promise<string> => {
  return callAI('compressGlobalSummary', { summary, existingSummary }, signal);
};

export const expandChapterBeat = async (
  beat: string,
  title: string,
  summary: string,
  signal?: AbortSignal
): Promise<string> => {
  return callAI('expandChapterBeat', { beat, title, summary }, signal);
};

export const breakDownChapter = async (
  title: string,
  beat: string,
  type: string,
  memory: ProjectMemory,
  signal?: AbortSignal
): Promise<string[]> => {
  return callAI('breakDownChapter', { title, beat, type, memory }, signal);
};

export const expandNonFictionOutline = async (
  beat: string,
  title: string,
  summary: string,
  signal?: AbortSignal
): Promise<string> => {
  return callAI('expandNonFictionOutline', { beat, title, summary }, signal);
};

export const performMagicRefinement = async (
  text: string,
  instruction: string,
  signal?: AbortSignal
): Promise<string> => {
  return callAI('performMagicRefinement', { text, instruction }, signal);
};

export const proofreadChapter = async (
  content: string,
  signal?: AbortSignal
): Promise<string> => {
  return callAI('proofreadChapter', { content }, signal);
};

export const analyzeRemixContent = async (
  text: string,
  signal?: AbortSignal
): Promise<{ blueprint: ProjectBlueprint; memory: ProjectMemory } | null> => {
  return callAI('analyzeRemixContent', { text }, signal);
};

export const performResearch = async (
  query: string,
  signal?: AbortSignal
): Promise<{ facts: any[]; sources: { title: string; uri: string }[] }> => {
  return callAI('performResearch', { query }, signal);
};

export const synthesizeBlueprintFromMemory = async (
  memory: ProjectMemory,
  thesis: string,
  signal?: AbortSignal
): Promise<ProjectBlueprint | null> => {
  return callAI('synthesizeBlueprintFromMemory', { memory, thesis }, signal);
};

export const consultDirector = async (
  mission: string,
  slimProject: any,
  history: any[],
  signal?: AbortSignal
): Promise<DirectorDirective> => {
  return callAI('consultDirector', { mission, slimProject, history }, signal);
};

export const runSpecialistAgent = async (
  role: AgentRole,
  instruction: string,
  context: any,
  signal?: AbortSignal
): Promise<{ output: string }> => {
  return callAI('runSpecialistAgent', { role, instruction, context }, signal);
};



// --- Marketing Image Generation (with client-side compression) ---

const imageCache = new Map<string, string>();
const coverImageCache = new Map<string, string>();

const compressImage = async (base64Data: string, maxWidth: number = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressedBase64.split(',')[1]);
    };
    img.onerror = reject;
  });
};

const hashString = async (text: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

let cachedCoverHashKey: string | null = null;
let cachedCoverHashValue: string | null = null;

const getCoverHash = async (coverImageBase64: string): Promise<string> => {
  if (cachedCoverHashKey === coverImageBase64 && cachedCoverHashValue) {
    return cachedCoverHashValue;
  }
  const hash = await hashString(coverImageBase64);
  cachedCoverHashKey = coverImageBase64;
  cachedCoverHashValue = hash;
  return hash;
};

export const generateMarketingImage = async (
  prompt: string,
  coverImageBase64: string,
  onProgress: (imageUrl: string) => void
): Promise<string | undefined> => {
  // 1. Client-side cache check
  const coverHash = await getCoverHash(coverImageBase64);
  const promptHash = await hashString(prompt);
  const hash = `${coverHash}_${promptHash}`;
  if (imageCache.has(hash)) {
    const cached = imageCache.get(hash)!;
    onProgress(cached);
    return cached;
  }

  // 2. Compress image on client (uses Canvas - browser API)
  let compressedBase64: string;
  if (coverImageCache.has(coverHash)) {
    compressedBase64 = coverImageCache.get(coverHash)!;
  } else {
    compressedBase64 = await compressImage(coverImageBase64);
    coverImageCache.set(coverHash, compressedBase64);
  }

  // 3. Send to server for generation
  try {
    const result = await callAI('generateMarketingImage', { prompt, compressedBase64 });
    if (result) {
      imageCache.set(hash, result);
      onProgress(result);
      return result;
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Marketing image generation failed:', e instanceof Error ? e.message : String(e));
    }
  }
  return undefined;
};
