import { NextResponse } from 'next/server';

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
        const parser = new PDFParseClass(new Uint8Array(buffer));
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
            file_size_bytes: buffer.length
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
          file_size_bytes: buffer.length
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
  }

  // If text is missing or < 10 characters:
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
