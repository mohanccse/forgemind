import { NextResponse } from 'next/server';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Configure ffmpeg binary path from installer
if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

/**
 * Step 14: Video Ingestion API Route
 * Primary technology: Video File Upload -> ffmpeg (extract audio stream ONLY) -> gemini-3.8-flash -> NormalizedText
 * 
 * CRITICAL ARCHITECTURAL RULE:
 * Do NOT pass video frames / vision to Gemini.
 * Extract the audio track first via ffmpeg, then send ONLY the audio stream to Gemini.
 * 
 * Disk Safety:
 * All temporary video and audio files created in OS temp directory are cleaned up in a finally block.
 * 
 * Free-tier rate limit notes: ~25 calls/day, 2 requests/minute, 30 min duration cap.
 */
export async function POST(request: Request) {
  let tempVideoPath: string | null = null;
  let tempAudioPath: string | null = null;

  try {
    const body = await request.json();
    const { fileData, fileName, mimeType } = body;

    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'Video file data is required.' },
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
    const rawVideoBuffer = Buffer.from(base64Data, 'base64');

    // Validation: Max video file size 50MB limit
    if (rawVideoBuffer.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `Video file size (${(rawVideoBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB maximum limit.` },
        { status: 400 }
      );
    }

    // Determine extension from mime type or file name
    let ext = 'mp4';
    if (fileName && fileName.includes('.')) {
      ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    } else if (mimeType?.includes('webm')) {
      ext = 'webm';
    } else if (mimeType?.includes('quicktime')) {
      ext = 'mov';
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    tempVideoPath = path.join(os.tmpdir(), `forgemind-vid-${uniqueId}.${ext}`);
    tempAudioPath = path.join(os.tmpdir(), `forgemind-aud-${uniqueId}.mp3`);

    // Write incoming video file to OS temp directory
    fs.writeFileSync(tempVideoPath, rawVideoBuffer);

    // Demux audio stream from video using ffmpeg
    console.log(`[Video Pipeline] Demuxing audio stream from video: "${fileName || 'uploaded_video'}"`);
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath!)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .toFormat('mp3')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(tempAudioPath!);
      });
    } catch (ffmpegErr: any) {
      console.warn('[Video Pipeline] ffmpeg demuxing error:', ffmpegErr.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to extract audio track from video. Video file may be corrupted, missing an audio stream, or formatted in an unsupported codec.'
        },
        { status: 400 }
      );
    }

    if (!fs.existsSync(tempAudioPath) || fs.statSync(tempAudioPath).size === 0) {
      return NextResponse.json(
        { success: false, error: 'Video file contains no audio track or silent audio stream.' },
        { status: 400 }
      );
    }

    const extractedAudioBuffer = fs.readFileSync(tempAudioPath);
    if (extractedAudioBuffer.length < 500) {
      return NextResponse.json(
        { success: false, error: 'Extracted audio track is virtually empty or silent. Standardized transcription requires spoken audio.' },
        { status: 400 }
      );
    }

    const base64Audio = extractedAudioBuffer.toString('base64');
    console.log(`[Video Pipeline] Sending ${(extractedAudioBuffer.length / (1024 * 1024)).toFixed(2)}MB demuxed audio to Gemini Speech-to-Text...`);

    const response = await executeWithTimeoutAndRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: base64Audio
            }
          },
          {
            text: `You are an exact, verbatim audio transcriber.
CRITICAL MANDATE:
- Transcribe the spoken audio track of this video strictly verbatim into clear English text.
- Do NOT summarize, interpret, edit, paraphrase, or omit any spoken content.
- Do NOT output table of contents, chapter headings, bullet outlines, or conversational filler.
- Output ONLY the verbatim spoken audio text.`
          }
        ]
      });
    }, 60000, 1);

    const transcribedText = response.text?.trim() || '';

    // Zero Synthetic Content Rule: Fail-closed on missing spoken text
    if (!transcribedText || transcribedText.length < 15) {
      return NextResponse.json(
        { success: false, error: 'Video transcription yielded no spoken text. Video audio may be silent or instrumental.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: transcribedText,
      sourceName: fileName || 'Uploaded Video Recording',
      metadata: {
        original_filename: fileName,
        extracted_audio_size_bytes: extractedAudioBuffer.length,
        word_count: transcribedText.split(/\s+/).filter(Boolean).length
      }
    });
  } catch (err: any) {
    console.warn('[Video Pipeline] Processing failed:', err.message);
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
      { success: false, error: err.message || 'Unable to process video file.' },
      { status: 400 }
    );
  } finally {
    // DISK SAFETY GUARANTEE: Clean up temporary video and audio files
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try {
        fs.unlinkSync(tempVideoPath);
      } catch (cleanupErr) {
        console.warn('Failed to delete temp video file:', tempVideoPath, cleanupErr);
      }
    }
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      try {
        fs.unlinkSync(tempAudioPath);
      } catch (cleanupErr) {
        console.warn('Failed to delete temp audio file:', tempAudioPath, cleanupErr);
      }
    }
  }
}
