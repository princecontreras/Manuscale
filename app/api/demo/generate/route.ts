import { NextResponse, NextRequest } from 'next/server';
import { getAI, MODEL_FLASH_STABLE } from '../../../../services/geminiService';

export const maxDuration = 30;

// In-memory rate limiting per IP (resets on server restart, good enough for demo)
const ipGenerationCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_GENERATIONS_PER_IP = 5; // Per 24 hours
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;
const MAX_RATE_LIMIT_ENTRIES = 10000; // Prevent unbounded memory growth

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipGenerationCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    // Evict expired entries periodically to prevent memory leak
    if (ipGenerationCounts.size > MAX_RATE_LIMIT_ENTRIES) {
      for (const [key, val] of ipGenerationCounts) {
        if (now > val.resetAt) ipGenerationCounts.delete(key);
      }
    }
    ipGenerationCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_GENERATIONS_PER_IP) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Reject oversized request bodies (max 10KB for demo)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 10240) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  const clientIp = getClientIp(req);

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Demo rate limit exceeded. Please sign up for unlimited access.' },
      { status: 429 }
    );
  }

  const { action, params } = await req.json();

  if (!action || !params) {
    return NextResponse.json({ error: 'Missing action or params' }, { status: 400 });
  }

  // Only allow specific safe actions for demo
  const ALLOWED_ACTIONS = ['analyzeTopicAndConfigure', 'generateProjectOutline'];
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: 'This feature is not available in demo mode. Sign up for full access.' },
      { status: 403 }
    );
  }

  try {
    const ai = getAI();
    let result: any;

    if (action === 'analyzeTopicAndConfigure') {
      const { topic, type, genre } = params;
      if (!topic || typeof topic !== 'string' || topic.length > 500) {
        return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });
      }

      const response = await ai.models.generateContent({
        model: MODEL_FLASH_STABLE,
        contents: `You are a book planning assistant. Given the following topic, create a detailed book blueprint.

Topic: ${topic.slice(0, 500)}
Type: ${type || 'Non-Fiction'}
Genre: ${genre || 'General'}

Respond with a JSON object matching this exact structure. Fill every field with real, relevant content based on the topic:
{
  "title": "A compelling book title",
  "subtitle": "A descriptive subtitle",
  "type": "${type || 'Non-Fiction'}",
  "mode": "Instructional",
  "genre": "${genre || 'General'}",
  "visualStyle": "modern",
  "coverPrompt": "A vivid cover image description in 1 sentence",
  "summary": "2-3 sentence book summary describing the book's value proposition",
  "centralThesis": "The single core argument or thesis this book will prove, in 1-2 sentences",
  "readerPersona": {
    "primaryPainPoint": "The main problem the reader faces",
    "desiredOutcome": "What the reader will achieve after reading",
    "intellectualCuriosity": "What deeper question drives the reader's interest",
    "emotionalPayoff": "How the reader will feel after finishing the book"
  },
  "structure": {
    "archetype": "Progressive Mastery",
    "description": "A brief description of why this structural approach fits the topic",
    "phases": [
      { "name": "Foundation", "chapterCount": 2, "purpose": "Establish core concepts and context" },
      { "name": "Development", "chapterCount": 2, "purpose": "Build deeper understanding with practical frameworks" },
      { "name": "Mastery", "chapterCount": 1, "purpose": "Synthesize knowledge into actionable expertise" }
    ]
  },
  "profile": {
    "voice": "A specific voice description, e.g. Authoritative & Approachable",
    "tense": "Present",
    "pov": "Second Person",
    "targetAudience": "A specific audience description",
    "complexity": "Intermediate",
    "targetWordCount": 30000,
    "chapterCount": 5
  }
}`,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      try {
        result = JSON.parse(text);
      } catch {
        // Fallback: strip code fences if model ignored responseMimeType
        const cleaned = text.replace(/```[\s\S]*?\n/g, '').replace(/```$/g, '').trim();
        try {
          result = JSON.parse(cleaned);
        } catch {
          console.error('[Demo API] Failed to parse blueprint. Raw response:', text.slice(0, 500));
          return NextResponse.json({ error: 'Failed to parse blueprint. Please try again.' }, { status: 500 });
        }
      }
    }

    if (action === 'generateProjectOutline') {
      const { blueprint } = params;
      if (!blueprint?.title || typeof blueprint.title !== 'string') {
        return NextResponse.json({ error: 'Invalid blueprint' }, { status: 400 });
      }

      // Sanitize blueprint fields to prevent oversized prompts
      const safeTitle = blueprint.title.slice(0, 200);
      const safeType = (blueprint.type || 'Non-Fiction').slice(0, 50);
      const safeGenre = (blueprint.genre || 'General').slice(0, 50);
      const safeSummary = (blueprint.summary || 'A comprehensive guide').slice(0, 500);
      const chapterCount = Math.min(blueprint.profile?.chapterCount || 5, 5);

      const response = await ai.models.generateContent({
        model: MODEL_FLASH_STABLE,
        contents: `You are a book outlining assistant. Create a ${chapterCount}-chapter outline for:

Title: ${safeTitle}
Type: ${safeType}
Genre: ${safeGenre}
Summary: ${safeSummary}

Respond with a JSON object:
{
  "outline": [
    {
      "id": "ch-1",
      "chapterNumber": 1,
      "title": "Chapter title",
      "beat": "2-3 sentence chapter description",
      "targetWordCount": 5000,
      "status": "draft"
    }
  ],
  "modes": []
}`,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '';
      try {
        result = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```[\s\S]*?\n/g, '').replace(/```$/g, '').trim();
        try {
          result = JSON.parse(cleaned);
        } catch {
          console.error('[Demo API] Failed to parse outline. Raw response:', text.slice(0, 500));
          return NextResponse.json({ error: 'Failed to parse outline. Please try again.' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[Demo API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
