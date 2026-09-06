import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

async function parseDocxBuffer(buffer: Buffer, fileName: string): Promise<{
  text: string;
  metadata: Record<string, any>;
}> {
  // 1. Check for valid ZIP / DOCX magic bytes (PK\x03\x04)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('Unable to parse DOCX. The file appears to be corrupted or malformed.');
  }

  // 2. Extract text using mammoth
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = (result.value || '').trim();

    if (!rawText || rawText.length === 0) {
      throw new Error('This DOCX document contains no extractable text.');
    }

    const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

    return {
      text: cleanedText,
      metadata: {
        original_filename: fileName,
        word_count: wordCount,
        file_size_bytes: buffer.length
      }
    };
  } catch (err: any) {
    if (err.message?.includes('contains no extractable text')) {
      throw err;
    }
    // Fallback XML zip stream parser if mammoth encounters an issue
    try {
      const bufferStr = buffer.toString('binary');
      const textMatches = bufferStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      const extractedText = textMatches.map((t) => t.replace(/<[^>]+>/g, '')).join(' ').trim();

      if (extractedText.length >= 10) {
        return {
          text: extractedText,
          metadata: {
            original_filename: fileName,
            file_size_bytes: buffer.length
          }
        };
      }
    } catch {
      // Ignore
    }

    throw new Error(err.message || 'Unable to parse DOCX document. File may be corrupted.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileData, fileName, fileSize } = body;

    if (!fileData) {
      return NextResponse.json(
        { success: false, error: 'DOCX file data is required.' },
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
        { success: false, error: 'The selected DOCX file is empty (0 bytes).' },
        { status: 400 }
      );
    }

    const result = await parseDocxBuffer(buffer, fileName || 'document.docx');

    return NextResponse.json({
      success: true,
      text: result.text,
      sourceName: fileName || 'Uploaded Word Document',
      metadata: result.metadata
    });
  } catch (err: any) {
    console.warn('DOCX parsing error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Unable to parse DOCX document.' },
      { status: 400 }
    );
  }
}
