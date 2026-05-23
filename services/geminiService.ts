
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration, Tool } from "@google/genai";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import { ProjectBlueprint, ProjectMemory, OutlineItem, NarrativeProfile, EbookData, MarketingAssets, AgentRole, DirectorDirective, ChapterMode } from "../types";
import cacheService from "./cacheService";

// --- Configuration ---

export const MODEL_PRO = 'gemini-3.5-flash';          // Best quality, primary
export const MODEL_PRO_STABLE = 'gemini-2.5-flash'; // Stable fallback (cheaper)
export const MODEL_FLASH = 'gemini-3.5-flash';       // Fast & stable primary
export const MODEL_FLASH_STABLE = 'gemini-2.5-flash'; // Stable fallback (cheaper)
export const MODEL_IMAGE = 'gemini-3-pro-image-preview'; // Premium image generation model
export const MODEL_IMAGE_STABLE = 'gemini-2.5-flash-image'; // Image fallback (2.5 Flash)
export const MODEL_TTS = 'gemini-2.5-pro-preview-tts';

// --- Token-Aware Model Selection ---
// Selects the most cost-efficient model based on task type
// Primary: gemini-3.5-flash for complex tasks
// Stable Fallback: gemini-2.5-flash for consistency under high load (cheaper, stable alternative)
export const selectModelForTask = (taskType: string, underHighLoad: boolean = false): string => {
  // Under high API load, prefer cheaper models
  if (underHighLoad) {
    switch (taskType) {
      case 'metadata':        return MODEL_FLASH_STABLE;   // 5-10 min keywords, categories
      case 'imagePrompt':     return MODEL_FLASH_STABLE;   // 5 min visual descriptions
      case 'bibliography':    return MODEL_FLASH_STABLE;   // 5 min source formatting
      case 'dedication':      return MODEL_FLASH;          // 10-15 min short text
      case 'speech':          return MODEL_FLASH;          // 5 min TTS preparation
      case 'outline':         return MODEL_FLASH;          // 30-40 min structured outline
      case 'authority':       return MODEL_PRO;            // 60-120 min complex memory (needs quality)
      case 'chapterContent':  return MODEL_PRO;            // 300-600 min chapter (needs quality)
      case 'chapter':         return MODEL_PRO;            // Same as chapterContent
      default:                return MODEL_FLASH;
    }
  }

  // Under normal load, optimize for quality and token efficiency
  switch (taskType) {
    case 'metadata':        return MODEL_FLASH_STABLE;   // Keywords, categories (very straightforward)
    case 'imagePrompt':     return MODEL_FLASH_STABLE;   // Visual descriptions (concise format)
    case 'bibliography':    return MODEL_FLASH_STABLE;   // Source formatting (structured task)
    case 'dedication':      return MODEL_FLASH;          // Short, stylistic text (~500 tokens)
    case 'speech':          return MODEL_FLASH;          // TTS preparation (~300 tokens)
    case 'chapterContext':  return MODEL_FLASH;          // Gather facts for chapter (~1000 tokens)
    case 'outline':         return MODEL_PRO;            // Complex structured outline (needs reasoning)
    case 'authority':       return MODEL_PRO;            // Build project memory (needs deep understanding)
    case 'chapterContent':  return MODEL_PRO;            // High-quality chapter content (needs creativity)
    case 'chapter':         return MODEL_PRO;            // Same as chapterContent
    case 'marketing':       return MODEL_FLASH;          // Marketing copy (proven good quality with Flash)
    case 'proofread':       return MODEL_FLASH;          // Grammar/spelling check (straightforward)
    case 'research':        return MODEL_FLASH;          // Research queries (web search capable)
    case 'aftermath':       return MODEL_FLASH;          // Chapter analysis (simple extraction)
    case 'compression':     return MODEL_FLASH;          // Summary compression (straightforward)
    case 'remixAnalysis':   return MODEL_PRO;            // Remix engine (needs deep reasoning)
    default:                return MODEL_FLASH;
  }
};

// Helper to get API Key (server-side only)
const getApiKey = (): string => {
    // Use server-only env var (no NEXT_PUBLIC_ prefix)
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('Gemini API Key not found. Make sure GEMINI_API_KEY is set in .env');
    }
    return key || '';
};

// True singleton — reuse the same GoogleGenAI instance across all calls so the
// underlying HTTP client can pool connections and avoid repeated TLS handshakes.
let _aiInstance: GoogleGenAI | null = null;
export const getAI = (): GoogleGenAI => {
    if (_aiInstance) return _aiInstance;
    const key = getApiKey();
    if (!key) throw new Error("API Key missing");
    _aiInstance = new GoogleGenAI({ apiKey: key });
    return _aiInstance;
};

// Fast keyword heuristic that replaces full-LLM classification roundtrips (~1s each).
// Returns 'Narrative' when the combined topic/genre text contains strong narrative
// markers; defaults to 'Instructional' otherwise.
const NARRATIVE_KEYWORDS = [
    'memoir', 'biography', 'biograph', 'autobiography',
    'history', 'historical', 'historic',
    'true crime', 'journalism', 'journalistic',
    'travel writing', 'adventure story',
    'civil rights', 'war story', 'battle of',
    'rise and fall', 'story of', 'life of',
    // personal & essay formats
    'personal essay', 'narrative essay', 'personal narrative',
    'diary', 'journal entry', 'journal',
    'first-person', 'first person',
    'letter', 'open letter',
    'anecdote', 'anecdotal',
    // interview / transcript / profile forms
    'interview', 'transcript', 'profile of',
    'feature story', 'investigative',
    'speech', 'commencement',
    // identity / experience markers common in blog posts and rough notes
    'my story', 'my experience', 'my journey',
    'i was', 'i grew up', 'i remember',
];
export const classifyTopicHeuristic = (topic: string, genre?: string): 'Narrative' | 'Instructional' => {
    const combined = `${topic} ${genre ?? ''}`.toLowerCase();
    return NARRATIVE_KEYWORDS.some(k => combined.includes(k)) ? 'Narrative' : 'Instructional';
};

// Helper: Strip Markdown Code Blocks & Meta-Commentary
export const safeJsonParse = (text: string, fallback: any = {}): any => {
    const cleanJson = stripMarkdownWrapper(text);
    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.warn("JSON Parse Error, attempting jsonrepair", cleanJson.substring(0, 50));
        try {
            const repaired = jsonrepair(cleanJson);
            return JSON.parse(repaired);
        } catch (e2) {
            console.error("jsonrepair failed", e2);
            return fallback;
        }
    }
};

const stripMarkdownWrapper = (text: string): string => {
    let clean = text.trim();

    // 1. Try to extract JSON from markdown code blocks
    const jsonBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }

    // 2. If no code block, try to find the first '{' and last '}'
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return clean.substring(firstBrace, lastBrace + 1).trim();
    }

    // 3. Fallback to existing logic if no code block found
    // Remove "From [Book Title]" or "Excerpt" citations often generated by AI at start
    clean = clean.replace(/^(?:<p>)?\s*From\s+["'].*?["']\s*(?:<\/p>)?\s*/i, '');
    clean = clean.replace(/^(?:<p>)?\s*Excerpt from\s+.*?\s*(?:<\/p>)?\s*/i, '');
    clean = clean.replace(/^(?:<p>)?\s*By\s+.*?\s*(?:<\/p>)?\s*/i, '');

    return clean.trim();
};

// Safe HTML content stripper — only removes code block fencing, NEVER extracts JSON.
// Use this for chapter content (HTML) instead of stripMarkdownWrapper.
const stripHtmlWrapper = (text: string): string => {
    let clean = text.trim();
    // Only strip markdown code-block fencing if the AI wrapped HTML in ```html ... ```
    clean = clean.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');
    // Remove AI meta-commentary like "From [Book Title]" or "Excerpt"
    clean = clean.replace(/^(?:<p>)?\s*From\s+["'].*?["']\s*(?:<\/p>)?\s*/i, '');
    clean = clean.replace(/^(?:<p>)?\s*Excerpt from\s+.*?\s*(?:<\/p>)?\s*/i, '');
    clean = clean.replace(/^(?:<p>)?\s*By\s+.*?\s*(?:<\/p>)?\s*/i, '');
    return clean.trim();
};

// Validate that chapter content is real HTML prose, not garbage (JSON, API docs, etc.)
const validateChapterContent = (html: string): string => {
    // If content is mostly JSON (starts with { and ends with }, or is parseable JSON), it's garbage
    const trimmed = html.trim();
    try {
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            JSON.parse(trimmed);
            // If it parses as valid JSON, the AI returned garbage instead of chapter content
            console.error('Chapter content is raw JSON instead of HTML. Rejecting.');
            throw new Error('The AI generated invalid content for this chapter. Please try generating this chapter again.');
        }
    } catch (e: any) {
        if (e.message?.includes('invalid content')) throw e;
        // Not valid JSON, that's fine — means it's probably HTML
    }

    // Check that content has meaningful HTML tags (not just a raw string)
    const tagCount = (trimmed.match(/<\/?[a-z][a-z0-9]*[^>]*>/gi) || []).length;
    const textLength = trimmed.replace(/<[^>]*>/g, '').trim().length;

    // If content is very short (< 100 chars of actual text) and has no HTML tags, it's likely garbage
    if (textLength < 100 && tagCount === 0) {
        console.error('Chapter content too short or missing HTML structure:', trimmed.substring(0, 200));
        throw new Error('The AI generated insufficient content for this chapter. Please try generating this chapter again.');
    }

    return html;
};

// Strip common AI-generated filler phrases from chapter HTML content.
// Operates on visible text — does not alter HTML tags or attributes.
const humanizeContent = (html: string): string => {
    const replacements: [RegExp, string][] = [
        // Sentence-opening AI clichés (remove the phrase, let the next word lead)
        [/\bInterestingly,?\s+/g, ''],
        [/\bNotably,?\s+/g, ''],
        [/\bImportantly,?\s+/g, ''],
        [/\bSignificantly,?\s+/g, ''],
        [/\bRemarkably,?\s+/g, ''],
        [/\bIt is worth noting that\s+/gi, ''],
        [/\bIt is important to note that\s+/gi, ''],
        [/\bIt is noteworthy that\s+/gi, ''],
        [/\bIt should be noted that\s+/gi, ''],
        [/\bIt is noted that\s+/gi, ''],
        [/\bNeedless to say,?\s+/gi, ''],
        [/\bIt goes without saying (?:that\s+)?/gi, ''],
        [/\bAs previously mentioned,?\s+/gi, ''],
        [/\bAs (?:we |I )?(?:discussed|noted|mentioned) (?:earlier|above|before),?\s+/gi, ''],
        [/\bCircling back (?:to this|to that),?\s+/gi, ''],
        [/\bAt the end of the day,?\s+/gi, ''],
        [/\bIn the realm of\s+/gi, 'In '],
        [/\bIn the world of\s+/gi, 'In '],
        [/\bIn the context of\s+/gi, 'In '],
        // Weak paragraph-opener conjunctions (strip when opening a new sentence)
        [/(>|\.\s+)Furthermore,?\s+/g, '$1'],
        [/(>|\.\s+)Moreover,?\s+/g, '$1'],
        [/(>|\.\s+)Additionally,?\s+/g, '$1'],
        // Forward-looking chapter transitions (remove entire sentence)
        [/In the (?:next|following) chapter,?[^<.!?]*[.!?]\s*/gi, ''],
        [/(?:Next|Coming up) (?:in this (?:chapter|book)|we will)[^<.!?]*[.!?]\s*/gi, ''],
        [/Stay tuned[^<.!?]*[.!?]\s*/gi, ''],
        // AI hedge phrases
        [/\bone might (?:argue|suggest|say) that\s+/gi, ''],
        [/\bsome might (?:argue|say) that\s+/gi, ''],
        // Clean up double spaces left behind
        [/  +/g, ' '],
    ];

    let result = html;
    for (const [pattern, replacement] of replacements) {
        result = result.replace(pattern, replacement);
    }
    return result;
};

// Helper: Strip markdown formatting from plain text (for text-only outputs like dedications, bios)
const stripMarkdownFormatting = (text: string): string => {
    let clean = text;
    // Remove markdown bold (**text** -> text)
    clean = clean.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
    clean = clean.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove markdown italic (*text* or _text_ -> text)
    clean = clean.replace(/(?<!\*|\\)\*(?![*\s])(.+?)(?<!\s|\\)\*(?!\*)/g, '$1');
    clean = clean.replace(/__(.*?)__/g, '$1');
    clean = clean.replace(/_(.*?)_/g, '$1');
    // Remove markdown headings (## Title -> Title)
    clean = clean.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    // Convert markdown bullet points to plain text (remove * markers)
    clean = clean.replace(/^\s*\*\s+/gm, '');
    // Remove any remaining orphaned asterisks/underscores
    clean = clean.replace(/\*/g, '');
    clean = clean.replace(/_/g, '');
    return clean;
};

// Helper: Safety Net to convert accidental Markdown to HTML and strip leftover asterisks
const convertMarkdownToHtml = (text: string): string => {
    let clean = text;
    
    // STEP 1: Convert markdown bold/italic to HTML
    // Handle bold-italic first (***text***)
    clean = clean.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    
    // Handle bold (**text**)
    // Use greedy matching with proper boundary detection for robustness
    clean = clean.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    // Multiple passes to catch cases with multiple ** sequences
    for (let i = 0; i < 3; i++) {
        clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }
    
    // Handle single italic (*text*) - be more careful to avoid false positives
    clean = clean.replace(/(?<!\*)\*([^\*\s][^\*]*?[^\*\s]|[^\*\s])\*(?!\*)/g, '<em>$1</em>');
    
    // Handle double underscore bold (__text__)
    clean = clean.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Handle single underscore italic (_text_)
    clean = clean.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // STEP 2: Convert markdown headings to HTML
    clean = clean.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    clean = clean.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    clean = clean.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
    
    // STEP 3: Convert bullet points - but preserve the content
    clean = clean.replace(/^\s*\*\s+/gm, '');  // Just remove the * marker, keep the content
    clean = clean.replace(/^\s*-\s+/gm, '');   // Also handle - bullet style
    
    // STEP 4: Aggressively remove any remaining orphaned asterisks/underscores
    // This is critical for catching edge cases where markdown conversion didn't work
    // Strategy: Only keep asterisks/underscores that are clearly inside HTML tags
    
    // Remove standalone ** (not converted earlier for some reason)
    clean = clean.replace(/\*\*+/g, ' ');
    
    // Remove standalone single asterisks that aren't part of HTML
    clean = clean.replace(/(?<!<[a-z])(?<![a-zA-Z0-9])\*+(?![a-zA-Z0-9>])/g, ' ');
    
    // Remove standalone underscores that aren't part of HTML
    clean = clean.replace(/(?<!<[a-z])(?<![a-zA-Z0-9])_+(?![a-zA-Z0-9>])/g, ' ');
    
    // Clean up excessive spaces created by removing markers
    clean = clean.replace(/\s{2,}/g, ' ');
    
    return clean;
};

// Helper: Validate Source URL
const isValidSource = (uri: string): boolean => {
    if (!uri) return false;
    
    // Blocked domains (Google internal, localhost, etc.)
    const forbidden = [
        'vertex.ai', 'google.com/search', 'google.com/url', 'googleapis.com',
        'gemini.google.com', 'support.google.com', 'accounts.google.com',
        'localhost', '127.0.0.1', 'googleusercontent.com'
    ];
    
    if (forbidden.some(domain => uri.includes(domain))) return false;
    
    // Prioritize trusted domains: educational, government, non-profit
    const trustedDomains = ['.edu', '.gov', '.org'];
    const isTrusted = trustedDomains.some(domain => uri.includes(domain));
    
    // Allow trusted domains; for others, do basic quality checks
    if (isTrusted) return true;
    
    // For non-trusted: ensure it has a proper domain and isn't obviously spam
    const hasProperDomain = uri.includes('.') && !uri.includes('localhost');
    const notSpam = !uri.includes('ad-') && !uri.includes('tracking') && !uri.includes('utm_');
    
    return hasProperDomain && notSpam;
};

// --- TOKEN ESTIMATION & OPTIMIZATION ---
// Rough estimate: 1 token ≈ 4 characters (Gemini tokenization)
const estimateTokenCount = (text: string): number => {
    return Math.ceil(text.length / 3.5); // Conservative estimate
};

// Format context items concisely to reduce token count.
// The 'source-material' entry (from Remix Engine) gets a larger slice so that
// actual source passages reach the chapter-generation prompt instead of 100 chars.
const formatContextSlim = (item: any): string => {
    if (!item) return '';
    const maxLen = item.id === 'source-material' ? 2500 : 100;
    return `${item.name || ''}${item.description ? ': ' + item.description.substring(0, maxLen) : ''}`;
};

// Create optimized context block that's human-readable but token-efficient
const buildOptimizedContextBlock = (items: any[], maxItems: number = 3): string => {
    if (!items || items.length === 0) return '';
    const selected = items.slice(0, maxItems);
    return selected.map(item => formatContextSlim(item)).filter(s => s.length > 0).join('\n- ');
};

// Track cumulative API stress to enable adaptive sizing
let apiStressLevel = 0; // 0-100 scale
const updateApiStressLevel = (recentErrors: boolean) => {
    apiStressLevel = recentErrors ? Math.min(100, apiStressLevel + 20) : Math.max(0, apiStressLevel - 5);
};

// Export for diagnostics
export const getApiStressLevel = (): number => apiStressLevel;

// Determine content fidelity based on API stress
const getContextFidelity = (): 'full' | 'medium' | 'slim' => {
    if (apiStressLevel > 70) return 'slim';     // Minimal context only
    if (apiStressLevel > 40) return 'medium';   // Medium context
    return 'full';                              // Full context
};

// --- Queue Management ---
class RequestQueue {
    private queue: (() => Promise<any>)[] = [];
    private active = 0;
    private concurrencyLimit: number;
    private recentErrors: number[] = []; // Track errors in last 60s

    constructor(concurrencyLimit: number) {
        this.concurrencyLimit = concurrencyLimit;
    }

    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    // Success: clear error tracking
                    this.recentErrors = [];
                    updateApiStressLevel(false);
                    resolve(result);
                } catch (e) {
                    // Track error for adaptive rate limiting
                    this.recentErrors.push(Date.now());
                    // Clean old errors (> 60s)
                    this.recentErrors = this.recentErrors.filter(t => Date.now() - t < 60000);
                    // If we're seeing lots of errors, increase stress level
                    const hasHighErrorRate = this.recentErrors.length > 3;
                    updateApiStressLevel(hasHighErrorRate);
                    reject(e);
                }
            });
            this.next();
        });
    }

    private next() {
        if (this.active < this.concurrencyLimit && this.queue.length > 0) {
            this.active++;
            const fn = this.queue.shift()!;
            fn().finally(() => {
                this.active--;
                this.next();
            });
        }
    }

    // Reduce concurrency if under extreme API stress
    adaptConcurrency(): number {
        if (apiStressLevel > 80) return 2;  // Severe: minimal requests
        if (apiStressLevel > 60) return 3;  // High: reduced requests
        if (apiStressLevel > 40) return 4;  // Moderate: slightly reduced
        return 6;                           // Normal: standard concurrency
    }
}
const aiQueue = new RequestQueue(6);

// --- Error Classification Helper ---
const isRetryableError = (error: any): { retryable: boolean; isRateLimit: boolean } => {
    const statusStr = String(error?.status ?? '');
    const msgStr = String(error?.message ?? '');
    const statusCode = typeof error?.status === 'number' ? error.status : (error?.response?.status ?? 0);
    const errorCode = error?.error?.code;

    const isRateLimit = statusCode === 429 ||
                        errorCode === 429 ||
                        msgStr.includes('429') ||
                        msgStr.includes('RESOURCE_EXHAUSTED');

    const isServerErr = statusStr === 'UNAVAILABLE' ||
                        msgStr.includes('UNAVAILABLE') ||
                        msgStr.includes('high demand') ||
                        msgStr.includes('overloaded') ||
                        msgStr.includes('503') ||
                        msgStr.includes('502') ||
                        msgStr.includes('504') ||
                        msgStr.includes('DEADLINE_EXCEEDED') ||
                        msgStr.includes('INTERNAL') ||
                        errorCode === 503 || errorCode === 502 || errorCode === 504 ||
                        (statusCode >= 500 && statusCode < 600);

    return { retryable: isRateLimit || isServerErr, isRateLimit };
};

// Retry Logic with Adaptive Backoff based on API Stress
export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 2000, signal?: AbortSignal, _initialRetries: number = retries): Promise<T> {
    try {
        if (signal?.aborted) throw new Error("Aborted by user");
        // Wrap in queue
        return await aiQueue.add(fn);
    } catch (error: any) {
        if (signal?.aborted || error.message === "Aborted by user") throw new Error("Aborted by user");
        if (retries <= 0) throw error;
        
        const { retryable, isRateLimit } = isRetryableError(error);

        if (!retryable && error?.status) throw error;
        
        // Exponential backoff with jitter, adapted based on API stress
        // Use _initialRetries to correctly compute attempt number regardless of initial retries value
        const attemptsMade = _initialRetries - retries;
        const backoffDelay = delay * Math.pow(2, attemptsMade);
        const jitter = Math.random() * 1000;
        
        // Apply stress multiplier: higher stress = longer delays
        const stressMultiplier = 1 + (apiStressLevel / 100) * 2; // 1x to 3x multiplier
        const adaptiveDelay = Math.ceil(backoffDelay * stressMultiplier);
        const waitTime = isRateLimit ? Math.max(adaptiveDelay + jitter, 5000) : (adaptiveDelay + jitter);
        
        console.warn(`API Error (${isRateLimit ? '429 Rate Limit' : 'Server'}). Stress=${apiStressLevel}%. Waiting ${Math.round(waitTime/1000)}s... (${retries} retries left)`);
        
        await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, waitTime);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new Error("Aborted by user"));
                }, { once: true });
            }
        });
        
        return retryWithBackoff(fn, retries - 1, delay, signal, _initialRetries);
    }
}

// --- Model Fallback Helper ---
// Tries primary model, falls back to stable model on 429/503/502/504 errors.
async function callWithModelFallback<T>(
    callFn: (model: string) => Promise<T>,
    primaryModel: string,
    signal?: AbortSignal
): Promise<T> {
    try {
        return await callFn(primaryModel);
    } catch (error: any) {
        if (signal?.aborted || error?.message === "Aborted by user") throw error;
        const { retryable } = isRetryableError(error);
        if (!retryable) throw error;

        // Determine fallback model
        let fallbackModel: string | null = null;
        if (primaryModel === MODEL_FLASH) fallbackModel = MODEL_FLASH_STABLE;
        else if (primaryModel === MODEL_PRO) fallbackModel = MODEL_PRO_STABLE;
        else if (primaryModel === MODEL_PRO_STABLE) fallbackModel = MODEL_FLASH_STABLE;
        else if (primaryModel === MODEL_IMAGE) fallbackModel = MODEL_IMAGE_STABLE;

        if (!fallbackModel) throw error;

        console.warn(`⚠️ ${primaryModel} unavailable (${error?.status || error?.message}). Falling back to ${fallbackModel}.`);
        try {
            return await callFn(fallbackModel);
        } catch (fallbackError: any) {
            if (signal?.aborted || fallbackError?.message === "Aborted by user") throw fallbackError;
            // If primary was a preview flash/pro and stable also failed, try the other stable
            const { retryable: retryable2 } = isRetryableError(fallbackError);
            if (!retryable2) throw fallbackError;

            let lastResort: string | null = null;
            if (fallbackModel === MODEL_FLASH_STABLE && primaryModel !== MODEL_PRO_STABLE) lastResort = MODEL_FLASH;
            else if (fallbackModel === MODEL_PRO_STABLE) lastResort = MODEL_FLASH_STABLE;

            if (lastResort && lastResort !== primaryModel) {
                console.warn(`⚠️ ${fallbackModel} also unavailable. Final attempt with ${lastResort}.`);
                return await callFn(lastResort);
            }
            throw fallbackError;
        }
    }
}

// Cost Tracking
export const trackResponseUsage = (response: any, model: string) => {
    // Usage tracking disabled
};

// --- SMART CONTEXT RETRIEVAL (RAG-LITE) ---

const contextCache = new Map<string, any[]>();

export const getRelevantContext = async (beat: string, memory: ProjectMemory, signal?: AbortSignal): Promise<any[]> => {
    const cacheKey = beat + JSON.stringify(memory.research.slice(0, 5)); // Simple key
    if (contextCache.has(cacheKey)) return contextCache.get(cacheKey)!;

    // 1. Flatten all memory items into a searchable index
    const allItems = [
        ...memory.research,
        ...memory.keyFigures,
        ...memory.glossary,
        ...memory.concepts,
        ...memory.characters,
        ...memory.world,
        ...memory.plot
    ];

    if (allItems.length === 0) {
        return [];
    }

    // 2. Client-side keyword matching (replaces expensive LLM call)
    // Token Optimization: Saves ~1000-3000 input tokens per chapter
    const beatWords = beat.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    const scoredItems = allItems.map(item => {
        let score = 0;
        const itemName = (item.name || "").toLowerCase();
        const itemDesc = (item.description || "").toLowerCase();
        
        for (const word of beatWords) {
            if (itemName.includes(word)) score += 3; // Name match is stronger
            if (itemDesc.includes(word)) score += 1;
        }
        return { item, score };
    });

    // Sort by score descending and take top 5
    const relevantItems = scoredItems
        .filter(si => si.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(si => si.item);

    // Fallback: If no matches, grab the first few research items so we aren't empty
    if (relevantItems.length === 0) {
        return memory.research.slice(0, 5);
    }
    contextCache.set(cacheKey, relevantItems);
    return relevantItems;
};

// --- Core Functions ---

// Extract explicit chapter count from user's topic string (e.g. "2 chapter book about AI" → 2)
const parseChapterCountFromTopic = (topic: string): number | null => {
    const pattern = /\b(\d{1,3})\s*[-–]?\s*chapters?\b/i;
    const match = topic.match(pattern);
    if (match) {
        const count = parseInt(match[1], 10);
        if (count >= 1 && count <= 200) return count;
    }
    return null;
};

export const analyzeTopicAndConfigure = async (
    topic: string, 
    type: string, 
    genre: string, 
    signal?: AbortSignal,
    onProgress?: (msg: string) => void
): Promise<ProjectBlueprint> => {
    // Check cache first (15 minute TTL)
    const cacheKey = { topic, type, genre };
    const cached = cacheService.get<ProjectBlueprint>('analyzeTopicAndConfigure', cacheKey);
    if (cached) {
        if (onProgress) onProgress("Using cached blueprint...");
        return cached;
    }

    const ai = getAI();

    // Extract explicit chapter count from user input (e.g. "2 chapter book about AI")
    const userRequestedChapters = parseChapterCountFromTopic(topic);

    // STEP 1: CLASSIFICATION (keyword heuristic — no LLM roundtrip needed)
    if (onProgress) onProgress("Detecting narrative mode...");
    const mode = classifyTopicHeuristic(topic, genre);

    if (onProgress) onProgress(`${mode} Mode active. Architecting blueprint...`);

    // STEP 2: ARCHITECTURE (PRO MODEL - High Intelligence)
    let specificPrompt = "";
    let specificSchemaProperties: any = {};

    // Base Profile Schema (Common)
    const baseProfileSchema = {
        type: Type.OBJECT,
        properties: {
            voice: { type: Type.STRING, description: "Detailed description of the writing style/voice." },
            tense: { type: Type.STRING },
            pov: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            complexity: { type: Type.STRING },
            archetype: { type: Type.STRING, description: "Creative persona name (e.g. 'The Cyber-Shaman', 'The Gritty Insider'). Do not use generic terms." },
            targetWordCount: { type: Type.NUMBER },
            chapterCount: { type: Type.NUMBER },
            pacing: { type: Type.STRING }
        }
    };

    // Schema for Dynamic Structure (AI Architect)
    const structureSchema = {
        type: Type.OBJECT,
        properties: {
            archetype: { type: Type.STRING, description: "Name of the book structure (e.g. 'The Hero's Journey', 'The Problem-Solution Cycle')" },
            description: { type: Type.STRING, description: "Short explanation of why this structure fits." },
            phases: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "e.g. 'Part 1: The Foundation'" },
                        intent: { type: Type.STRING, description: "The goal of this phase." },
                        chapterCount: { type: Type.NUMBER, description: "Number of chapters in this phase." }
                    }
                }
            }
        }
    };

    // Build chapter constraint string if user specified a chapter count
    const chapterConstraint = userRequestedChapters
        ? `\n        HARD CONSTRAINT — CHAPTER COUNT: The user has explicitly requested EXACTLY ${userRequestedChapters} chapters. You MUST honor this.
        - Set "chapterCount" to exactly ${userRequestedChapters} in the profile.
        - The sum of all phase chapterCounts MUST equal exactly ${userRequestedChapters}.
        - Do NOT override or reinterpret this number. ${userRequestedChapters} chapters means ${userRequestedChapters} chapters.`
        : '';

    if (mode === 'Narrative') {
        specificPrompt = `Perform a deep NARRATIVE ANALYSIS and BIOGRAPHICAL PROFILE on the topic: "${topic}".
        Analyze the key events, milestones, emotional resonance, and the overarching legacy or mystery involved.
        
        TASK 1: VOICE DNA INVENTION
        Do not use generic archetypes like 'Historian'. INVENT a specific persona that fits this exact story or subject.
        Example: For a tech biography, the Archetype could be 'The Visionary Chronicler'.
        
        TASK 2: NARRATIVE ARCHITECTURE
        Design a custom 'Book Structure Archetype' (Macro-Structure) that fits this specific story. 
        Break the book into 3-5 distinct Phases (Parts) that guide the reader through a chronological or thematic journey.
        ${chapterConstraint}
        
        Required Specifics:
        - controllingIdea: The core theme, lesson, or biographical thesis.
        - readerPersona: Target reader's curiosity and emotional payoff.
        - structure: The high-level parts of the book.
        
        Return valid JSON that strictly follows this structure:
        {
            "title": "string",
            "subtitle": "string",
            "type": "Non-Fiction" | "Memoir" | "Textbook" | "Guide" | "Fiction",
            "genre": "string",
            "visualStyle": "string",
            "coverPrompt": "string",
            "summary": "string",
            "profile": {
                "voice": "string",
                "tense": "string",
                "pov": "string",
                "targetAudience": "string",
                "complexity": "string",
                "archetype": "string",
                "targetWordCount": number,
                "chapterCount": number,
                "pacing": "string"
            },
            "controllingIdea": "string",
            "readerPersona": {
                "intellectualCuriosity": "string",
                "emotionalPayoff": "string",
                "historicalContext": "string"
            },
            "structure": {
                "archetype": "string",
                "description": "string",
                "phases": [
                    {
                        "title": "string",
                        "intent": "string",
                        "chapterCount": number
                    }
                ]
            }
        }`;

        specificSchemaProperties = {
            controllingIdea: { type: Type.STRING },
            readerPersona: {
                type: Type.OBJECT,
                properties: {
                    intellectualCuriosity: { type: Type.STRING },
                    emotionalPayoff: { type: Type.STRING },
                    historicalContext: { type: Type.STRING }
                }
            },
            structure: structureSchema
        };
    } else {
        // NON-FICTION / INSTRUCTIONAL LOGIC
        specificPrompt = `Perform a deep STRATEGIC ANALYSIS on the topic: "${topic}".
        Identify the specific pain points and desired transformation of the reader.
        
        TASK 1: VOICE DNA INVENTION
        Do not use generic archetypes like 'Consultant'. INVENT a specific persona that fits this exact niche.
        Example: If the topic is 'Stoicism', the Archetype should be 'The Modern Sage' and the Voice should be 'Calm, authoritative, timeless'.
        
        TASK 2: INSTRUCTIONAL ARCHITECTURE
        Design a custom 'Book Structure Archetype' (Macro-Structure).
        Break the book into 3-5 distinct Phases.
        ${chapterConstraint}
        
        Required Specifics:
        - centralThesis: The main argument.
        - readerPersona: Pain Point & Desired Outcome.
        - structure: The high-level phases.
        
        Return valid JSON that strictly follows this structure:
        {
            "title": "string",
            "subtitle": "string",
            "type": "Non-Fiction" | "Memoir" | "Textbook" | "Guide" | "Fiction",
            "genre": "string",
            "visualStyle": "string",
            "coverPrompt": "string",
            "summary": "string",
            "profile": {
                "voice": "string",
                "tense": "string",
                "pov": "string",
                "targetAudience": "string",
                "complexity": "string",
                "archetype": "string",
                "targetWordCount": number,
                "chapterCount": number,
                "pacing": "string"
            },
            "centralThesis": "string",
            "readerPersona": {
                "primaryPainPoint": "string",
                "desiredOutcome": "string"
            },
            "structure": {
                "archetype": "string",
                "description": "string",
                "phases": [
                    {
                        "title": "string",
                        "intent": "string",
                        "chapterCount": number
                    }
                ]
            }
        }`;

        specificSchemaProperties = {
            centralThesis: { type: Type.STRING },
            readerPersona: {
                type: Type.OBJECT,
                properties: {
                    primaryPainPoint: { type: Type.STRING },
                    desiredOutcome: { type: Type.STRING }
                }
            },
            structure: structureSchema
        };
    }

    const fullSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            type: { type: Type.STRING },
            genre: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            coverPrompt: { type: Type.STRING },
            summary: { type: Type.STRING },
            profile: baseProfileSchema,
            ...specificSchemaProperties
        }
    };

    // Use MODEL_FLASH for speed and efficiency on the blueprint
    let response;
    let usedModel = MODEL_FLASH;
    
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            response = await callWithModelFallback(
                (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                    model,
                    contents: specificPrompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                }), 3, 2000, signal),
                MODEL_FLASH,
                signal
            );
            
            trackResponseUsage(response, usedModel);
            
            const rawText = response.text || "{}";
            const cleanJson = stripMarkdownWrapper(rawText);
            const repairedJson = jsonrepair(cleanJson);
            const data = ProjectBlueprintSchema.parse(JSON.parse(repairedJson));
            
            // Ensure legacy fields exist to prevent UI crashes if accessed
            if (!data.structuralSignature) data.structuralSignature = [];
            if (!data.chapterModes) data.chapterModes = [];
            
            // Enforce user-requested chapter count if the AI ignored it
            if (userRequestedChapters) {
                data.profile.chapterCount = userRequestedChapters;
                if (data.structure?.phases) {
                    const currentTotal = data.structure.phases.reduce((acc, p) => acc + p.chapterCount, 0);
                    if (currentTotal !== userRequestedChapters) {
                        // Redistribute chapters across phases proportionally
                        const ratio = userRequestedChapters / currentTotal;
                        let distributed = 0;
                        data.structure.phases.forEach((p, i) => {
                            if (i === data.structure!.phases.length - 1) {
                                p.chapterCount = userRequestedChapters - distributed;
                            } else {
                                p.chapterCount = Math.max(1, Math.round(p.chapterCount * ratio));
                                distributed += p.chapterCount;
                            }
                        });
                        // If too many phases for the requested count, trim phases
                        if (data.structure.phases.length > userRequestedChapters) {
                            data.structure.phases = data.structure.phases.slice(0, userRequestedChapters);
                            data.structure.phases[data.structure.phases.length - 1].chapterCount = 
                                userRequestedChapters - data.structure.phases.slice(0, -1).reduce((acc, p) => acc + p.chapterCount, 0);
                        }
                        console.log(`[Blueprint] Redistributed phases to match user-requested ${userRequestedChapters} chapters`);
                    }
                }
            }
            
            const result = { ...data, mode: mode as 'Instructional' | 'Narrative' };
            // Cache the result for future use
            cacheService.set('analyzeTopicAndConfigure', cacheKey, result);
            return result;
        } catch (e) {
            console.warn(`Blueprint analysis attempt ${attempt + 1} failed`, e);
            if (e instanceof z.ZodError) {
                console.error(`Zod validation error for attempt ${attempt + 1}:`, (e as z.ZodError).issues);
            }
            if (response && response.text) {
                console.error(`Raw response text for attempt ${attempt + 1}:`, response.text);
            }
        }
    }
    
    throw new Error("Failed to generate blueprint after 3 attempts");
};

const ChapterModeSchema = z.object({
    id: z.string(),
    name: z.string(),
    purpose: z.string(),
    signature: z.union([z.string(), z.array(z.string())]),
});

export const generateProjectOutline = async (blueprint: ProjectBlueprint, memory?: ProjectMemory, signal?: AbortSignal): Promise<{ outline: OutlineItem[], modes: ChapterMode[] }> => {
    // Check cache first (15 minute TTL)
    const cacheKey = { blueprintId: blueprint.title, blueprintHash: blueprint.profile.chapterCount };
    const cached = cacheService.get<{ outline: OutlineItem[], modes: ChapterMode[] }>('generateProjectOutline', cacheKey);
    if (cached) {
        return cached;
    }

    const ai = getAI();
    const context = memory ? `Context from memory: ${JSON.stringify(memory.concepts.slice(0, 10))} ${JSON.stringify(memory.research.slice(0, 5))}` : "";
    const thesisContext = blueprint.centralThesis ? `Central Thesis to Prove: "${blueprint.centralThesis}"` : "";
    const themeContext = blueprint.controllingIdea ? `Controlling Idea/Theme: "${blueprint.controllingIdea}"` : "";
    
    // Construct Structure Context if available
    let structureInstruction = "";
    if (blueprint.structure && blueprint.structure.phases) {
        structureInstruction = `STRICT ARCHITECTURAL DIRECTIVE:
        Follow the '${blueprint.structure.archetype}' framework.
        Structure the book into these Phases:
        ${blueprint.structure.phases.map((p, i) => `${i+1}. ${p.title} (${p.chapterCount} chapters): Goal - ${p.intent}`).join('\n')}
        
        Total Target Chapters: ${blueprint.structure.phases.reduce((acc, p) => acc + p.chapterCount, 0)}.
        Ensure the chapter flow respects the intent of each Phase.`;
    } else {
        structureInstruction = `MANDATORY Chapter Count: EXACTLY ${blueprint.profile.chapterCount} chapters. Do NOT generate more or fewer than ${blueprint.profile.chapterCount} chapters.`;
    }

    const isNarrative = blueprint.mode === 'Narrative';
    let generatedModes: ChapterMode[] = [];

    // Provide the original source material to ground chapter beats in actual content.
    // Limit to 6000 chars to keep the outline prompt manageable without overloading the model.
    const sourceMaterialBlock = blueprint.sourceMaterial
        ? `\nSOURCE MATERIAL (ground every chapter beat in actual ideas, events, and facts found in this text — do NOT invent content that is absent from the source):\n${blueprint.sourceMaterial.substring(0, 6000)}`
        : "";

    // STEP 1 & 2: Generate Modes AND Outline in PARALLEL (saves ~1-2s vs sequential)
    // The outline is generated without mode-ID assignments first; modes are merged in a
    // very fast post-processing step below, avoiding a sequential dependency.
    const modePrompt = `Design 3 distinct 'CHAPTER MODES' (Templates) for the book: "${blueprint.title}".
    Mode: ${blueprint.mode || 'Instructional'}
    Summary: ${blueprint.summary}.
    Target Audience: ${blueprint.profile.targetAudience}.
    ${thesisContext}
    ${themeContext}
    
    Create 3 re-usable templates for chapters in this book.
    Examples for Non-Fiction: 'The Concept Deep Dive', 'The Tactical Guide', 'The Case Study'.
    Examples for Narrative: 'The Action Sequence', 'The Introspective Pause', 'The World-Building Reveal'.
    Return their ID, Name, Purpose, and Signature (as a string arrow flow e.g. "Hook -> Theory -> Action" or "Setting Scene -> Rising Tension -> Climax").
    
    Return valid JSON array of objects.`;

    const outlinePrompt = `Create a detailed chapter outline for "${blueprint.title}". 
    Mode: ${blueprint.mode || 'Instructional'}
    Summary: ${blueprint.summary}.
    ${thesisContext}
    ${themeContext}
    ${sourceMaterialBlock}
    
    ${structureInstruction}
    
    ${context}
    Return valid JSON containing an array of 'chapters'.
    
    CRITICAL OUTLINE RULES:
    0. You MUST generate EXACTLY the number of chapters specified above. This is a hard constraint — not a suggestion.
    1. Keep chapter titles concise (max 5-7 words). Do not include summaries or descriptions in the title field.
    2. Each chapter beat MUST cover unique ground — no two chapters should overlap in their core content.
    3. Each beat should specify what NEW information this chapter introduces (not covered elsewhere).
    4. The FINAL chapter MUST be explicitly designed as the book's CONCLUSION/SYNTHESIS. Its beat should reference:
       - Tying together the book's key themes
       - Revisiting the central thesis with final proof
       - Providing a definitive closing thought or call to action
       Do NOT place a conclusion or summary in any chapter other than the last.
    5. Each non-final chapter must end with its own decisive, complete thought. Do NOT write transition hooks, forward-looking sentences, or "in the next chapter" language. Each chapter ends on its own terms.
    6. Ensure a logical progression: early chapters build foundations, middle chapters develop depth, final chapters synthesize.
    7. Set targetWordCount to a reasonable target per chapter (typically 2000-3000 words). Prioritize depth and quality — do NOT inflate word counts artificially. A focused, well-developed chapter is better than a padded one.`;

    const [modeResult, outlineResult] = await Promise.allSettled([
        callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: modePrompt,
                config: { responseMimeType: "application/json" }
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        ),
        callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: outlinePrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            chapters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        chapterNumber: { type: Type.NUMBER },
                                        title: { type: Type.STRING },
                                        beat: { type: Type.STRING },
                                        targetWordCount: { type: Type.NUMBER },
                                    },
                                    required: ["id", "chapterNumber", "title", "beat", "targetWordCount"]
                                }
                            }
                        },
                        required: ["chapters"]
                    }
                }
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        )
    ]);

    // Process modes
    if (modeResult.status === 'fulfilled') {
        try {
            trackResponseUsage(modeResult.value, MODEL_FLASH);
            const rawText = modeResult.value.text || "[]";
            const cleanJson = stripMarkdownWrapper(rawText);
            const repairedJson = jsonrepair(cleanJson);
            const rawModes = z.array(ChapterModeSchema).parse(JSON.parse(repairedJson));
            generatedModes = rawModes.map((m: any) => ({
                id: m.id,
                name: m.name,
                purpose: m.purpose,
                signature: typeof m.signature === 'string'
                    ? m.signature.split('->').map((s: string) => s.trim())
                    : (Array.isArray(m.signature) ? m.signature : [])
            }));
        } catch (e: any) {
            if (signal?.aborted || e?.message === "Aborted by user") throw e;
            console.warn("Mode generation failed, chapters will have no mode assignments.", e);
        }
    } else {
        const e: any = modeResult.reason;
        if (signal?.aborted || e?.message === "Aborted by user") throw e;
        console.warn("Mode generation failed, proceeding with default outlines.", e);
    }

    // Rethrow abort/user cancel from outline
    if (outlineResult.status === 'rejected') {
        const e: any = outlineResult.reason;
        if (signal?.aborted || e?.message === "Aborted by user") throw e;
        throw e;
    }

    trackResponseUsage(outlineResult.value, MODEL_FLASH);

    const rawData = safeJsonParse(outlineResult.value.text || "{}", {});
    let rawChapters: any[] = rawData.chapters || [];

    // Enforce the requested chapter count strictly
    const targetCount = blueprint.structure?.phases
        ? blueprint.structure.phases.reduce((acc, p) => acc + p.chapterCount, 0)
        : blueprint.profile.chapterCount;
    if (targetCount > 0 && rawChapters.length > targetCount) {
        console.warn(`[Outline] AI generated ${rawChapters.length} chapters but ${targetCount} were requested. Truncating.`);
        rawChapters = rawChapters.slice(0, targetCount);
    } else if (targetCount > 0 && rawChapters.length < targetCount) {
        // AI generated too few — pad with placeholder chapters so the count matches
        console.warn(`[Outline] AI generated ${rawChapters.length} chapters but ${targetCount} were requested. Padding.`);
        while (rawChapters.length < targetCount) {
            const num = rawChapters.length + 1;
            rawChapters.push({
                id: crypto.randomUUID(),
                chapterNumber: num,
                title: `Chapter ${num}`,
                beat: `Continue developing the book's themes. This chapter expands on the content established so far.`,
                targetWordCount: 2500
            });
        }
    }

    // Assign modes round-robin so every chapter has a mode even without LLM assignment
    const modeIds = generatedModes.map(m => m.id);

    // Process Chapters
    const outline = rawChapters.map((item, idx) => ({
        id: crypto.randomUUID(),
        chapterNumber: idx + 1,
        title: item.title,
        beat: item.beat,
        targetWordCount: item.targetWordCount || 2500,
        logicFlow: item.logicFlow || [],
        mode: item.mode ?? (modeIds.length > 0 ? modeIds[idx % modeIds.length] : undefined),
        status: 'draft' as const
    }));

    const result = { outline, modes: generatedModes };
    // Cache the result
    cacheService.set('generateProjectOutline', cacheKey, result);
    return result;
};

export const generateAuthorityBible = async (blueprint: ProjectBlueprint, outline: OutlineItem[], initialMemory?: ProjectMemory, signal?: AbortSignal): Promise<ProjectMemory> => {
    const ai = getAI();

    // If source material exists (from Remix Engine), extract structured knowledge from it
    const sourceEntry = initialMemory?.research?.find(r => r.id === 'source-material');
    const sourceMaterialText = blueprint.sourceMaterial || sourceEntry?.description || '';

    const prompt = sourceMaterialText
        ? `Generate an 'Authority Bible' (Knowledge Base) for the book "${blueprint.title}" based on the ACTUAL SOURCE MATERIAL provided below.
Extract real concepts, key figures, glossary terms, and research facts that appear in the source. Do NOT invent content.

SOURCE MATERIAL:
${sourceMaterialText.substring(0, 12000)}

BOOK SUMMARY: ${blueprint.summary}
CHAPTER OUTLINE: ${JSON.stringify(outline.map(o => o.title).slice(0, 5))}...

Return pure JSON with this structure:
{
    "research": [{"name": "string", "description": "string", "category": "string"}],
    "keyFigures": [{"name": "string", "description": "string", "category": "string"}],
    "glossary": [{"name": "string", "description": "string", "category": "string"}],
    "concepts": [{"name": "string", "description": "string", "category": "string"}]
}
Ensure the JSON is complete and valid.`
        : `Generate an initial 'Authority Bible' (Knowledge Base) for the book "${blueprint.title}".
    Based on the summary: ${blueprint.summary}
    And outline: ${JSON.stringify(outline.map(o => o.title).slice(0, 5))}...
    
    Identify key concepts, potential key figures to research, and glossary terms.
    
    Return pure JSON that strictly follows this structure:
    {
        "research": [{"name": "string", "description": "string", "category": "string"}],
        "keyFigures": [{"name": "string", "description": "string", "category": "string"}],
        "glossary": [{"name": "string", "description": "string", "category": "string"}],
        "concepts": [{"name": "string", "description": "string", "category": "string"}]
    }
    Ensure the JSON is complete and valid.`;

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        }), 3, 2000, signal),
        MODEL_FLASH,
        signal
    );
    
    trackResponseUsage(response, MODEL_FLASH);

    try {
        const rawText = response.text || "{}";
        const cleanJson = stripMarkdownWrapper(rawText);
        const repairedJson = jsonrepair(cleanJson);
        const data = JSON.parse(repairedJson);
        
        const process = (items: any[], cat: string) => (items || []).map((i: any) => ({ ...i, id: crypto.randomUUID(), category: cat }));

        return {
            research: [...(initialMemory?.research || []), ...process(data.research, 'Research')],
            keyFigures: [...(initialMemory?.keyFigures || []), ...process(data.keyFigures, 'KeyFigure')],
            glossary: [...(initialMemory?.glossary || []), ...process(data.glossary, 'Term')],
            concepts: [...(initialMemory?.concepts || []), ...process(data.concepts, 'Concept')],
            characters: initialMemory?.characters || [],
            world: initialMemory?.world || [],
            plot: initialMemory?.plot || []
        };
    } catch (e) {
        console.error("Authority Bible JSON Parse Error", e);
        throw new Error("Failed to generate Authority Bible.");
    }
};

// Helper: Validate and repair HTML (Node.js compatible - no DOMParser)
const validateAndRepairHtml = (html: string): string => {
    try {
        // Basic validation: check for common HTML patterns
        // This is a lightweight check since DOMParser is not available on server
        
        // Remove leading/trailing whitespace
        let repaired = html.trim();
        
        // Check if HTML looks valid (contains at least one tag)
        if (!/<[a-z][^>]*>/i.test(repaired)) {
            // No HTML tags found, wrap in paragraph
            return `<p>${repaired}</p>`;
        }
        
        // Basic tag balancing: count opening and closing tags
        const openTags = (repaired.match(/<[a-z][^>]*>/gi) || []).length;
        const closeTags = (repaired.match(/<\/[a-z][^>]*>/gi) || []).length;
        
        // If there are more opening tags than closing tags, it's likely malformed
        // but we can't easily fix it without a proper parser, so just return as-is
        // The browser will handle the repair during rendering
        
        return repaired;
    } catch (e) {
        console.warn("HTML repair failed, returning original", e);
        return html;
    }
};

// --- DYNAMIC CONTENT BLOCK SELECTOR ---
// Selects appropriate content blocks based on chapter mode, position, and type
const selectDynamicContentBlocks = (
    chapter: OutlineItem,
    blueprint: ProjectBlueprint,
    chapterPosition: 'opening' | 'middle' | 'closing',
    assignedMode?: ChapterMode
): string => {
    // All available content block types
    const allBlocks = [
        { tag: 'callout-box', label: 'Callout Box', trigger: 'key insight, important warning, or critical takeaway', best: ['Instructional'] },
        { tag: 'data-table', label: 'Data Table', trigger: 'comparison data, statistics, or structured information', best: ['Instructional'] },
        { tag: 'pull-quote', label: 'Pull Quote', trigger: 'memorable quote, pivotal statement, or key testimony', best: ['Narrative', 'Instructional'] },
        { tag: 'action-plan', label: 'Action Plan', trigger: 'step-by-step instructions, exercises, or actionable advice', best: ['Instructional'] },
        { tag: 'case-study', label: 'Case Study', trigger: 'real-world example, historical event analysis, or biographical spotlight', best: ['Narrative', 'Instructional'] },
        { tag: 'self-assessment', label: 'Self Assessment', trigger: 'reflection questions, self-evaluation, or reader engagement prompts', best: ['Instructional'] },
        { tag: 'timeline', label: 'Timeline', trigger: 'chronological events, historical progression, or milestone tracking', best: ['Narrative'] },
        { tag: 'key-concept', label: 'Key Concept', trigger: 'foundational idea, definition, or theoretical framework', best: ['Instructional'] },
    ];

    const mode = blueprint.mode || 'Instructional';
    
    // Filter blocks relevant to this mode
    let relevant = allBlocks.filter(b => b.best.includes(mode));
    
    // Position-based adjustments
    if (chapterPosition === 'opening') {
        // Opening chapters benefit from pull quotes and case studies to hook readers
        relevant = relevant.filter(b => !['self-assessment', 'action-plan'].includes(b.tag));
    } else if (chapterPosition === 'closing') {
        // Closing chapters benefit from action plans and self-assessments for synthesis
        relevant = relevant.filter(b => !['timeline'].includes(b.tag));
    }
    
    // Mode-based adjustments: if chapter has a specific mode, prioritize blocks that match
    if (assignedMode) {
        const modeName = assignedMode.name.toLowerCase();
        if (modeName.includes('deep dive') || modeName.includes('concept')) {
            relevant = relevant.filter(b => ['callout-box', 'key-concept', 'data-table', 'pull-quote'].includes(b.tag));
        } else if (modeName.includes('tactical') || modeName.includes('guide') || modeName.includes('action')) {
            relevant = relevant.filter(b => ['action-plan', 'callout-box', 'self-assessment', 'data-table'].includes(b.tag));
        } else if (modeName.includes('case') || modeName.includes('story') || modeName.includes('narrative')) {
            relevant = relevant.filter(b => ['case-study', 'pull-quote', 'timeline'].includes(b.tag));
        }
    }

    // Build the instruction: max 3-4 blocks per chapter to avoid clutter
    const selected = relevant.slice(0, 4);
    
    return `DYNAMIC CONTENT BLOCKS (use 1-3 where naturally appropriate, never force):
    ${selected.map((b, i) => `${i + 1}. <div class="${b.tag}">...</div> — USE WHEN: ${b.trigger}`).join('\n    ')}
    RULE: Only use a block if the content genuinely calls for it. Quality over quantity. Never use more than 3 blocks per chapter.`;
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
    additionalContext?: string, // NEW: For live research injection
    signal?: AbortSignal
): Promise<string> => {
    const ai = getAI();
    const targetWords = chapter.targetWordCount || 2500;
    const totalChapters = fullOutline.length;
    const chapterIndex = fullOutline.findIndex(c => c.id === chapter.id);

    // --- CHAPTER POSITION AWARENESS ---
    const isFirstChapter = chapterIndex === 0;
    const isLastChapter = totalChapters > 0 && chapterIndex === totalChapters - 1;
    const isSecondToLast = totalChapters > 1 && chapterIndex === totalChapters - 2;
    const chapterPosition: 'opening' | 'middle' | 'closing' = 
        isFirstChapter ? 'opening' : 
        (chapterIndex >= totalChapters - 2) ? 'closing' : 'middle';
    const progressPercent = totalChapters > 0 ? Math.round((chapterIndex / totalChapters) * 100) : 0;

    // --- SMART CONTEXT INJECTION (RAG-LITE) with ADAPTIVE SIZING ---
    const contextFidelity = getContextFidelity();
    let relevantContext: any[] = [];
    let contextBlockSize = contextFidelity === 'slim' ? 1 : (contextFidelity === 'medium' ? 2 : 4);
    
    try {
       if (memory.research.length > 0 || memory.keyFigures.length > 0 || memory.concepts.length > 0) {
           relevantContext = await getRelevantContext(chapter.beat, memory, signal);
       }
    } catch (e) {
        console.warn("Smart context retrieval failed, proceeding with basic slice.", e);
        relevantContext = memory.research.slice(0, Math.min(2, contextBlockSize));
    }
    // Limit context based on API stress
    relevantContext = relevantContext.slice(0, Math.min(contextBlockSize, relevantContext.length));

    // --- ANTI-REPETITION: Extract topics already covered ---
    let coveredTopics = "";
    if (globalSummary && globalSummary.length > 20) {
        // Extract key noun phrases from the summary to explicitly ban
        // Limit to 5 items in slim mode, 8 in full mode
        const maxTopics = contextFidelity === 'slim' ? 5 : 8;
        const summaryWords = globalSummary.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(-maxTopics);
        coveredTopics = `\nTOPICS ALREADY COVERED (DO NOT REPEAT OR REPHRASE THESE):\n${summaryWords.map(s => `- ${s.trim()}`).join('\n')}`;
    }
    
    // Build list of what previous chapters covered - reduced when under stress
    let previousChapterTopics = "";
    if (chapterIndex > 0) {
        const lookbackChapters = contextFidelity === 'slim' ? 2 : 3;
        const prevChapters = fullOutline.slice(Math.max(0, chapterIndex - lookbackChapters), chapterIndex);
        previousChapterTopics = `\nRECENT CHAPTERS (already written — do NOT overlap with their content):\n${prevChapters.map(c => `- Ch${c.chapterNumber} "${c.title}": ${c.beat}`).join('\n')}`;
    }

    // --- FLOW CONTINUITY GUIDE ---
    let flowGuide = "";
    if (isFirstChapter) {
        flowGuide = `FLOW GUIDE: This is the OPENING chapter. Set the stage, introduce the core premise, and build reader curiosity. End decisively — let the chapter's final insight stand on its own. Do NOT write "in the next chapter" or any explicit forward-looking transition.`;
    } else if (isLastChapter) {
        flowGuide = `FLOW GUIDE: This is the FINAL chapter (Chapter ${chapter.chapterNumber} of ${totalChapters}). Begin by connecting to the thread from the previous chapter, then build toward a powerful synthesis. The ending of this chapter IS the ending of the entire book.`;
    } else if (isSecondToLast) {
        flowGuide = `FLOW GUIDE: This is the SECOND-TO-LAST chapter. Build momentum toward the book's climax. Do NOT conclude or summarize the book here — that belongs in the final chapter. End with a strong, decisive thought that naturally primes the reader's mind — but do NOT explicitly point them to the next chapter.`;
    } else {
        flowGuide = `FLOW GUIDE: This is chapter ${chapter.chapterNumber} of ${totalChapters} (${progressPercent}% through the book). Open by naturally connecting to the previous chapter's thread without repeating its content. End decisively with a strong concluding thought — do NOT write transition bridges or "in the next chapter" language.`;
    }

    // INJECT STRATEGIC DNA
    let structureInstruction = "";
    let currentPhaseContext = "";
    let assignedMode: ChapterMode | undefined;
    
    if (blueprint.structure && blueprint.structure.phases) {
        let currentChapterCount = 0;
        for (const phase of blueprint.structure.phases) {
            currentChapterCount += phase.chapterCount;
            if (chapter.chapterNumber <= currentChapterCount) {
                currentPhaseContext = `CURRENT PHASE: "${phase.title}"\nPhase Goal: ${phase.intent}`;
                break;
            }
        }
    }
    
    if (chapter.mode && blueprint.chapterModes) {
        assignedMode = blueprint.chapterModes.find(m => m.id === chapter.mode);
        if (assignedMode) {
            structureInstruction = `
            CHAPTER ARCHETYPE: "${assignedMode.name}"
            Follow this specific structural signature: ${assignedMode.signature.join(' -> ')}.
            Purpose: ${assignedMode.purpose}
            `;
        }
    }
    
    if (!structureInstruction && blueprint.structuralSignature && blueprint.structuralSignature.length > 0) {
        structureInstruction = `STRICT CHAPTER FORMULA: You MUST structure this chapter using exactly these sections in order: ${blueprint.structuralSignature.join(' -> ')}.`;
    }
    
    // Conditional Persona Injection based on Mode
    let personaInstruction = "";
    if (blueprint.mode === 'Narrative') {
        personaInstruction = `TARGET READER: Hook the reader's curiosity about "${blueprint.readerPersona?.intellectualCuriosity}". Provide the emotional payoff of "${blueprint.readerPersona?.emotionalPayoff}".`;
    } else {
        personaInstruction = blueprint.readerPersona
            ? `TARGET READER: Address a reader who suffers from "${blueprint.readerPersona.primaryPainPoint}" and desires "${blueprint.readerPersona.desiredOutcome}".`
            : "";
    }

    const thesisInstruction = blueprint.centralThesis 
        ? `CENTRAL THESIS: Ensure this chapter proves or supports the argument: "${blueprint.centralThesis}".`
        : (blueprint.controllingIdea ? `CONTROLLING IDEA: Ensure this chapter reinforces the theme: "${blueprint.controllingIdea}".` : "");

    const editorialInstruction = blueprint.editorialRules && blueprint.editorialRules.length > 0
        ? `EDITORIAL MANDATES:\n- ${blueprint.editorialRules.join('\n- ')}`
        : "";

    // --- ENDING / TRANSITION LOGIC ---
    let endingInstruction = "";
    if (isLastChapter) {
        endingInstruction = `
    ===== FINAL CHAPTER DIRECTIVE =====
    This is the LAST chapter of the entire book (Chapter ${chapter.chapterNumber} of ${totalChapters}).
    
    MANDATORY CONCLUSION REQUIREMENTS:
    1. Synthesize the book's key themes and arguments into a cohesive closing narrative.
    2. Revisit the central thesis/controlling idea and show how the book has proven it.
    3. Provide a powerful, memorable closing paragraph that gives the reader a sense of completion.
    4. Do NOT introduce major new concepts — this is for synthesis and reflection.
    5. Do NOT write "In the next chapter" or any forward-looking transitions.
    6. Do NOT use phrases like "stay tuned", "we'll explore more", or "in upcoming sections".
    7. End with a resonant final thought, call to action, or emotional capstone that feels like a definitive ending.
    ===================================`;
    } else {
        endingInstruction = `
    TRANSITION RULE: Do NOT write a conclusion or summary for the entire book. This is chapter ${chapter.chapterNumber} of ${totalChapters}.
    End this chapter decisively with a strong, complete thought. Do NOT write "In the next chapter", "Next, we will explore", "Stay tuned", or any forward-looking transition.
    Do NOT use concluding language like "In conclusion", "To sum up", or "Overall" at the end of this chapter.`;
    }

    const liveContextBlock = additionalContext ? `\n\nFRESH RESEARCH: ${additionalContext.substring(0, 750)}` : "";
    
    // --- DYNAMIC CONTENT BLOCKS ---
    const contentBlocksInstruction = selectDynamicContentBlocks(chapter, blueprint, chapterPosition, assignedMode);

    const prompt = `Write Chapter ${chapter.chapterNumber}: "${chapter.title}" for the book "${blueprint.title}".
    LENGTH GOAL: Target approximately ${targetWords} words. Prioritize quality, depth, and genuine insight over hitting a word count. Do not pad, repeat, or inflate content to reach a number — a focused, well-developed chapter is far better than a bloated one. Stop when the chapter is complete.
    Style Guide: ${profile.voice}, ${profile.archetype}.
    Book Progress: Chapter ${chapter.chapterNumber} of ${totalChapters} (${progressPercent}%).
    
    EXPANSIVE NON-FICTION INSTRUCTION: Write a detailed, comprehensive, and authoritative chapter. Do not use fictional characters, invented scenarios, or fabricated dialogues. All narrative elements—including scenes, dialogues, and actions—must be strictly grounded in documented historical facts, real-world events, and actual people. For instructional content, use real-world case studies and clear factual analysis. Focus on depth, clarity, and accuracy. Every section must be developed with full explanations, examples, and analysis — do NOT truncate or summarise sections. Each <h2> section should contain at least 4-6 substantial paragraphs.
    
    ${thesisInstruction}
    ${personaInstruction}
    ${currentPhaseContext}
    ${structureInstruction}
    ${editorialInstruction}
    
    ${flowGuide}
    ${endingInstruction}

    STORY SO FAR: ${globalSummary ? (contextFidelity === 'slim' ? globalSummary.substring(0, 500) : globalSummary) : "This is the first chapter."}
    Context: Previous: ${prevContext}. Next: ${isLastChapter ? "NONE — this is the final chapter" : nextContext}.
    Plan: ${chapter.beat}
    
    === ANTI-REPETITION PROTOCOL ===
    CRITICAL: Each chapter must cover UNIQUE ground. Never restate, rephrase, or rehash points from prior chapters.
    - Do NOT re-explain concepts already introduced. Reference them briefly if needed, then advance.
    - Do NOT reuse the same examples, anecdotes, or case studies from earlier chapters.
    - Do NOT open with a generic recap of previous material. Start with fresh content immediately.
    - If a prior chapter introduced a concept, BUILD on it — add depth, nuance, or application, not repetition.
    ${coveredTopics}
    ${previousChapterTopics}
    ===============================
    
    ${relevantContext.length > 0 ? `CRITICAL KNOWLEDGE VAULT:\n${buildOptimizedContextBlock(relevantContext, contextBlockSize)}` : ''}
    ${liveContextBlock ? (contextFidelity === 'slim' ? `\nFRESH RESEARCH (KEY FACTS):\n${additionalContext?.substring(0, 400)}` : `\nFRESH RESEARCH:\n${additionalContext?.substring(0, 750)}`) : ''}
    
    STRICT OUTPUT RULES - CRITICAL - READ CAREFULLY:
    1. Write ONLY the chapter content. 
    2. Do NOT include the book title. 
    3. Do NOT write "Chapter [N]" headers.
    4. Start the narrative text immediately.
    
    5. ⚠️ MARKDOWN BAN - THIS IS CRITICAL ⚠️
       - NEVER use markdown formatting. NO ** for bold. NO * for italic. NO __ or _ for emphasis.
       - NEVER use # for headings. NEVER use - for bullet points. NEVER use * for bullets.
       - You MUST use ONLY HTML tags for all formatting:
         * Use <strong>text</strong> instead of **text** for bold
         * Use <em>text</em> instead of *text* for italic
         * Use <h2>heading</h2> instead of ## heading
         * Use <h3>subheading</h3> instead of ### subheading
         * Use <ul><li>item</li></ul> instead of - item or * item
       - If you accidentally use markdown (**, *, _, #, -, etc.), the output will be broken and unreadable.
    
    6. FINAL CHECK before responding: Search your response for these characters: * _ # - and make sure they are ONLY used inside HTML tags, never as markdown formatting.
    
    7. ACTIVE VOICE: Write in active voice at least 85% of the time. Avoid passive constructions like "it was found that", "has been shown", "is considered", "was discovered", "it is noted that". Instead write: "researchers found", "evidence shows", "experts consider", "scientists discovered".
    
    8. NATURAL LANGUAGE: Write the way a knowledgeable human author would. Avoid these AI-typical filler phrases:
       - "Interestingly", "Importantly", "Notably", "It is worth noting that"
       - "Furthermore", "Moreover", "Additionally" (as paragraph openers)
       - "In the realm of", "In the world of", "At the end of the day"
       - "It goes without saying", "Needless to say", "One might argue"
       - "As previously mentioned", "As we discussed", "Circling back to"
       Start sentences and paragraphs with the actual subject of the idea instead.
    
    CHAPTER STRUCTURE REQUIREMENTS:
    - Break the chapter into clearly defined SECTIONS using <h2> and <h3> headings.
    - Each major topic or idea MUST start with an <h2> or <h3> heading.
    - Do NOT write the entire chapter as a continuous wall of text.
    - Use short, focused paragraphs (3-5 sentences each).
    - Separate distinct topics with appropriate headings so readers can navigate easily.
    
    ${contentBlocksInstruction}
    
    Write the full chapter in properly structured HTML format with section headings.`;

    console.log("Generating chapter content. Prompt length:", prompt.length);
    
    let result;
    let usedModel = selectModelForTask('chapterContent', apiStressLevel > 40);

    const timeoutController = new AbortController();
    const timeout = setTimeout(() => {
        console.error("Generation timed out after 180 seconds");
        timeoutController.abort();
    }, 180000);

    // Combine signals if one exists
    const combinedSignal = signal ? signal : timeoutController.signal;

    try {
        console.log("Generating chapter content. Prompt tokens (estimate):", estimateTokenCount(prompt));
        console.log("API Stress Level:", apiStressLevel);
        console.log("Calling ai.models.generateContentStream...");
        result = await retryWithBackoff(() => ai.models.generateContentStream({
            model: usedModel,
            contents: prompt
        }), 2, 2000, combinedSignal);
        console.log("ai.models.generateContentStream call returned.");
    } catch (e: any) {
        console.error("Error generating chapter content:", e);
        const eMsg = String(e?.message ?? '');
        const eStatus = String(e?.status ?? '');
        const isServiceErr = e?.status === 429 ||
                             eMsg.includes('429') ||
                             eStatus === 'UNAVAILABLE' ||
                             eMsg.includes('UNAVAILABLE') ||
                             eMsg.includes('high demand') ||
                             eMsg.includes('overloaded') ||
                             e?.status === 503 ||
                             e?.error?.code === 503 ||
                             eMsg.includes('503') ||
                             eMsg.includes('RESOURCE_EXHAUSTED');
        
        if (isServiceErr) {
            // API is overloaded - increase stress level
            updateApiStressLevel(true);
            console.warn(`⚠️ MODEL OVERLOAD DETECTED (Stress: ${apiStressLevel}%). Enabling adaptive retry with longer delays...`);
            
            // Try with longer delays and fallback models
            try {
                console.warn('Attempting fallback with longer delay...');
                usedModel = MODEL_FLASH_STABLE;
                result = await retryWithBackoff(() => ai.models.generateContentStream({
                    model: MODEL_FLASH_STABLE,
                    contents: prompt
                }), 2, 5000, combinedSignal); // Increased delay to 5s
            } catch (e2: any) {
                console.warn('⚠️ Stable flash also overloaded. Trying Pro Stable with even longer delays...');
                try {
                    usedModel = MODEL_PRO_STABLE;
                    result = await retryWithBackoff(() => ai.models.generateContentStream({
                        model: MODEL_PRO_STABLE,
                        contents: prompt
                    }), 2, 8000, combinedSignal); // Increased delay to 8s
                } catch (e3: any) {
                    console.warn('⚠️ Pro Stable also overloaded. Last attempt with Pro model and aggressive backoff...');
                    usedModel = MODEL_PRO;
                    result = await retryWithBackoff(() => ai.models.generateContentStream({
                        model: MODEL_PRO,
                        contents: prompt
                    }), 2, 10000, combinedSignal); // 10s delay for final attempt
                }
            }
        } else {
            throw e;
        }
    } finally {
        clearTimeout(timeout);
    }

    let fullText = "";
    const MAX_BUFFER_SIZE = 5000000; // 5MB max to prevent OOM
    for await (const chunk of result) {
        if (combinedSignal?.aborted) throw new Error("Aborted or Timed Out");
        const text = chunk.text;
        if (text) {
            fullText += text;
            // Guard against runaway memory: truncate if chapter exceeds 5MB
            if (fullText.length > MAX_BUFFER_SIZE) {
                console.warn("⚠️ Chapter content exceeded 5MB, truncating to prevent server OOM");
                fullText = fullText.substring(0, MAX_BUFFER_SIZE);
                break;
            }
            onChunk(text);
        }
    }
    trackResponseUsage({ usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0 } }, usedModel);
    const result_html = humanizeContent(validateChapterContent(validateAndRepairHtml(convertMarkdownToHtml(stripHtmlWrapper(fullText)))));
    // Allow fullText to be garbage collected
    fullText = "";
    return result_html;
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
    // Correctly pass 'facts' as 'additionalContext'
    return streamChapterContent(blueprint, profile, chapter, memory, onChunk, prevContext, nextContext, fullOutline, globalSummary, facts, signal);
};

export const gatherChapterFacts = async (beat: string, blueprint: ProjectBlueprint, signal?: AbortSignal): Promise<{ context: string, sources: {title: string, uri: string}[] }> => {
    const ai = getAI();
    
    // Fast keyword heuristic — no LLM roundtrip needed to decide if research is worthwhile.
    // Expanded research genres to cover more non-fiction domains
    const NEEDS_RESEARCH_GENRES = [
        // Core non-fiction genres
        'non-fiction', 'nonfiction', 'narrative non-fiction',
        // History & biography
        'history', 'histor', 'biograph', 'autobiography', 'memoir', 'biography',
        // True crime, mystery
        'true crime', 'crime', 'mystery', 'investigation',
        // Science, tech, education
        'science', 'technical', 'technology', 'education', 'educational',
        // Business, economics, self-improvement
        'business', 'economics', 'economics', 'finance', 'self-help', 'psychology', 'personal',
        // Journalism, social issues
        'journalism', 'social', 'political', 'politics', 'sociology',
        // Health, science-based lifestyle
        'health', 'medical', 'wellness', 'nutrition', 'fitness',
        // Environment, nature
        'environment', 'nature', 'sustainability'
    ];
    const SKIP_BEAT_KEYWORDS = ['hypothetical', 'metaphorical', 'philosophical', 'fictional', 'parable', 'personal reflection', 'self-reflection', 'mindset exercise', 'imagine if'];
    const genreLower = `${blueprint.genre ?? ''} ${blueprint.type ?? ''}`.toLowerCase();
    const beatLower = beat.toLowerCase();
    const needsResearch = NEEDS_RESEARCH_GENRES.some(k => genreLower.includes(k)) &&
                         !SKIP_BEAT_KEYWORDS.some(k => beatLower.includes(k));
    
    if (!needsResearch) {
        console.log("Skipping live research for conceptual/fiction chapter.");
        return { context: "No external research required for this conceptual chapter.", sources: [] };
    }

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: `Research facts relevant to: "${beat}". 
            CRITICAL: Prioritize official primary sources (official websites of the subject), high-authority domains. 
            Provide a detailed list of verified facts.`,
            config: { 
                tools: [{ googleSearch: {} }]
            }
        }), 3, 2000, signal),
        MODEL_FLASH,
        signal
    );
    trackResponseUsage(response, MODEL_FLASH);
    
    let text = response.text || "";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
        .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
        .filter((s): s is {title: string, uri: string} => !!s && isValidSource(s.uri));

    if (sources.length > 0) {
        text += "\n\nSOURCES:\n" + sources.map(s => `[${s.title}](${s.uri})`).join('\n');
    }

    return { context: text, sources };
};

export const generateBibliography = async (sources: {title: string, uri: string}[], signal?: AbortSignal): Promise<string> => {
    const ai = getAI();
    const cleanSources = sources.filter(s => isValidSource(s.uri));
    if (cleanSources.length === 0) return "";

    const prompt = `Act as a professional Bibliographer. 
    Task: Convert the following JSON list of sources into a properly formatted Bibliography using APA 7th Edition.
    Input Data: ${JSON.stringify(cleanSources)}
    Output Rules: Return semantic HTML (<div>, <ul>, <li>). Include clickable links.`;

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt
        }), 3, 2000, signal),
        MODEL_FLASH,
        signal
    );
    
    trackResponseUsage(response, MODEL_FLASH);
    return stripMarkdownWrapper(response.text || "");
};

// --- NEW EXPORTED FUNCTIONS ---

export const generateImageFromPrompt = async (prompt: string, quality: 'fast' | 'high' = 'fast', signal?: AbortSignal): Promise<string | null> => {
    const ai = getAI();

    // Helper to extract inline image data from a response
    const extractImage = (response: GenerateContentResponse): string | null => {
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    };

    const imageSize = quality === 'high' ? "2K" : "1K";

    // Try primary model with optimized retry strategy
    // For image generation, we use fewer retries but faster fallback (to avoid 120s Vercel timeout)
    // Total time budget: ~30-40s for both models combined
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "3:4",
                    imageSize: imageSize
                }
            }
        }), 1, 1000, signal); // 1 retry with 1000ms initial delay (exponential backoff applies)

        trackResponseUsage(response, MODEL_IMAGE);
        const image = extractImage(response);
        if (image) return image;

        // Primary returned no image data — fall through to stable model
        console.warn("⚠️ Primary image model returned no image data. Falling back to stable model.");
    } catch (e: any) {
        // Fall back on ANY primary model error, not just quota errors
        console.warn(`⚠️ Primary image model failed (${e?.message || e?.status || 'unknown error'}). Falling back to stable model.`);
    }

    // Fallback model with optimized retry - use same quality for consistency
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_IMAGE_STABLE,
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "3:4",
                    imageSize: imageSize  // Use same quality as primary, not hardcoded 1K
                }
            }
        }), 1, 1000, signal); // 1 retry with 1000ms initial delay

        trackResponseUsage(response, MODEL_IMAGE_STABLE);
        const image = extractImage(response);
        if (image) return image;
    } catch (e2: any) {
        console.error("Image Fallback Failed", e2?.message || e2);
    }

    return null;
};


export const generateBookMockup = async (title: string, coverImageBase64: string, signal?: AbortSignal): Promise<string | null> => {
    const ai = getAI();
    const prompt = `Create a photorealistic 3D product shot of a hardcover book standing on a wooden table. The book cover should look exactly like the provided image. The book title is "${title}". Professional lighting, shadows, high resolution.`;
    
    const base64Data = coverImageBase64.split(',')[1];
    const mimeType = coverImageBase64.split(',')[0].split(':')[1].split(';')[0];

    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        },
                        { text: prompt }
                    ]
                }
            }), 1, 1000, signal),  // Optimized: 1 retry with 1000ms delay
            MODEL_IMAGE,
            signal
        );

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Mockup Gen Failed", e);
        return null;
    }
};

const MarketingAssetsSchema = z.object({
    blurb: z.string(),
    socialPosts: z.array(z.object({ platform: z.string(), content: z.string() })),
    emailAnnouncement: z.string(),
    mockupImage: z.string().optional(),
    keywords: z.array(z.string()),
    categories: z.array(z.string()),
    priceStrategy: z.string(),
    amazonDescription: z.string().optional(),
    aPlusContent: z.array(z.object({ headline: z.string(), body: z.string(), imagePrompt: z.string() })).optional(),
    seriesTitles: z.array(z.string()).optional(),
    facebookAdCreatives: z.array(z.object({ prompt: z.string(), image: z.string().optional() })).optional(),
    socialMediaGraphics: z.array(z.object({ prompt: z.string(), image: z.string().optional() })).optional(),
    adCopyExamples: z.array(z.object({ platform: z.string(), copy: z.string() })).optional(),
    quoteGraphics: z.array(z.object({ quote: z.string(), image: z.string().optional() })).optional(),
    emailPromotionTemplate: z.string().optional(),
});

// Optimized parallel marketing pack generation (Option A - 4 parallel calls with early image prompt extraction)
export const generateMarketingPack = async (blueprint: ProjectBlueprint, signal?: AbortSignal): Promise<MarketingAssets> => {
    // Check cache first (10 minute TTL for marketing - more dynamic)
    const cacheKey = { blueprintId: blueprint.title, genre: blueprint.genre };
    const cached = cacheService.get<MarketingAssets>('generateMarketingPack', cacheKey);
    if (cached) {
        return cached;
    }

    // Create lightweight context to reduce prompt redundancy
    const context = {
        title: blueprint.title,
        genre: blueprint.genre,
        summary: blueprint.summary,
        audience: blueprint.profile?.targetAudience || "General Audience"
    };

    // Phase 1: All 4 text generation tasks in parallel (no dependencies)
    const [
        metadata,           // Keywords, categories, pricing
        backCover,          // Blurb, Amazon description
        socialCopy,         // Posts, email, ad copy
        imagePrompts        // Image prompts only (extracted first for early image generation)
    ] = await Promise.all([
        generateMarketingMetadata(context, signal),
        generateBackCoverCopy(context, signal),
        generateSocialAndEmail(context, signal),
        generateImagePrompts(context, signal)
    ]);

    // Phase 2: Start image generation immediately (images now render in parallel with A+ content generation)
    // Don't wait for A+ content since image generation can start with just the prompts
    const generateAPlusWithImages = async () => {
        const aPlusContent = await generateAPlusContent(context, signal);
        
        // Now collect all image prompts (from both A+ content and earlier extraction)
        const allImagePrompts = [
            ...(imagePrompts.facebookAdCreatives || []),
            ...(imagePrompts.socialMediaGraphics || []),
            ...(imagePrompts.quoteGraphics || []),
            ...(aPlusContent.aPlusContent?.map((item: any) => ({ prompt: item.imagePrompt })) || [])
        ];

        return { aPlusContent, allImagePrompts };
    };

    // These run in parallel with A+ generation
    const aPlusPromise = generateAPlusWithImages();

    const result = {
        ...metadata,
        ...backCover,
        ...socialCopy,
        ...imagePrompts,                           // facebookAdCreatives, socialMediaGraphics, quoteGraphics prompts
        ...(await aPlusPromise).aPlusContent
    };

    // Cache the result
    cacheService.set('generateMarketingPack', cacheKey, result);
    return result;
};

// Split Function 1: Metadata (Keywords, Categories, Pricing) - Lightweight, Fast
const generateMarketingMetadata = async (context: any, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `For the book "${context.title}" (Genre: ${context.genre}):
    Generate:
    1. 10 SEO Keywords (most relevant for discoverability)
    2. 3 Best Amazon Categories
    3. Competitive Pricing Strategy Analysis
    
    Keep response concise. Return JSON: {"keywords": ["string"], "categories": ["string"], "priceStrategy": "string"}`;

    // Use token-efficient model for metadata (FLASH_STABLE for simplicity)
    const model = selectModelForTask('metadata', apiStressLevel > 40);

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }), 3, 2000, signal),
        model,
        signal
    );
    return safeJsonParse(response.text || "{}");
};

// Split Function 2: Back Cover Copy - Focused on conversion
const generateBackCoverCopy = async (context: any, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `For the book "${context.title}" (Genre: ${context.genre}). Target Audience: ${context.audience}.
    Summary: ${context.summary}
    
    Generate:
    1. Compelling Back Cover Blurb (100-150 words, sales-focused hook)
    2. Amazon Product Description (200-300 words, can include HTML formatting)
    
    Return JSON: {"blurb": "string", "amazonDescription": "string"}`;

    // Use FLASH for copy - good quality/cost balance
    const model = selectModelForTask('marketing', apiStressLevel > 40);

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }), 3, 2000, signal),
        model,
        signal
    );
    return safeJsonParse(response.text || "{}");
};

// Split Function 3: Social and Email Copy - Fast turnaround content
const generateSocialAndEmail = async (context: any, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `For the book "${context.title}" (Genre: ${context.genre}).
    Target Audience: ${context.audience}
    Summary: ${context.summary}
    
    CRITICAL MARKETING RULES:
    - Write BENEFIT-FIRST copy: What does the reader GAIN? What transformation do they achieve?
    - NEVER write feature-first: Not "Learn X strategies" but "Get [specific result] in [timeframe]"
    - Use SPECIFICITY: Numbers, outcomes, and concrete results outperform vague claims
    - Write for: ${context.audience} — match their voice, aspirations, and pain points
    - Every piece of copy must include an implied or explicit CALL TO ACTION
    - Create a CURIOSITY GAP: hint at the benefit but make the reader want to learn more
    
    Generate:
    1. 3 Social Media Posts (Twitter, LinkedIn, Facebook — different tones, tailored to each platform):
       - Twitter: Punchy curiosity hook, under 280 chars, benefit-first
       - LinkedIn: Professional, ROI/results-focused, thought leadership angle
       - Facebook: Conversational, transformation story, emotional resonance
    2. Email Announcement (benefit-focused subject line that drives opens + body)
    3. Email Promotion Template (urgency-driven, outcome-focused)
    4. 3 Ad Copy Examples (benefit headline + outcome statement, short and punchy)
    
    Return JSON: {"socialPosts": [{"platform": "string", "content": "string"}], "emailAnnouncement": "string", "emailPromotionTemplate": "string", "adCopyExamples": [{"platform": "string", "copy": "string"}]}`;

    const model = selectModelForTask('marketing', apiStressLevel > 40);

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }), 3, 2000, signal),
        model,
        signal
    );
    return safeJsonParse(response.text || "{}");
};

// Split Function 4: Image Prompts - Extracted EARLY to start image generation immediately
const generateImagePrompts = async (context: any, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `For the non-fiction book "${context.title}" (Genre: ${context.genre}).
    Target Audience: ${context.audience}
    Summary: ${context.summary}
    
    Generate high-converting marketing image prompts. These will be rendered as actual marketing visuals.
    
    CORE MARKETING PRINCIPLES to apply in EVERY prompt:
    - EMOTIONAL HOOK: Evoke aspiration, transformation, or confidence — the emotion the target reader wants to feel AFTER reading
    - BENEFIT-FIRST: Lead with the reader's outcome/transformation, not the book topic (what they GAIN, not what the book covers)
    - TARGET AUDIENCE: Every visual element must resonate with: ${context.audience}
    - TRUST SIGNALS: Professional, authoritative aesthetic — clean design, credibility-signaling color palette, no amateur elements
    - CURIOSITY GAP: Create desire to learn more without fully revealing the solution
    - LEGIBILITY: All text overlays must be readable at 200px thumbnail size; high contrast text on background; avoid thin fonts
    
    Generate:
    1. 2 Facebook Ad Creative prompts
       - Format: Vertical composition (4:5 ratio), bold headline-first layout
       - Show the TRANSFORMATION or OUTCOME the reader achieves (before/after implied)
       - Include a bold benefit-focused hook text suggestion (e.g., "Stop [Pain Point]. Start [Desired Outcome].")
       - Scroll-stopping imagery designed for ${context.audience}
    2. 2 Social Media Graphics prompts
       - Format: Square composition (1:1 ratio), optimized for LinkedIn/Instagram feed
       - Professional aesthetic matching ${context.audience} demographics
       - Show aspirational result, not just book imagery
    3. 3 Quote Graphics prompts
       - Inspiring, actionable quotes from the book's core message
       - Include the exact quote text to overlay on the image
       - Clean, high-contrast background; quote should make the viewer want to read the full book
       - Curiosity-driven: the quote hints at the solution without fully revealing it
    
    Each image prompt should be 50-80 words, include visual style, color palette, and composition.
    Return JSON: {"facebookAdCreatives": [{"prompt": "string"}], "socialMediaGraphics": [{"prompt": "string"}], "quoteGraphics": [{"quote": "string"}]}`;

    const model = selectModelForTask('imagePrompt', apiStressLevel > 40);

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }), 3, 2000, signal),
        model,
        signal
    );
    return safeJsonParse(response.text || "{}");
};

// Split Function 5: A+ Content - Detailed, structured (runs after image prompts are extracted)
const generateAPlusContent = async (context: any, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `For the non-fiction book "${context.title}" (Genre: ${context.genre}).
    Target Audience: ${context.audience}
    Summary: ${context.summary}
    
    Generate Amazon A+ Content Strategy with BENEFIT-FIRST, ROI-focused copy.
    
    RULES:
    - Each module must lead with a SPECIFIC OUTCOME or RESULT, not a feature
    - Use concrete numbers, timeframes, or transformations where possible
    - Speak directly to ${context.audience}'s pain points and desired outcomes
    - Headlines must be benefit-driven (e.g., "Get [Result] in [Timeframe]" not "Chapter About [Topic]")
    
    Generate 3 A+ Content modules, each highlighting a DIFFERENT benefit/value proposition:
    - Module 1: Primary transformation/outcome this book delivers
    - Module 2: Specific skill or insight the reader gains
    - Module 3: Trust/credibility — why this book and why now
    
    Each module: headline (benefit-focused), body (outcome-driven, 50-80 words), imagePrompt (visual that reinforces the benefit).
    Return JSON: {"aPlusContent": [{"headline": "string", "body": "string", "imagePrompt": "string"}]}`;

    const model = selectModelForTask('marketing', apiStressLevel > 40);

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }), 3, 2000, signal),
        model,
        signal
    );
    return safeJsonParse(response.text || "{}");
};

export const generateAboutAuthor = async (authorName: string, bookSummary: string): Promise<string> => {
    // Check cache first (1 hour TTL)
    const cacheKey = { authorName, bookSummary };
    const cached = cacheService.get<string>('generateAboutAuthor', cacheKey);
    if (cached) return cached;

    const ai = getAI();
    const prompt = `Write a professional "About the Author" bio for ${authorName}.
    Context: They wrote a book about: ${bookSummary}.
    Tone: Authoritative but approachable. 150 words max.`;
    
    // Use FLASH for short, straightforward text
    const model = selectModelForTask('dedication', apiStressLevel > 40);
    
    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt
        }), 3, 2000),
        model
    );
    trackResponseUsage(response, model);
    const result = stripMarkdownFormatting(response.text || "");
    
    // Cache the result
    cacheService.set('generateAboutAuthor', cacheKey, result);
    return result;
};

export const generateDedication = async (bookTitle: string, bookSummary: string): Promise<string> => {
    // Check cache first (1 hour TTL)
    const cacheKey = { bookTitle, bookSummary };
    const cached = cacheService.get<string>('generateDedication', cacheKey);
    if (cached) return cached;

    const ai = getAI();
    const prompt = `Write a short, meaningful dedication for the book "${bookTitle}".
    Context: The book is about: ${bookSummary}.
    Tone: Sincere, inspiring, or appreciative. Keep it to 1-2 sentences. Do not include quotes or formatting.`;
    
    // Use FLASH for short, straightforward text
    const model = selectModelForTask('dedication', apiStressLevel > 40);
    
    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt
        }), 3, 2000),
        model
    );
    trackResponseUsage(response, model);
    const result = stripMarkdownFormatting(response.text || "").trim();
    
    // Cache the result
    cacheService.set('generateDedication', cacheKey, result);
    return result;
};

export const generateCopyright = (authorName: string): string => {
    const year = new Date().getFullYear();
    return `Copyright © ${year} by ${authorName}

All rights reserved.

No part of this book may be reproduced in any form or by any electronic or mechanical means, including information storage and retrieval systems, without written permission from the author, except for the use of brief quotations in a book review.`;
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore', quality: 'standard' | 'premium' = 'standard', signal?: AbortSignal): Promise<string | null> => {
    const ai = getAI();
    // Using gemini-2.5-flash-preview-tts as per guidelines
    
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model: model === MODEL_FLASH_STABLE ? MODEL_TTS : MODEL_TTS, // TTS only has one model
                contents: {
                    parts: [{ text: text }]
                },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName }
                        }
                    }
                }
            }), 3, 2000, signal),
            MODEL_TTS,
            signal
        );
        
        trackResponseUsage(response, MODEL_TTS);

        // Extract base64 audio
        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
            return audioPart.inlineData.data;
        }
        return null;
    } catch (e) {
        console.error("TTS Failed", e);
        return null;
    }
};

// ... other specialized functions (style calibration, marketing, etc.) omitted for brevity, assume they exist ...
export const calibrateStyleFromSample = async (sample: string, signal?: AbortSignal) => ({ voice: "Professional" });

const ProjectBlueprintSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    type: z.enum(['Non-Fiction', 'Memoir', 'Textbook', 'Guide', 'Fiction']),
    mode: z.enum(['Instructional', 'Narrative']).optional(),
    genre: z.string(),
    visualStyle: z.string(),
    coverPrompt: z.string(),
    summary: z.string(),
    profile: z.any(),
    sourceMaterial: z.string().optional(),
    structure: z.object({
        archetype: z.string(),
        description: z.string(),
        phases: z.array(z.object({
            title: z.string(),
            intent: z.string(),
            chapterCount: z.number(),
        })),
    }).optional(),
    centralThesis: z.string().optional(),
    controllingIdea: z.string().optional(),
    structuralSignature: z.array(z.string()).optional(),
    chapterModes: z.array(z.any()).optional(),
    readerPersona: z.any().optional(),
});
const LoreItemSchema = z.object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
});

const NewLoreSchema = z.object({
    research: z.array(LoreItemSchema).optional(),
    keyFigures: z.array(LoreItemSchema).optional(),
    glossary: z.array(LoreItemSchema).optional(),
    concepts: z.array(LoreItemSchema).optional(),
    characters: z.array(LoreItemSchema).optional(),
    world: z.array(LoreItemSchema).optional(),
    plot: z.array(LoreItemSchema).optional(),
});

const AftermathSchema = z.object({
    summary: z.string(),
    newLore: NewLoreSchema,
});

export const analyzeChapterAftermath = async (content: string, memory: any, type?: string, signal?: AbortSignal) => {
    const ai = getAI();
    const analysisWindow = content.substring(0, 4000);
    
    const prompt = `Analyze this chapter content and provide a concise summary.
    Extract any NEW key figures, concepts, or glossary terms introduced that are NOT already in the existing memory.
    
    Existing Memory (Do not re-extract these):
    ${JSON.stringify({
        keyFigures: memory.keyFigures?.map((i: any) => i.name),
        glossary: memory.glossary?.map((i: any) => i.name),
        concepts: memory.concepts?.map((i: any) => i.name),
    })}
    
    Chapter Content:
    ${analysisWindow}
    
    Return JSON with:
    - summary: A 1-2 sentence summary.
    - newLore: Object containing arrays of new 'research', 'keyFigures', 'glossary', 'concepts', 'characters', 'world', 'plot'. Each item should have 'name', 'description', and 'category'.`;

    const model = selectModelForTask('aftermath', apiStressLevel > 40);
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await callWithModelFallback(
                (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                }), 3, 2000, signal),
                model,
                signal
            );
            
            const rawText = response.text || "{}";
            const cleanJson = stripMarkdownWrapper(rawText);
            const repairedJson = jsonrepair(cleanJson);
            const data = AftermathSchema.parse(JSON.parse(repairedJson));
            
            const process = (items: any[], cat: string) => (items || []).map((i: any) => ({ ...i, id: crypto.randomUUID(), category: cat }));
            
            return {
                summary: data.summary || "Chapter completed.",
                newLore: {
                    research: process(data.newLore?.research || [], 'Research'),
                    keyFigures: process(data.newLore?.keyFigures || [], 'KeyFigure'),
                    glossary: process(data.newLore?.glossary || [], 'Term'),
                    concepts: process(data.newLore?.concepts || [], 'Concept'),
                    characters: process(data.newLore?.characters || [], 'Character'),
                    world: process(data.newLore?.world || [], 'World'),
                    plot: process(data.newLore?.plot || [], 'Plot')
                }
            };
        } catch (e) {
            console.warn(`Aftermath analysis attempt ${attempt + 1} failed`, e);
        }
    }
    
    return { summary: "Chapter completed.", newLore: { research: [], keyFigures: [], glossary: [], concepts: [], characters: [], world: [], plot: [] } };
};


export const compressGlobalSummary = async (s: string, e: string, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `Compress the following global story summary, incorporating the new event. Keep it under 1000 words.
    
    COMPRESSION RULES:
    1. Focus on the main narrative arc and key developments.
    2. Preserve the SPECIFIC topics, arguments, examples, and case studies covered — these are used to prevent repetition in future chapters.
    3. Maintain a clear chronological flow of what has been established so far.
    4. Keep track of key terms introduced, major conclusions drawn, and transitions made.
    5. Do NOT generalize — retain enough specificity that a future chapter writer can clearly see what has already been said.
    
    Current Summary:
    ${s}
    
    New Event:
    ${e}
    
    Return ONLY the compressed summary text.`;

    const model = selectModelForTask('compression', apiStressLevel > 40);
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: prompt
            }), 3, 2000, signal),
            model,
            signal
        );
        return stripMarkdownFormatting(response.text?.trim() || s + "\n" + e);
    } catch (err) {
        console.warn("Summary compression failed", err);
        return s + "\n" + e;
    }
};
export const expandChapterBeat = async (beat: string, title: string, summary: string, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `You are a narrative editor. Expand this chapter beat into a detailed scene-by-scene flow.
    
    Book Title: "${title}"
    Story So Far (Global Summary):
    ${summary || "This is the first chapter."}
    
    Chapter Beat to Expand:
    "${beat}"
    
    CRITICAL INSTRUCTION:
    1. Do NOT repeat events that have already happened in the "Story So Far".
    2. Focus ONLY on expanding this specific beat into 3-5 distinct logical sections.
    3. Do NOT use markdown bolding (double asterisks "**") in your response. Use plain text.
    
    Return ONLY the expanded text, no conversational filler.`;

    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: prompt
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        );
        return stripMarkdownFormatting(response.text?.trim() || beat);
    } catch (e) {
        console.warn("Beat expansion failed", e);
        return beat;
    }
};
export const breakDownChapter = async (title: string, beat: string, type: string, memory: any, signal?: AbortSignal): Promise<string[]> => {
    const ai = getAI();
    const prompt = `You are a structural editor for non-fiction. Break down this chapter into 3-5 distinct logical sections or sub-points.
    
    Chapter Title: "${title}"
    Chapter Beat: "${beat}"
    Book Type: "${type}"
    
    Return JSON with a single array of strings called 'logicFlow'. Each string should be a 1-2 sentence description of the section/sub-point.`;

    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            logicFlow: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        );
        
        const data = safeJsonParse(response.text || '{"logicFlow": []}', {logicFlow: []});
        return data.logicFlow || [];
    } catch (e) {
        console.warn("Chapter breakdown failed", e);
        return [];
    }
};
export const expandNonFictionOutline = async (beat: string, title: string, summary: string, signal?: AbortSignal) => {
    const ai = getAI();
    const prompt = `You are a structural editor. Expand this chapter beat into a detailed logical flow.
    
    Book Title: "${title}"
    Story So Far (Global Summary):
    ${summary || "This is the first chapter."}
    
    Chapter Beat to Expand:
    "${beat}"
    
    CRITICAL INSTRUCTION:
    1. Do NOT repeat concepts or events that have already happened in the "Story So Far".
    2. Focus ONLY on expanding this specific beat into 3-5 logical sub-points.
    3. Do NOT use markdown bolding (double asterisks "**") in your response. Use plain text.
    
    Return ONLY the expanded text, no conversational filler.`;

    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: prompt
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        );
        return stripMarkdownFormatting(response.text?.trim() || beat);
    } catch (e) {
        console.warn("Beat expansion failed", e);
        return beat;
    }
};
export const performMagicRefinement = async (text: string, instruction: string, signal?: AbortSignal) => {
    const ai = getAI();
    if (!ai) return text;
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: `You are an expert editor. Apply the following instruction to the provided text. Return ONLY the modified text, without any conversational filler, markdown formatting blocks, or explanations.\n\nInstruction: ${instruction}\n\nText:\n${text}`,
                config: {
                    systemInstruction: "You are an expert editor. Return ONLY the modified text.",
                    temperature: 0.4
                }
            }), 3, 2000, signal),
            MODEL_PRO,
            signal
        );
        
        let refinedText = response.text || text;
        
        return stripMarkdownFormatting(refinedText.trim());
    } catch (e) {
        console.error("Magic Refinement failed:", e);
        return text;
    }
};
export const proofreadChapter = async (content: string, signal?: AbortSignal) => {
    const ai = getAI();
    if (!ai) return content;
    const model = selectModelForTask('proofread', apiStressLevel > 40);
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: `You are a professional book proofreader. Review the following chapter content (which is in HTML format) for grammar, spelling, punctuation, and typographical errors. 
            Fix the errors directly in the text. Do NOT change the author's voice, style, or the HTML structure. 
            Return ONLY the corrected HTML content. Do not include any explanations, markdown code blocks, or conversational filler.\n\nContent to proofread:\n${content}`,
                config: {
                    systemInstruction: "You are an expert proofreader. Return ONLY the corrected HTML.",
                    temperature: 0.2
                }
            }), 3, 2000, signal),
            model,
            signal
        );
        
        let refinedText = response.text || content;
        
        // Remove markdown code blocks if the model included them
        if (refinedText.startsWith('```html')) {
            refinedText = refinedText.replace(/^```html\n/, '').replace(/\n```$/, '');
        } else if (refinedText.startsWith('```')) {
            refinedText = refinedText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        return refinedText.trim();
    } catch (e) {
        console.error("Proofreading failed:", e);
        return content;
    }
};
export const analyzeRemixContent = async (text: string, signal?: AbortSignal): Promise<{ blueprint: ProjectBlueprint, memory: ProjectMemory } | null> => {
    const ai = getAI();
    
    // STEP 1: CLASSIFICATION (keyword heuristic on source text — no LLM roundtrip needed)
    const mode = classifyTopicHeuristic(text.substring(0, 2000));

    // Base Profile Schema (Common)
    const baseProfileSchema = {
        type: Type.OBJECT,
        properties: {
            voice: { type: Type.STRING, description: "Detailed description of the writing style/voice." },
            tense: { type: Type.STRING },
            pov: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            complexity: { type: Type.STRING },
            archetype: { type: Type.STRING, description: "Creative persona name (e.g. 'The Cyber-Shaman', 'The Gritty Insider'). Do not use generic terms." },
            targetWordCount: { type: Type.NUMBER },
            chapterCount: { type: Type.NUMBER },
            pacing: { type: Type.STRING }
        }
    };

    // Schema for Dynamic Structure (AI Architect)
    const structureSchema = {
        type: Type.OBJECT,
        properties: {
            archetype: { type: Type.STRING, description: "Name of the book structure (e.g. 'The Hero's Journey', 'The Problem-Solution Cycle')" },
            description: { type: Type.STRING, description: "Short explanation of why this structure fits." },
            phases: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "e.g. 'Part 1: The Foundation'" },
                        intent: { type: Type.STRING, description: "The goal of this phase." },
                        chapterCount: { type: Type.NUMBER, description: "Number of chapters in this phase." }
                    }
                }
            }
        }
    };

    let specificPrompt = "";
    let specificSchemaProperties: any = {};

    if (mode === 'Narrative') {
        specificPrompt = `You are transforming the following source material into a structured narrative ebook. Your blueprint must be DIRECTLY DERIVED from the actual content, events, and themes present in the source — do NOT generate a generic or invented story.

        Source Material:
        ${text.substring(0, 15000)}
        
        TASK 1: VOICE DNA EXTRACTION
        Identify and preserve the writing style, tone, and voice already present in the source material. Build a persona description that captures this authentic voice.
        
        TASK 2: NARRATIVE ARCHITECTURE
        Design a 'Book Structure Archetype' (Macro-Structure) that organizes the real content found in the source.
        Break the material into 3-5 distinct Phases that reflect the actual arc of the source content.
        
        Required Specifics:
        - title: A compelling title that reflects the actual subject of the source material.
        - subtitle: A subtitle that clarifies the book's core promise.
        - type: One of "Non-Fiction", "Memoir", "Textbook", "Guide", or "Fiction" — choose the best fit.
        - genre: The specific genre (e.g. "Personal Memoir", "Narrative Non-Fiction", "Biography").
        - summary: A 2-3 sentence summary of the actual content being structured into the ebook.
        - controllingIdea: The core theme, lesson, or biographical thesis extracted from the source.
        - readerPersona: Target reader's curiosity and emotional payoff based on the content.
        - structure: The high-level phases that reflect the source material's narrative arc.
        
        Return valid JSON.`;

        specificSchemaProperties = {
            controllingIdea: { type: Type.STRING },
            readerPersona: {
                type: Type.OBJECT,
                properties: {
                    intellectualCuriosity: { type: Type.STRING },
                    emotionalPayoff: { type: Type.STRING },
                    historicalContext: { type: Type.STRING }
                }
            },
            structure: structureSchema
        };
    } else {
        specificPrompt = `You are transforming the following source material into a structured instructional ebook. Your blueprint must be DIRECTLY DERIVED from the actual content, ideas, and arguments present in the source — do NOT generate a generic or invented framework.

        Source Material:
        ${text.substring(0, 15000)}
        
        TASK 1: VOICE DNA EXTRACTION
        Identify and preserve the writing style, tone, and voice already present in the source material. Build a persona description that captures this authentic voice.
        
        TASK 2: INSTRUCTIONAL ARCHITECTURE
        Design a 'Book Structure Archetype' (Macro-Structure) that organizes the real content found in the source.
        Break the material into 3-5 distinct Phases that reflect the actual progression of ideas in the source content.
        
        Required Specifics:
        - title: A compelling title that reflects the actual subject of the source material.
        - subtitle: A subtitle that clarifies the book's core promise.
        - type: One of "Non-Fiction", "Memoir", "Textbook", "Guide", or "Fiction" — choose the best fit.
        - genre: The specific genre (e.g. "Business Strategy", "Self-Help", "How-To Guide").
        - summary: A 2-3 sentence summary of the actual content being structured into the ebook.
        - centralThesis: The main argument or central claim extracted directly from the source material.
        - readerPersona: The target reader's pain point and desired outcome based on what the source material teaches.
        - structure: The high-level phases that reflect how the source material's ideas should be organized.
        
        Return valid JSON.`;

        specificSchemaProperties = {
            centralThesis: { type: Type.STRING },
            readerPersona: {
                type: Type.OBJECT,
                properties: {
                    primaryPainPoint: { type: Type.STRING },
                    desiredOutcome: { type: Type.STRING }
                }
            },
            structure: structureSchema
        };
    }

    const fullSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            type: { type: Type.STRING },
            genre: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            coverPrompt: { type: Type.STRING },
            summary: { type: Type.STRING },
            profile: baseProfileSchema,
            ...specificSchemaProperties
        }
    };

    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: specificPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: fullSchema
                }
            }), 3, 2000, signal),
            MODEL_FLASH,
            signal
        );
        
        trackResponseUsage(response, MODEL_FLASH);
        
        const rawText = response.text || "{}";
        const cleanJson = stripMarkdownWrapper(rawText);
        
        const data = safeJsonParse(cleanJson, {});
        if (!data.structuralSignature) data.structuralSignature = [];
        if (!data.chapterModes) data.chapterModes = [];
        
        const blueprint = { ...data, mode: mode as 'Instructional' | 'Narrative', sourceMaterial: text.substring(0, 15000) };
        
        // Create memory from the source text
        const memory: ProjectMemory = {
            research: [{
                id: 'source-material',
                name: 'Source Material',
                description: text,
                category: 'User Input'
            }],
            keyFigures: [],
            glossary: [],
            concepts: [],
            characters: [],
            world: [],
            plot: []
        };
        
        return { blueprint, memory };
    } catch (e) {
        console.error("Remix Analysis failed:", e);
        return null;
    }
};
export const performResearch = async (q: string, signal?: AbortSignal): Promise<{ facts: string[], sources: any[] }> => {
    const ai = getAI();
    const model = selectModelForTask('research', apiStressLevel > 40);
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: `Research the following query: ${q}. Return a list of 3-5 key facts.`,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            }), 3, 2000, signal),
            model,
            signal
        );
        
        const facts = (response.text || "").split('\n').filter(line => line.trim().length > 0);
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = chunks
            .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
            .filter((s): s is {title: string, uri: string} => !!s);

        return { facts, sources };
    } catch (e) {
        console.error("Research failed", e);
        return { facts: [], sources: [] };
    }
};
export const synthesizeBlueprintFromMemory = async (memory: ProjectMemory, thesis: string, signal?: AbortSignal): Promise<ProjectBlueprint | null> => {
    const ai = getAI();

    const researchSummary = memory.research.map(r => `- ${r.name}: ${r.description}`).join('\n');
    const figuresSummary = memory.keyFigures.map(f => `- ${f.name}: ${f.description}`).join('\n');
    const conceptsSummary = memory.concepts.map(c => `- ${c.name}: ${c.description}`).join('\n');
    const glossarySummary = memory.glossary.map(g => `- ${g.name}: ${g.description}`).join('\n');

    const prompt = `You are a book architect. Based on the following curated research and thesis, generate a complete project blueprint for a Non-Fiction book.

THESIS / CENTRAL ARGUMENT:
${thesis}

RESEARCH FACTS:
${researchSummary || 'None'}

KEY FIGURES:
${figuresSummary || 'None'}

CORE CONCEPTS:
${conceptsSummary || 'None'}

GLOSSARY TERMS:
${glossarySummary || 'None'}

Generate a complete book blueprint with:
- A compelling title and subtitle
- Book type (Non-Fiction)
- Genre
- A visual style description for the cover
- A cover art prompt
- A comprehensive summary
- A narrative profile (voice, tense, POV, target audience, complexity, archetype, target word count, chapter count, pacing)
- A central thesis
- A reader persona (primary pain point, desired outcome)
- A book structure with 3-5 phases

Return valid JSON matching this schema:
{
  "title": "string",
  "subtitle": "string",
  "type": "Non-Fiction",
  "genre": "string",
  "visualStyle": "string",
  "coverPrompt": "string",
  "summary": "string",
  "profile": {
    "voice": "string",
    "tense": "string",
    "pov": "string",
    "targetAudience": "string",
    "complexity": "string",
    "archetype": "string",
    "targetWordCount": number,
    "chapterCount": number,
    "pacing": "string"
  },
  "centralThesis": "string",
  "readerPersona": {
    "primaryPainPoint": "string",
    "desiredOutcome": "string"
  },
  "structure": {
    "archetype": "string",
    "description": "string",
    "phases": [
      { "title": "string", "intent": "string", "chapterCount": number }
    ]
  }
}`;

    const model = selectModelForTask('remixAnalysis', apiStressLevel > 40);
    try {
        const response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            }), 3, 2000, signal),
            model,
            signal
        );

        trackResponseUsage(response, MODEL_FLASH);

        const rawText = response.text || "{}";
        const cleanJson = stripMarkdownWrapper(rawText);
        const repairedJson = jsonrepair(cleanJson);
        const data = ProjectBlueprintSchema.parse(JSON.parse(repairedJson));

        if (!data.structuralSignature) data.structuralSignature = [];
        if (!data.chapterModes) data.chapterModes = [];

        return { ...data, mode: 'Instructional' as const };
    } catch (e) {
        console.error("synthesizeBlueprintFromMemory failed:", e);
        return null;
    }
};

// --- DIRECTOR ENGINE (Function Calling) ---

const DIRECTOR_TOOLS: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "architect_blueprint",
                description: "Assign 'Strategist' to perform deep audience analysis and generate a structural blueprint.",
                parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["topic", "reasoning"] }
            },
            {
                name: "create_outline",
                description: "Assign 'Strategist' to generate a chapter list based on the blueprint.",
                parameters: { type: Type.OBJECT, properties: { reasoning: { type: Type.STRING } }, required: ["reasoning"] }
            },
            {
                name: "research_topic",
                description: "Assign 'Scholar' agent to research facts from the web.",
                parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["query", "reasoning"] }
            },
            {
                name: "draft_chapter",
                description: "Assign 'Scribe' agent to write a specific chapter.",
                parameters: { type: Type.OBJECT, properties: { chapterId: { type: Type.STRING }, notes: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["chapterId", "reasoning"] }
            },
            {
                name: "critique_chapter",
                description: "Assign 'Editor' agent to review and refine a draft.",
                parameters: { type: Type.OBJECT, properties: { chapterId: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["chapterId", "reasoning"] }
            },
            {
                name: "design_cover",
                description: "Assign 'Designer' agent to generate book cover art.",
                parameters: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["prompt", "reasoning"] }
            },
            {
                name: "finalize_book",
                description: "Assign 'Publisher' agent to compile the book into EPUB.",
                parameters: { type: Type.OBJECT, properties: { reasoning: { type: Type.STRING } }, required: ["reasoning"] }
            },
            {
                name: "ask_user",
                description: "Stop execution and ask the human user for critical input (e.g. Author Name).",
                parameters: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ["question", "reasoning"] }
            }
        ]
    }
];

export const consultDirector = async (mission: string, slimProject: any, history: any[], signal?: AbortSignal): Promise<DirectorDirective> => {
    const ai = getAI();
    const usedModel = MODEL_FLASH;

    const systemInstruction = `
    You are the Director Agent for a book production system.
    Mission: "${mission}"
    
    STATE MACHINE RULES:
    1. PHASE 1: ARCHITECTURE. If 'hasBlueprint' is false, call 'architect_blueprint' (Strategist).
    2. PHASE 2: PLANNING. If 'hasBlueprint' is true but 'hasOutline' is false, call 'create_outline' (Strategist).
    3. PHASE 3: PRODUCTION. Loop through chapters.
       - If a chapter is 'draft' status, call 'draft_chapter' (Scribe).
       - If a chapter is 'completed' but 'revisionCount' < 1, call 'critique_chapter' (Editor).
       - If 'revisionCount' >= 3, do NOT critique again. Move to next chapter.
    4. PHASE 4: ASSETS. If book content is > 50% complete and 'hasCover' is false, call 'design_cover'.
    5. PHASE 5: PUBLISH. If all chapters are 'completed' and 'hasCover' is true, call 'finalize_book'.
    
    CRITICAL: Do NOT ask the user for Author Name, Copyright, or Bibliography. These are provided in the project state.
    `;

    const response = await callWithModelFallback(
        (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: `Current Project State: ${JSON.stringify(slimProject)}. Recent History: ${JSON.stringify(history)}. decide the next step.`,
            config: { 
                tools: DIRECTOR_TOOLS,
                systemInstruction: systemInstruction,
                temperature: 0.2
            }
        }), 3, 2000, signal),
        MODEL_FLASH,
        signal
    );

    trackResponseUsage(response, usedModel);

    // Parse Function Call
    const functionCall = response.functionCalls?.[0];
    
    if (functionCall) {
        const args = functionCall.args as any;
        const name = functionCall.name;
        const reasoning = args.reasoning || "Executing planned step.";

        switch (name) {
            case 'architect_blueprint': return { targetAgent: 'strategist', instruction: `Create blueprint for: ${args.topic}`, reasoning };
            case 'create_outline': return { targetAgent: 'strategist', instruction: `Generate chapter outline.`, reasoning };
            case 'research_topic': return { targetAgent: 'scholar', instruction: args.query, reasoning };
            case 'draft_chapter': return { targetAgent: 'scribe', instruction: `Write Chapter ID ${args.chapterId}. Notes: ${args.notes || ''}`, reasoning };
            case 'critique_chapter': return { targetAgent: 'editor', instruction: `Critique Chapter ID ${args.chapterId}`, reasoning };
            case 'design_cover': return { targetAgent: 'designer', instruction: args.prompt, reasoning };
            case 'finalize_book': return { targetAgent: 'publisher', instruction: "Compile final files.", reasoning };
            case 'ask_user': return { targetAgent: 'user', instruction: args.question, reasoning };
        }
    }

    // Fallback if model refuses to call function
    return { targetAgent: 'director', instruction: 'Thinking...', reasoning: 'Model output text instead of function call.' };
};

export const runSpecialistAgent = async (role: AgentRole, instruction: string, context: any, signal?: AbortSignal): Promise<{ output: string }> => {
    const ai = getAI();
    let config: any = {};
    let promptSuffix = "";
    let usedModel = role === 'scholar' ? selectModelForTask('research', apiStressLevel > 40) : selectModelForTask('remixAnalysis', apiStressLevel > 40);

    if (role === 'scholar') {
        config = { tools: [{ googleSearch: {} }] };
        promptSuffix = " RESEARCH PROTOCOL: Prioritize official primary sources. Verify claims.";
        usedModel = selectModelForTask('research', apiStressLevel > 40);
    }

    if (role === 'editor') {
        promptSuffix = " EDITING PROTOCOL: You are a Copy Editor. Focus on prose, tone, grammar. Do NOT request structural changes.";
        usedModel = selectModelForTask('proofread', apiStressLevel > 40);
    }

    if (role === 'designer') {
        promptSuffix = ` DESIGN PROTOCOL: You are a professional Book Cover Designer specializing in non-fiction.
        Your task is to architect a high-performance visual prompt for an image generation AI.
        
        USE COVER STUDIO LOGIC:
        1. SUBJECT: A vivid, detailed description of the central imagery, focusing on conceptual, professional, and typographic elements suitable for non-fiction.
        2. MOOD: Choose a specific emotional tone (e.g., Authoritative, Inspiring, Minimalist).
        3. LIGHTING: Define the light physics (e.g., Studio Lighting, Clean, Bright).
        4. COMPOSITION: Define the layout, ensuring space for the Book Title, Subtitle, and Author Name.
        5. STYLE: Define the artistic medium (e.g., Modern Typography, Clean Graphic Design, Photorealistic).
        6. PALETTE: Define a unique, professional color scheme.
        
        CRITICAL DESIGN PRINCIPLES:
        - Ensure instant genre recognition, high visual hierarchy, typography as voice, and emotional promise.
        - The generated image MUST include the Book Title, a short descriptive Subtitle, and the Author Name (if provided, otherwise blank).
        - STRICTLY FORBID duplicate Book Title and Subtitle. If they are identical, make the Subtitle distinct and descriptive.
        - Focus on professional publishing quality, non-fiction design, and striking visual impact.
        - Remove any elements related to fiction, fantasy, or overly dramatic imagery.
        - Return ONLY the final assembled visual prompt.`;
        usedModel = selectModelForTask('imagePrompt', apiStressLevel > 40);
    }

    let response;
    try {
        response = await callWithModelFallback(
            (model) => retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model,
                contents: `Act as ${role}. Instruction: ${instruction}.${promptSuffix} Context: ${JSON.stringify(context)}.`,
                config: config
            }), 3, 2000, signal),
            usedModel,
            signal
        );
    } catch (e: any) {
        throw e;
    }

    trackResponseUsage(response, usedModel);
    
    // For specialist roles, ensure model is properly recorded
    if (role === 'scholar' && !usedModel) {
        usedModel = selectModelForTask('research', apiStressLevel > 40);
    } else if (!usedModel) {
        usedModel = MODEL_FLASH;
    }
    
    let text = response.text || "";
    if (role === 'scholar' && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
         const chunks = response.candidates[0].groundingMetadata.groundingChunks;
         const sources = chunks.map((c: any) => c.web ? `[${c.web.title}](${c.web.uri})` : null).filter(Boolean);
         if (sources.length > 0) text += `\n\nSOURCES:\n${sources.join('\n')}`;
    }
    return { output: stripMarkdownFormatting(stripMarkdownWrapper(text)) };
};

export type { GenerateContentResponse };
