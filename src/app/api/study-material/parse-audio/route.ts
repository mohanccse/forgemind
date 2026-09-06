import { NextResponse } from 'next/server';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';

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
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: audioMime,
              data: base64Data
            }
          },
          {
            text: 'Transcribe the spoken audio content accurately and verbatim into English text. Output strictly the full transcript without conversational filler.'
          }
        ]
      });
    }, 45000, 1);

    const transcribedText = response.text?.trim() || '';
    if (!transcribedText || transcribedText.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Speech-to-text conversion yielded no clear transcript. Please check the audio file.' },
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
    return NextResponse.json(
      { success: false, error: err.message || 'Unable to transcribe audio file.' },
      { status: 400 }
    );
  }
}
