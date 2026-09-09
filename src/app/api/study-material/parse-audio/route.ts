import { NextResponse } from 'next/server';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';

/**
 * Step 13: Audio Ingestion API Route
 * Uses Gemini Multimodal Audio API (gemini-3.8-flash) for verbatim Speech-to-Text transcription.
 * Rate limit notes for free tier: ~25 calls/day, 2 requests/minute, 30 min audio duration per call.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileData, fileName, mimeType } = body;

    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'Audio file data is required.' },
        { status: 400 }
      );
    }

    const ai = getGenAI();
    if (!ai) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const base64Data = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
    const audioMime = mimeType || 'audio/mp3';

    const response = await executeWithTimeoutAndRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: audioMime,
              data: base64Data
            }
          },
          {
            text: 'You are an exact, verbatim audio transcriber. Transcribe the spoken audio content accurately and verbatim into English text. Output strictly the full transcript without conversational filler or summary.'
          }
        ]
      });
    }, 45000, 1);

    const transcribedText = response.text?.trim() || '';
    if (!transcribedText || transcribedText.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Speech-to-text conversion yielded no clear transcript. Audio may be silent or missing spoken words.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: transcribedText,
      sourceName: fileName || 'Uploaded Audio Recording',
      metadata: {
        original_filename: fileName,
        word_count: transcribedText.split(/\s+/).filter(Boolean).length
      }
    });
  } catch (err: any) {
    console.warn('Audio transcription error:', err.message);
    const isRateLimit =
      err?.status === 429 ||
      (err?.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota exceeded')));

    if (isRateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transcription rate limit reached. Please try again in a few moments.'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || 'Unable to transcribe audio file.' },
      { status: 400 }
    );
  }
}
