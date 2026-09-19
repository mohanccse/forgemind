import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
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
 * Fetch official video title & author via YouTube's public oEmbed endpoint.
 * Requires no API key, never blocked, 100% free and official.
 */
async function fetchYouTubeMetadata(videoId: string): Promise<{ title: string; author?: string }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.title) {
        return {
          title: data.title.trim(),
          author: data.author_name?.trim()
        };
      }
    }
  } catch (err) {
    console.warn('[YouTube Pipeline] oEmbed metadata warning:', err);
  }
  return { title: `YouTube Video (${videoId})` };
}

/**
 * Tier 1: Direct Caption Stream Extraction via youtube-transcript library.
 * Leverages YouTube's timedtext endpoint directly without stream deciphering or audio download.
 */
async function extractViaYoutubeTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[YouTube Pipeline] Trying Tier-1 youtube-transcript for video: ${videoId}`);
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && Array.isArray(items) && items.length > 0) {
      const fullText = items
        .map((i) => i.text)
        .join(' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      if (fullText.length >= 50) {
        console.log(`[YouTube Pipeline] Tier-1 success: Extracted ${items.length} caption lines (${fullText.length} chars).`);
        return fullText;
      }
    }
  } catch (err: any) {
    console.warn('[YouTube Pipeline] Tier-1 youtube-transcript attempt:', err?.message || err);
  }
  return null;
}

/**
 * Tier 2: Custom HTML & JSON3 Caption Scraping Fallback.
 */
async function extractViaCaptionScraper(videoId: string): Promise<string | null> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': 'SOCS=CAESEwgDEgk1ODEyODQxMDMaAmVuIAEaBgiA_qyvBg; PREF=f6=4000000&hl=en'
  };

  try {
    console.log(`[YouTube Pipeline] Trying Tier-2 HTML caption scraper for video: ${videoId}`);
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, { headers });

    if (!response.ok) return null;
    const html = await response.text();

    let captionTracks: any[] = [];
    const playerRespMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/);
    if (playerRespMatch) {
      try {
        const playerResp = JSON.parse(playerRespMatch[1]);
        const tracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          captionTracks = tracks;
        }
      } catch {
        // ignore
      }
    }

    if (captionTracks.length === 0) {
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch && captionMatch[1]) {
        try {
          captionTracks = JSON.parse(captionMatch[1]);
        } catch {
          // ignore
        }
      }
    }

    if (captionTracks.length > 0) {
      const track =
        captionTracks.find((t: any) => t.languageCode?.startsWith('en')) || captionTracks[0];

      if (track?.baseUrl) {
        // Try JSON3 format
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
          if (cleanText.length >= 50) return cleanText;
        }

        // Try XML format
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

          if (cleanText.length >= 50) return cleanText;
        }
      }
    }
  } catch (err: any) {
    console.warn('[YouTube Pipeline] Tier-2 caption scraper attempt failed:', err?.message || err);
  }
  return null;
}

/**
 * Tier 3: Audio Stream Download + Gemini Multimodal Speech-to-Text.
 * Used only when captions are completely missing. Protected with safety caps.
 */
async function fallbackAudioTranscription(
  videoId: string,
  url: string,
  title: string
): Promise<string | null> {
  console.log(`[YouTube Pipeline] Initiating Tier-3 Gemini Audio Fallback for video: ${videoId}`);

  const ai = getGenAI();
  if (!ai) {
    console.warn('[YouTube Pipeline] Gemini API not configured for audio fallback.');
    return null;
  }

  try {
    const videoInfo = await play.video_info(url);
    const durationSec = Number(videoInfo?.video_details?.durationInSec || 0);

    if (durationSec > 1800) {
      console.warn(`[YouTube Pipeline] Video exceeds 30m audio limit (${durationSec}s).`);
      return null;
    }

    const formats = videoInfo.format || [];
    const urlFormats = formats.filter((f: any) => f.url);
    const audioOnlyFormats = urlFormats.filter(
      (f: any) => f.mimeType && f.mimeType.startsWith('audio/')
    );

    const chosenFormat =
      audioOnlyFormats.length > 0
        ? audioOnlyFormats.sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0))[0]
        : urlFormats.find((f: any) => f.itag === 18) || urlFormats[0];

    if (!chosenFormat?.url) {
      console.warn('[YouTube Pipeline] No decipherable audio stream URL available from play-dl.');
      return null;
    }

    const audioRes = await fetch(chosenFormat.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });

    if (!audioRes.ok) return null;

    const arrayBuffer = await audioRes.arrayBuffer();
    let audioBuffer = Buffer.from(arrayBuffer);

    const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      audioBuffer = audioBuffer.subarray(0, MAX_AUDIO_BYTES);
    }

    const rawMime = chosenFormat.mimeType ? chosenFormat.mimeType.split(';')[0].trim() : 'audio/mp3';
    const audioMime = rawMime.includes('webm') ? 'audio/webm' : rawMime.includes('mp4') ? 'audio/mp4' : 'audio/mp3';
    const base64Audio = audioBuffer.toString('base64');

    const response = await executeWithTimeoutAndRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3.5-flash',
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

    const text = response.text?.trim() || '';
    return text.length >= 50 ? text : null;
  } catch (err: any) {
    console.warn('[YouTube Pipeline] Tier-3 audio fallback failed:', err?.message || err);
    return null;
  }
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

    // Step 1: Fetch reliable video metadata via official oEmbed
    const metadata = await fetchYouTubeMetadata(videoId);
    const videoTitle = metadata.title;

    // Step 2: Primary Extraction — youtube-transcript
    let transcriptText = await extractViaYoutubeTranscript(videoId);
    let extractionMethod = 'captions-timedtext';

    // Step 3: Secondary Extraction — Direct HTML/JSON3 caption scraper
    if (!transcriptText) {
      transcriptText = await extractViaCaptionScraper(videoId);
      extractionMethod = 'captions-scraper';
    }

    // Step 4: Tertiary Extraction — Audio Stream + Gemini Multimodal
    if (!transcriptText) {
      transcriptText = await fallbackAudioTranscription(videoId, url, videoTitle);
      extractionMethod = 'gemini-audio-transcribe';
    }

    // Success response
    if (transcriptText) {
      return NextResponse.json({
        success: true,
        text: transcriptText,
        sourceName: videoTitle,
        source: extractionMethod,
        metadata: {
          video_id: videoId,
          url: url,
          title: videoTitle,
          author: metadata.author,
          method: extractionMethod,
          word_count: transcriptText.split(/\s+/).filter(Boolean).length
        }
      });
    }

    // Friendly, graceful error if the video creator disabled all captions
    return NextResponse.json(
      {
        success: false,
        error: `Subtitles and closed captions are not available for "${videoTitle}". The video creator may have disabled them. Please paste the transcript or notes directly into the "Paste Notes" tab.`,
        suggestPasteNotes: true,
        videoTitle: videoTitle
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[YouTube Pipeline] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Unable to process YouTube URL. Please verify the link or paste the text directly.'
      },
      { status: 400 }
    );
  }
}
