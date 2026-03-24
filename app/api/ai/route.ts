import { NextResponse, NextRequest } from 'next/server';
import { verifyIdToken } from '../../../services/firebaseAdmin';
import {
  analyzeTopicAndConfigure,
  generateProjectOutline,
  generateAuthorityBible,
  gatherChapterFacts,
  generateBibliography,
  generateImageFromPrompt,
  generateBookMockup,
  generateMarketingPack,
  generateAboutAuthor,
  generateDedication,
  generateSpeech,
  analyzeChapterAftermath,
  compressGlobalSummary,
  expandChapterBeat,
  breakDownChapter,
  expandNonFictionOutline,
  performMagicRefinement,
  proofreadChapter,
  analyzeRemixContent,
  performResearch,
  synthesizeBlueprintFromMemory,
  consultDirector,
  runSpecialistAgent,
} from '../../../services/geminiService';

// Increase body size limit for image payloads
export const maxDuration = 120; // seconds (Vercel function timeout)

export async function POST(req: NextRequest) {
  // Verify Firebase ID token — rejects unauthenticated requests before any AI call.
  try {
    await verifyIdToken(req.headers.get('Authorization'));
  } catch (authErr: any) {
    return NextResponse.json({ error: authErr.message || 'Unauthorized' }, { status: authErr.status || 401 });
  }

  const { action, params } = await req.json();
  const signal = req.signal; // Use the request's abort signal

  try {
    let result: any;

    switch (action) {
      case 'analyzeTopicAndConfigure':
        result = await analyzeTopicAndConfigure(params.topic, params.type, params.genre, signal);
        break;

      case 'generateProjectOutline':
        result = await generateProjectOutline(params.blueprint, params.memory, signal);
        break;

      case 'generateAuthorityBible':
        result = await generateAuthorityBible(params.blueprint, params.outline, params.initialMemory, signal);
        break;

      case 'gatherChapterFacts':
        result = await gatherChapterFacts(params.beat, params.blueprint, signal);
        break;

      case 'generateBibliography':
        result = await generateBibliography(params.sources, signal);
        break;

      case 'generateImageFromPrompt':
        result = await generateImageFromPrompt(params.prompt, params.quality);
        break;

      case 'generateBookMockup':
        result = await generateBookMockup(params.title, params.coverImageBase64);
        break;

      case 'generateMarketingPack':
        result = await generateMarketingPack(params.blueprint);
        break;

      case 'generateAboutAuthor':
        result = await generateAboutAuthor(params.authorName, params.bookSummary);
        break;

      case 'generateDedication':
        result = await generateDedication(params.bookTitle, params.bookSummary);
        break;

      case 'generateSpeech':
        result = await generateSpeech(params.text, params.voiceName, params.quality, signal);
        break;

      case 'analyzeChapterAftermath':
        result = await analyzeChapterAftermath(params.content, params.memory, params.type, signal);
        break;

      case 'compressGlobalSummary':
        result = await compressGlobalSummary(params.summary, params.existingSummary, signal);
        break;

      case 'expandChapterBeat':
        result = await expandChapterBeat(params.beat, params.title, params.summary, signal);
        break;

      case 'breakDownChapter':
        result = await breakDownChapter(params.title, params.beat, params.type, params.memory, signal);
        break;

      case 'expandNonFictionOutline':
        result = await expandNonFictionOutline(params.beat, params.title, params.summary, signal);
        break;

      case 'performMagicRefinement':
        result = await performMagicRefinement(params.text, params.instruction, signal);
        break;

      case 'proofreadChapter':
        result = await proofreadChapter(params.content, signal);
        break;

      case 'analyzeRemixContent':
        result = await analyzeRemixContent(params.text, signal);
        break;

      case 'performResearch':
        result = await performResearch(params.query, signal);
        break;

      case 'synthesizeBlueprintFromMemory':
        result = await synthesizeBlueprintFromMemory(params.memory, params.thesis, signal);
        break;

      case 'consultDirector':
        result = await consultDirector(params.mission, params.slimProject, params.history, signal);
        break;

      case 'runSpecialistAgent':
        result = await runSpecialistAgent(params.role, params.instruction, params.context, signal);
        break;

      case 'generateMarketingImage': {
        // Server-side image generation
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const { MODEL_IMAGE } = await import('../../../services/geminiService');
        
        const response = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: params.compressedBase64,
                },
              },
              { text: `Create a marketing graphic using the provided book cover as the central element. ${params.prompt}. High quality, professional design.` },
            ],
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            result = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (!result) result = null;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error(`[API] Error in action "${action}":`, error?.message || error);

    const statusStr = String(error?.status ?? '');
    const msgStr = String(error?.message ?? '');
    const isOverloaded = statusStr === 'UNAVAILABLE' ||
                         msgStr.includes('UNAVAILABLE') ||
                         msgStr.includes('high demand') ||
                         msgStr.includes('overloaded') ||
                         msgStr.includes('503');
    const isRateLimit = error?.status === 429 || msgStr.includes('429') || msgStr.includes('RESOURCE_EXHAUSTED');

    const httpStatus = isRateLimit ? 429 : isOverloaded ? 503 : (typeof error?.status === 'number' && error.status >= 500) ? 502 : 500;
    const userMessage = isOverloaded
      ? 'The AI model is currently experiencing high demand. Please try again in a moment.'
      : isRateLimit
      ? 'Rate limit reached. Please wait a moment before trying again.'
      : error?.message || 'Internal server error';

    return NextResponse.json({ error: userMessage }, { status: httpStatus });
  }
}
