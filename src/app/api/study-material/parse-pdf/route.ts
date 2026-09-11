import { NextResponse } from 'next/server';
import zlib from 'zlib';
import { getGenAI } from '@/lib/gemini';

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

  // 2. Encrypted / password-protected check
  if (buffer.includes(Buffer.from('/Encrypt'))) {
    // Note: Some unencrypted PDFs contain "/Encrypt" in cross-reference or stream metadata,
    // so we verify whether parser throws PasswordException before hard failing.
  }

  // 3. Primary PDF Parser using PDFParse (pdf-parse v2 / v1)
  try {
    const pdfParseModule: any = await import('pdf-parse');
    const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default;

    if (typeof PDFParseClass === 'function') {
      let text = '';
      let pageCount = 1;

      // Check if it's a class constructor (v2+)
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
        // Legacy function signature: pdfParse(buffer)
        const data = await PDFParseClass(buffer);
        text = (data?.text || '').trim();
        pageCount = data?.numpages || 1;
      }

      const cleaned = text.replace(/\s+/g, ' ').trim();
      const alphaCount = (cleaned.match(/[a-zA-Z0-9]/g) || []).length;
      if (alphaCount >= 10) {
        return {
          text: cleaned,
          pageCount,
          isScanned: false,
          metadata: {
            original_filename: fileName,
            page_count: pageCount,
            file_size_bytes: buffer.length,
            extracted_via: 'pdf_parse'
          }
        };
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
    console.warn('[PDF Parser] pdf-parse primary error, trying fallbacks:', parseErr?.message);
  }

  // 4. Secondary Fallback using Mozilla PDF.js (pdfjs-dist)
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
    const alphaCount = (fullText.match(/[a-zA-Z0-9]/g) || []).length;

    if (alphaCount >= 10) {
      return {
        text: fullText,
        pageCount,
        isScanned: false,
        metadata: {
          original_filename: fileName,
          page_count: pageCount,
          file_size_bytes: buffer.length,
          extracted_via: 'pdfjs_dist'
        }
      };
    }
  } catch (pdfjsErr: any) {
    if (
      pdfjsErr.name === 'PasswordException' ||
      pdfjsErr.message?.toLowerCase().includes('password') ||
      pdfjsErr.message?.toLowerCase().includes('encrypted')
    ) {
      throw new Error('This PDF is password-protected and cannot be extracted.');
    }
    console.warn('[PDF Parser] pdfjs-dist secondary error, trying native stream parser:', pdfjsErr?.message);
  }

  // 5. Tertiary Fallback using Node.js built-in zlib stream parser (Zero-dependency, resilient)
  try {
    const content = buffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    const textPieces: string[] = [];

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
        const tjRegex = /\(([^)]+)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          textPieces.push(tjMatch[1]);
        }
        const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
        let arrayMatch;
        while ((arrayMatch = arrayTjRegex.exec(block)) !== null) {
          const inner = arrayMatch[1];
          const strRegex = /\(([^)]+)\)/g;
          let sMatch;
          while ((sMatch = strRegex.exec(inner)) !== null) {
            textPieces.push(sMatch[1]);
          }
        }
      }
    }

    const streamText = textPieces.join(' ').replace(/\s+/g, ' ').trim();
    const alphaCount = (streamText.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaCount >= 10) {
      const pageMatch = content.match(/\/Type\s*\/Page[^s]/g);
      const pageCount = pageMatch ? pageMatch.length : 1;
      return {
        text: streamText,
        pageCount,
        isScanned: false,
        metadata: {
          original_filename: fileName,
          page_count: pageCount,
          file_size_bytes: buffer.length,
          extracted_via: 'zlib_stream_extractor'
        }
      };
    }
  } catch (zlibErr: any) {
    console.warn('[PDF Parser] Native zlib stream parser warning:', zlibErr?.message);
  }

  // 6. Quaternary Ultimate Fallback: Gemini Multimodal Document Extraction
  // Solves true image-based scanned PDFs or PDFs with proprietary font encodings
  try {
    const ai = getGenAI();
    if (ai) {
      const base64Str = buffer.toString('base64');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
                text: 'Extract all text content from this document verbatim. Preserve all headings, section titles, paragraphs, bullet points, and tables. Do not summarize or add markdown commentary; output only the extracted document text.'
              }
            ]
          }
        ]
      });

      const geminiText = (response.text || '').replace(/\s+/g, ' ').trim();
      const alphaCount = (geminiText.match(/[a-zA-Z0-9]/g) || []).length;
      if (alphaCount >= 10) {
        return {
          text: geminiText,
          pageCount: 1,
          isScanned: false,
          metadata: {
            original_filename: fileName,
            page_count: 1,
            file_size_bytes: buffer.length,
            extracted_via: 'gemini_multimodal'
          }
        };
      }
    }
  } catch (geminiErr: any) {
    console.warn('[PDF Parser] Gemini multimodal PDF fallback warning:', geminiErr?.message);
  }

  // If text is missing or < 10 characters across all extractors:
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
