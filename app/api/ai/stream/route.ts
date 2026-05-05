import { NextRequest } from 'next/server';
import { verifyIdToken, verifySubscription } from '../../../../services/firebaseAdmin';
import { streamChapterContent, getApiStressLevel } from '../../../../services/geminiService';

export const maxDuration = 180; // 3 minutes for chapter generation

// --- Demo rate limiting (shared in-memory) with adaptive limits based on API stress ---
const DEMO_STREAM_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const DEMO_MAX_STREAMS_PER_IP = 20;
const DEMO_RATE_WINDOW = 24 * 60 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function checkDemoStreamRateLimit(ip: string): boolean {
  const now = Date.now();
  if (DEMO_STREAM_RATE_LIMIT.size > 10000) {
    for (const [key, val] of DEMO_STREAM_RATE_LIMIT) {
      if (now > val.resetAt) DEMO_STREAM_RATE_LIMIT.delete(key);
    }
  }
  const entry = DEMO_STREAM_RATE_LIMIT.get(ip);
  if (!entry || now > entry.resetAt) {
    DEMO_STREAM_RATE_LIMIT.set(ip, { count: 1, resetAt: now + DEMO_RATE_WINDOW });
    return true;
  }
  if (entry.count >= DEMO_MAX_STREAMS_PER_IP) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Reject oversized payloads before parsing
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > 20_000_000) {
    return new Response(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { params, demoMode } = body;

  if (demoMode) {
    const ip = getClientIp(req);
    if (!checkDemoStreamRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Demo limit reached. Sign up for full access!' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '86400' },
      });
    }
  } else {
    // Verify Firebase ID token before streaming.
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(req.headers.get('Authorization'));
    } catch (authErr: any) {
      return new Response(JSON.stringify({ error: authErr.message || 'Unauthorized' }), {
        status: authErr.status || 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify active subscription before streaming.
    try {
      await verifySubscription(decodedToken.uid);
    } catch (subErr: any) {
      return new Response(JSON.stringify({ error: subErr.message || 'Subscription required' }), {
        status: (subErr as any).status || 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const onChunk = (chunk: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`)
          );
        };

        const fullContent = await streamChapterContent(
          params.blueprint,
          params.profile,
          params.chapter,
          params.memory,
          onChunk,
          params.prevContext,
          params.nextContext,
          params.fullOutline,
          params.globalSummary,
          params.additionalContext,
          req.signal
        );

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', data: fullContent })}\n\n`)
        );
      } catch (error: any) {
        const statusStr = String(error?.status ?? '');
        const msgStr = String(error?.message ?? '');
        const statusCode = typeof error?.status === 'number' ? error.status : 0;
        const errorCode = error?.error?.code;
        const apiStress = getApiStressLevel();

        const isOverloaded = statusStr === 'UNAVAILABLE' ||
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
        const isRateLimit = error?.status === 429 || msgStr.includes('429') || msgStr.includes('RESOURCE_EXHAUSTED') || errorCode === 429;
        
        // Enhanced error messages with API stress context
        let msg = '';
        let retryAfterMs: number | undefined;
        if (isOverloaded) {
          retryAfterMs = apiStress > 70 ? 120000 : 10000; // 2 min on severe, 10s otherwise
          msg = apiStress > 70
            ? 'The AI model is under severe load. Please wait a few minutes before retrying.'
            : 'The AI model is currently experiencing high demand. Please try again in a moment.';
        } else if (isRateLimit) {
          msg = 'Rate limit reached. Please wait a moment before trying again.';
          retryAfterMs = 30000; // Suggest 30s wait on rate limit
        } else {
          msg = msgStr || 'Stream generation failed';
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg, retryable: isOverloaded || isRateLimit, apiStress, ...(retryAfterMs ? { retryAfterMs } : {}) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
