import { NextResponse } from 'next/server';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';
import play from 'play-dl';

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const str = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Direct grounded caption track extraction from YouTube.
 * Tries fetching real spoken subtitles directly from YouTube's caption endpoints.
 */
async function fetchYouTubeTranscript(videoId: string): Promise<{ text: string; title: string }> {
  let title = `YouTube Video (${videoId})`;
  let captionTracks: any[] = [];

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': 'SOCS=CAESEwgDEgk1ODEyODQxMDMaAmVuIAEaBgiA_qyvBg; PREF=f6=4000000&hl=en'
  };

  // 1. Fetch Watch Page & Extract Player Response / Caption Tracks
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, { headers });

    if (response.ok) {
      const html = await response.text();

      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].replace('- YouTube', '').trim();
      }

      const playerRespMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/);
      if (playerRespMatch) {
        try {
          const playerResp = JSON.parse(playerRespMatch[1]);
          if (playerResp?.videoDetails?.title) {
            title = playerResp.videoDetails.title;
          }
          const tracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (Array.isArray(tracks) && tracks.length > 0) {
            captionTracks = tracks;
          }
        } catch {
          // JSON parse fallback
        }
      }

      if (captionTracks.length === 0) {
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (captionMatch && captionMatch[1]) {
          try {
            captionTracks = JSON.parse(captionMatch[1]);
          } catch {
            // JSON parse fallback
          }
        }
      }
    }
  } catch (watchErr) {
    console.warn('YouTube watch page fetch warning:', watchErr);
  }

  // 2. Download and Parse Real Grounded Subtitle Track (JSON3 or XML)
  if (captionTracks && captionTracks.length > 0) {
    try {
      const track =
        captionTracks.find((t: any) => t.languageCode?.startsWith('en')) || captionTracks[0];

      if (track && track.baseUrl) {
        // Try JSON3 format first
        const captionRes = await fetch(track.baseUrl + '&fmt=json3', { headers });
        if (captionRes.ok) {
          const captionJson = await captionRes.json();
          const events = captionJson.events || [];
          const textParts: string[] = [];

          for (const evt of events) {
            if (evt.segs) {
              for (const seg of evt.segs) {
                if (seg.utf8 && seg.utf8 !== '\n') {
                  textParts.push(seg.utf8);
                }
              }
            }
          }

          const cleanText = textParts.join(' ').replace(/\s+/g, ' ').trim();
          if (cleanText && cleanText.length >= 50) {
            return { text: cleanText, title };
          }
        }

        // Fallback to XML track format
        const xmlRes = await fetch(track.baseUrl, { headers });
        if (xmlRes.ok) {
          const xmlText = await xmlRes.text();
          const textMatches = xmlText.match(/<text[^>]*>(.*?)<\/text>/g) || [];
          const cleanText = textMatches
            .map((t) =>
              t
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
            )
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanText && cleanText.length >= 50) {
            return { text: cleanText, title };
          }
        }
      }
    } catch (capErr) {
      console.warn('YouTube caption track extraction failed:', capErr);
    }
  }

  throw new Error('No closed captions or subtitle tracks available for this YouTube video.');
}

/**
 * Automated Audio Stream Fallback Pipeline:
 * Fetches the video's audio stream via play-dl and transcribes it using Gemini Multimodal Audio API.
 * Applies duration (30 mins max) and memory safety caps (25MB max).
 */
async function fallbackAudioTranscription(
  videoId: string,
  url: string
): Promise<{ text: string; title: string }> {
  console.log(`[YouTube Pipeline] Initiating Gemini Audio Fallback for video: ${videoId}`);

  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server (.env.local).');
  }

  let videoInfo: any;
  try {
    videoInfo = await play.video_info(url);
  } catch (infoErr: any) {
    throw new Error(
      `Unable to fetch video metadata from YouTube: ${infoErr.message || 'Video may be private, age-restricted, or geoblocked.'}`
    );
  }

  const title = videoInfo?.video_details?.title || `YouTube Video (${videoId})`;
  const durationSec = parseInt(videoInfo?.video_details?.durationInSec || '0', 10);

  // Safety Cap 1: Max duration 30 minutes (1800 seconds) per PRD Section 6.1
  if (durationSec > 1800) {
    throw new Error(
      `This video is ${Math.round(durationSec / 60)} minutes long, which exceeds the 30-minute free-tier limit for automated audio stream fallback transcription.`
    );
  }

  const formats = videoInfo.format || [];
  const urlFormats = formats.filter((f: any) => f.url);
  const audioOnlyFormats = urlFormats.filter(
    (f: any) => f.mimeType && f.mimeType.startsWith('audio/')
  );

  // Select lowest bitrate audio format for memory & bandwidth safety
  const chosenFormat =
    audioOnlyFormats.length > 0
      ? audioOnlyFormats.sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0))[0]
      : urlFormats.find((f: any) => f.itag === 18) || urlFormats[0];

  if (!chosenFormat || !chosenFormat.url) {
    throw new Error('No playable audio stream format could be retrieved for this video.');
  }

  console.log(
    `[YouTube Pipeline] Downloading audio stream (${chosenFormat.mimeType}, bitrate: ${chosenFormat.bitrate}) for: "${title}"`
  );

  const audioRes = await fetch(chosenFormat.url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    }
  });

  if (!audioRes.ok) {
    throw new Error(`Audio stream download failed with status ${audioRes.status}`);
  }

  const arrayBuffer = await audioRes.arrayBuffer();
  let audioBuffer = Buffer.from(arrayBuffer);

  // Safety Cap 2: Memory cap 25MB max
  const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    console.warn(
      `[YouTube Pipeline] Audio stream size (${(audioBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeded 25MB cap. Truncating buffer.`
    );
    audioBuffer = audioBuffer.subarray(0, MAX_AUDIO_BYTES);
  }

  const rawMime = chosenFormat.mimeType ? chosenFormat.mimeType.split(';')[0].trim() : 'audio/mp3';
  const audioMime = rawMime.includes('webm') ? 'audio/webm' : rawMime.includes('mp4') ? 'audio/mp4' : 'audio/mp3';
  const base64Audio = audioBuffer.toString('base64');

  console.log(
    `[YouTube Pipeline] Sending ${(audioBuffer.length / (1024 * 1024)).toFixed(2)}MB audio buffer to Gemini Multimodal Speech-to-Text API...`
  );

  const response = await executeWithTimeoutAndRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: audioMime,
            data: base64Audio
          }
        },
        {
          text: `You are an exact, verbatim audio transcriber.
CRITICAL MANDATE:
- Transcribe the spoken audio of this video strictly verbatim into clear English text.
- Do NOT summarize, interpret, edit, paraphrase, or omit any spoken content.
- Do NOT output table of contents, chapter headings, bullet outlines, or conversational intro filler.
- Output ONLY the verbatim spoken audio text, matching the raw transcript output of standard closed captions.`
        }
      ]
    });
  }, 60000, 1);

  const transcribedText = response.text?.trim() || '';

  if (!transcribedText || transcribedText.length < 20) {
    throw new Error('Gemini audio transcription yielded no clear spoken text.');
  }

  return { text: transcribedText, title };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'YouTube video URL is required.' },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL format. Please provide a valid YouTube video link.' },
        { status: 400 }
      );
    }

    // 1. Primary Attempt: Direct Subtitle Captions Scraping
    try {
      console.log(`[YouTube Pipeline] Attempting primary caption scraping for: ${videoId}`);
      const captionResult = await fetchYouTubeTranscript(videoId);
      return NextResponse.json({
        success: true,
        text: captionResult.text,
        sourceName: captionResult.title || `YouTube Video (${videoId})`,
        source: 'captions',
        metadata: {
          video_id: videoId,
          url: url,
          method: 'captions',
          word_count: captionResult.text.split(/\s+/).filter(Boolean).length
        }
      });
    } catch (captionErr: any) {
      console.warn(
        `[YouTube Pipeline] Primary caption extraction failed for ${videoId}: ${captionErr.message}. Executing automated Gemini Audio Fallback...`
      );
    }

    // 2. Automated Fallback: Audio Stream + Gemini Multimodal Speech-to-Text
    const fallbackResult = await fallbackAudioTranscription(videoId, url);
    return NextResponse.json({
      success: true,
      text: fallbackResult.text,
      sourceName: fallbackResult.title || `YouTube Video (${videoId})`,
      source: 'gemini-transcribe-fallback',
      metadata: {
        video_id: videoId,
        url: url,
        method: 'gemini-transcribe-fallback',
        word_count: fallbackResult.text.split(/\s+/).filter(Boolean).length
      }
    });
  } catch (err: any) {
    console.warn('[YouTube Pipeline] Extraction failed:', err.message);
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
      {
        success: false,
        error:
          err.message ||
          'YouTube transcript extraction unavailable. Both captions and automated audio stream downloads were restricted by YouTube for this URL.'
      },
      { status: 400 }
    );
  }
}


