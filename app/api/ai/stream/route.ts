import { NextRequest } from 'next/server';
import { verifyIdToken } from '../../../../services/firebaseAdmin';
import { streamChapterContent } from '../../../../services/geminiService';

export const maxDuration = 180; // 3 minutes for chapter generation

export async function POST(req: NextRequest) {
  // Verify Firebase ID token before streaming.
  try {
    await verifyIdToken(req.headers.get('Authorization'));
  } catch (authErr: any) {
    return new Response(JSON.stringify({ error: authErr.message || 'Unauthorized' }), {
      status: authErr.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { params } = await req.json();
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
        const msg = isOverloaded
          ? 'The AI model is currently experiencing high demand. Please try again in a moment.'
          : isRateLimit
          ? 'Rate limit reached. Please wait a moment before trying again.'
          : msgStr || 'Stream generation failed';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg, retryable: isOverloaded || isRateLimit })}\n\n`)
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
