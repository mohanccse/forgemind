import { NextResponse } from 'next/server';
import zlib from 'zlib';
import { getGenAI } from '@/lib/gemini';

export interface QualityCheckResult {
  isValid: boolean;
  reason: string;
  readableWordRatio: number;
  singleCharTokenRatio: number;
  corruptedCharRatio: number;
}

/**
 * Validates text quality beyond simple character count.
 * Catches spaced-letter artifacts ("T h e   F u n d a m e n t a l s"),
 * raw unmapped escape sequences ("\1022", "\222"), control characters,
 * and low readable word ratios.
 */
export function validateExtractedTextQuality(text: string): QualityCheckResult {
  if (!text || text.trim().length < 50) {
    return {
      isValid: false,
      reason: 'Text length is below minimum quality threshold (< 50 characters).',
      readableWordRatio: 0,
      singleCharTokenRatio: 0,
      corruptedCharRatio: 0
    };
  }

  const trimmed = text.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 10) {
    return {
      isValid: false,
      reason: 'Token count is below minimum threshold (< 10 words).',
      readableWordRatio: 0,
      singleCharTokenRatio: 0,
      corruptedCharRatio: 0
    };
  }

  // 1. Check for spaced-out characters (e.g. "T h e   F u n d a m e n t a l s")
  // Count isolated single letters (excluding standard English words 'a', 'A', 'I')
  const isolatedSingleChars = tokens.filter(
    (t) => /^[a-zA-Z]$/.test(t) && t !== 'a' && t !== 'A' && t !== 'I'
  );
  const singleCharTokenRatio = isolatedSingleChars.length / tokens.length;
  if (singleCharTokenRatio > 0.15) {
    return {
      isValid: false,
      reason: `Spaced-character artifact detected: ${(singleCharTokenRatio * 100).toFixed(1)}% of tokens are isolated single letters.`,
      readableWordRatio: 0,
      singleCharTokenRatio,
      corruptedCharRatio: 0
    };
  }

  // 2. Check for unresolved raw escape sequences (e.g. \1022, \222, \001) or non-printable control characters
  const rawEscapeMatches = trimmed.match(/\\[0-9]{2,4}/g) || [];
  const controlCharMatches = trimmed.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g) || [];
  const totalCorruptedInstances = rawEscapeMatches.length + controlCharMatches.length;
  const corruptedCharRatio = totalCorruptedInstances / tokens.length;
  if (corruptedCharRatio > 0.02 || rawEscapeMatches.length > 5) {
    return {
      isValid: false,
      reason: `Raw unresolved escape/control codes detected: ${rawEscapeMatches.length} escape codes, ${controlCharMatches.length} control characters.`,
      readableWordRatio: 0,
      singleCharTokenRatio,
      corruptedCharRatio
    };
  }

  // 3. Ratio of readable, coherent words
  const readableWordRegex = /^[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*[.,!?;:()"]*$/;
  const readableWords = tokens.filter((t) => readableWordRegex.test(t));
  const readableWordRatio = readableWords.length / tokens.length;
  if (readableWordRatio < 0.70) {
    return {
      isValid: false,
      reason: `Low readable word ratio: only ${(readableWordRatio * 100).toFixed(1)}% of tokens are valid readable words.`,
      readableWordRatio,
      singleCharTokenRatio,
      corruptedCharRatio
    };
  }

  return {
    isValid: true,
    reason: 'Quality validation passed.',
    readableWordRatio,
    singleCharTokenRatio,
    corruptedCharRatio
  };
}

function normalizePdfTypography(str: string): string {
  return str
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    // Map common typographic font ligatures:
    .replace(/\u0007/g, 'fi')
    .replace(/\u001c/g, 'ff')
    .replace(/\u001e/g, 'fi')
    .replace(/\u001f/g, 'fl')
    .replace(/\u001d/g, ' - ')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Clean unmapped non-printable control characters (exclude whitespace \n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g, '');
}

function extractCleanPdfStream(buffer: Buffer): { text: string; pageCount: number } | null {
  try {
    const content = buffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const blocks: string[] = [];

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed = '';
      try {
        decompressed = zlib.inflateSync(rawStream).toString('utf-8');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream).toString('utf-8');
        } catch {
          continue;
        }
      }

      const btRegex = /BT[\s\S]*?ET/g;
      let btMatch;
      while ((btMatch = btRegex.exec(decompressed)) !== null) {
        const block = btMatch[0];
        let blockText = '';

        const opRegex = /(\[(?:[^\]]+)\])\s*TJ|\(([^)]*)\)\s*Tj/g;
        let opMatch;
        while ((opMatch = opRegex.exec(block)) !== null) {
          if (opMatch[1]) {
            const inner = opMatch[1];
            const strRegex = /\(([^)]*)\)/g;
            let sMatch;
            let tjStr = '';
            while ((sMatch = strRegex.exec(inner)) !== null) {
              tjStr += normalizePdfTypography(sMatch[1]);
            }
            blockText += tjStr;
          } else if (opMatch[2] !== undefined) {
            blockText += normalizePdfTypography(opMatch[2]);
          }
        }
        if (blockText.trim()) {
          blocks.push(blockText.trim());
        }
      }
    }

    const full = blocks
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    const pageMatch = content.match(/\/Type\s*\/Page[^s]/g);
    const pageCount = pageMatch ? pageMatch.length : 1;

    return { text: full, pageCount };
  } catch (e) {
    console.warn('[PDF Stream Extractor] Stream extraction failed:', e);
    return null;
  }
}

async function parsePdfBuffer(buffer: Buffer, fileName: string): Promise<{
  text: string;
  pageCount: number;
  isScanned: boolean;
  metadata: Record<string, any>;
}> {
  // 1. Header check
  const headerStr = buffer.subarray(0, 1024).toString('utf-8');
  if (!headerStr.includes('%PDF-')) {
    throw new Error('Unable to parse PDF. The file appears to be corrupted or malformed.');
  }

  let tierFailureReasons: string[] = [];

  // 2. Primary PDF Parser using PDFParse (pdf-parse v2 / v1)
  try {
    const pdfParseModule: any = await import('pdf-parse');
    const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default;

    if (typeof PDFParseClass === 'function') {
      let text = '';
      let pageCount = 1;

      if (PDFParseClass.prototype && typeof PDFParseClass.prototype.getText === 'function') {
        const parser = new PDFParseClass({ data: buffer });
        if (typeof parser.load === 'function') {
          await parser.load();
        }
        const parsedData = await parser.getText();
        text = (typeof parsedData === 'string' ? parsedData : parsedData?.text) || '';
        pageCount = (parsedData && Array.isArray(parsedData.pages))
          ? parsedData.pages.length
          : (parsedData?.total || 1);
      } else {
        const data = await PDFParseClass(buffer);
        text = (data?.text || '').trim();
        pageCount = data?.numpages || 1;
      }

      const cleaned = text.replace(/\s+/g, ' ').trim();
      const quality = validateExtractedTextQuality(cleaned);
      if (quality.isValid) {
        return {
          text: cleaned,
          pageCount,
          isScanned: false,
          metadata: {
            original_filename: fileName,
            page_count: pageCount,
            file_size_bytes: buffer.length,
            extracted_via: 'pdf_parse',
            quality_metrics: quality
          }
        };
      } else {
        tierFailureReasons.push(`Tier 1 (pdf-parse) failed quality check: ${quality.reason}`);
        console.warn(`[PDF Parser] Tier 1 quality check rejected: ${quality.reason}`);
      }
    }
  } catch (parseErr: any) {
    if (
      parseErr?.name === 'PasswordException' ||
      parseErr?.message?.toLowerCase().includes('password') ||
      parseErr?.message?.toLowerCase().includes('encrypted')
    ) {
      throw new Error('This PDF is password-protected and cannot be extracted.');
    }
    tierFailureReasons.push(`Tier 1 (pdf-parse) runtime error: ${parseErr?.message || 'unknown'}`);
    console.warn('[PDF Parser] Tier 1 error, proceeding to Tier 2:', parseErr?.message);
  }

  // 3. Secondary Fallback using Mozilla PDF.js (pdfjs-dist)
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true
    });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages || 1;
    let textParts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (item && 'str' in item ? item.str : ''))
        .join(' ')
        .trim();
      if (pageText) {
        textParts.push(pageText);
      }
    }

    const fullText = textParts.join('\n\n').replace(/\s+/g, ' ').trim();
    const quality = validateExtractedTextQuality(fullText);
    if (quality.isValid) {
      return {
        text: fullText,
        pageCount,
        isScanned: false,
        metadata: {
          original_filename: fileName,
          page_count: pageCount,
          file_size_bytes: buffer.length,
          extracted_via: 'pdfjs_dist',
          quality_metrics: quality
        }
      };
    } else {
      tierFailureReasons.push(`Tier 2 (pdfjs-dist) failed quality check: ${quality.reason}`);
      console.warn(`[PDF Parser] Tier 2 quality check rejected: ${quality.reason}`);
    }
  } catch (pdfjsErr: any) {
    if (
      pdfjsErr.name === 'PasswordException' ||
      pdfjsErr.message?.toLowerCase().includes('password') ||
      pdfjsErr.message?.toLowerCase().includes('encrypted')
    ) {
      throw new Error('This PDF is password-protected and cannot be extracted.');
    }
    tierFailureReasons.push(`Tier 2 (pdfjs-dist) runtime error: ${pdfjsErr?.message || 'unknown'}`);
    console.warn('[PDF Parser] Tier 2 error, proceeding to Tier 3:', pdfjsErr?.message);
  }

  // 4. Tertiary Fallback: High-Fidelity Native zlib Stream Parser
  const streamResult = extractCleanPdfStream(buffer);
  if (streamResult) {
    const quality = validateExtractedTextQuality(streamResult.text);
    if (quality.isValid) {
      return {
        text: streamResult.text,
        pageCount: streamResult.pageCount,
        isScanned: false,
        metadata: {
          original_filename: fileName,
          page_count: streamResult.pageCount,
          file_size_bytes: buffer.length,
          extracted_via: 'zlib_stream_extractor',
          quality_metrics: quality
        }
      };
    } else {
      tierFailureReasons.push(`Tier 3 (zlib_stream_extractor) failed quality check: ${quality.reason}`);
      console.warn(`[PDF Parser] Tier 3 quality check rejected: ${quality.reason}`);
    }
  } else {
    tierFailureReasons.push('Tier 3 (zlib_stream_extractor) returned null');
  }

  // 5. Quaternary Ultimate Fallback: Gemini Multimodal Document Extraction
  // Fires whenever Tiers 1-3 fail runtime execution OR fail text quality validation
  const tier4Reason = tierFailureReasons.join('; ');
  console.warn(`[PDF Parser Tier 4 Triggered] Reason: ${tier4Reason}. Falling back to Gemini Multimodal Document Extraction.`);

  try {
    const ai = getGenAI();
    if (ai) {
      const base64Str = buffer.toString('base64');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Str
                }
              },
              {
                text: 'Extract all text content from this document verbatim. Preserve all headings, section titles, paragraphs, bullet points, and tables. Do not summarize or add commentary; output only the clean extracted document text.'
              }
            ]
          }
        ]
      });

      const geminiText = (response.text || '').replace(/\s+/g, ' ').trim();
      const quality = validateExtractedTextQuality(geminiText);

      // Acceptance: text must pass quality check and have >= 50 characters
      if (quality.isValid && geminiText.length >= 50) {
        console.log(`[PDF Parser Tier 4 Success] Gemini successfully extracted ${geminiText.length} characters of clean text (readable word ratio: ${(quality.readableWordRatio * 100).toFixed(1)}%).`);
        return {
          text: geminiText,
          pageCount: 1,
          isScanned: false,
          metadata: {
            original_filename: fileName,
            page_count: 1,
            file_size_bytes: buffer.length,
            extracted_via: 'gemini_multimodal',
            quality_metrics: quality
          }
        };
      } else {
        console.warn(`[PDF Parser Tier 4] Gemini extraction output failed quality check: ${quality.reason}`);
      }
    }
  } catch (geminiErr: any) {
    console.warn('[PDF Parser Tier 4 Failed] Gemini multimodal extraction error:', geminiErr?.message);
  }

  // If text is missing or rejected across all 4 extractors:
  throw new Error('This PDF does not contain extractable text yet.');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileData, fileName, fileSize } = body;

    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'PDF file data is required.' },
        { status: 400 }
      );
    }

    const size = fileSize || 0;
    if (size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit of 15MB.' },
        { status: 400 }
      );
    }

    const base64Data = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'The selected PDF file is empty (0 bytes).' },
        { status: 400 }
      );
    }

    const result = await parsePdfBuffer(buffer, fileName || 'document.pdf');

    return NextResponse.json({
      success: true,
      text: result.text,
      pageCount: result.pageCount,
      sourceName: fileName || 'Uploaded PDF Document',
      metadata: result.metadata
    });
  } catch (err: any) {
    console.warn('PDF parsing error:', err.message);
    const errorMessage = err.message || 'Unable to parse PDF document.';
    const status = errorMessage.includes('extractable text') ? 422 : 400;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}
