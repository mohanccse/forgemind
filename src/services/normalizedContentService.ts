import {
  NormalizedStudyContent,
  StudyMaterialSourceType,
  ContentProcessingStatus,
  ExtractedConceptCandidate
} from '../types';

/**
 * Normalizes raw input text into standardized plain text:
 * - strips excessive carriage returns
 * - collapses runs of whitespace while preserving paragraph breaks
 * - removes zero-width characters
 */
export function normalizeInputText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Creates a common normalized-content object conforming to Step 7
 */
export function createNormalizedContent(params: {
  source_type: StudyMaterialSourceType;
  source_name: string;
  raw_text: string;
  language?: string;
  metadata?: Record<string, any>;
  status?: ContentProcessingStatus;
}): NormalizedStudyContent {
  const normalized_text = normalizeInputText(params.raw_text);
  const words = normalized_text.length > 0 ? normalized_text.split(/\s+/).filter(Boolean).length : 0;

  return {
    source_type: params.source_type,
    source_name: params.source_name.trim() || 'Untitled Study Material',
    normalized_text,
    language: params.language || 'en',
    metadata: {
      word_count: words,
      character_count: normalized_text.length,
      created_at: new Date().toISOString(),
      ...params.metadata
    },
    processing_status: params.status || 'READY'
  };
}

export interface ConceptExtractionResult {
  success: boolean;
  candidate?: ExtractedConceptCandidate;
  error?: string;
}

export interface PdfParseResult {
  success: boolean;
  normalizedContent?: NormalizedStudyContent;
  error?: string;
  isScanned?: boolean;
}

/**
 * Step 10: Client-side file reader & upload handler for PDF extraction
 */
export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  try {
    if (!file) {
      return { success: false, error: 'No PDF file selected.' };
    }

    if (file.size > 15 * 1024 * 1024) {
      return {
        success: false,
        error: `File exceeds maximum allowed size of 15MB (selected file: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      };
    }

    if (file.size === 0) {
      return { success: false, error: 'The selected PDF file is empty (0 bytes).' };
    }

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/study-material/parse-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
        fileSize: file.size
      })
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok || !data || !data.success) {
      const errStr = data?.error || (res.status === 413 ? 'File size payload is too large to process.' : `Server error (${res.status}). Failed to parse PDF.`);
      return {
        success: false,
        error: errStr,
        isScanned: Boolean(errStr.includes('extractable text'))
      };
    }

    // Create common normalized-content object conforming to Step 7 & 10
    const normalized = createNormalizedContent({
      source_type: 'pdf',
      source_name: data.sourceName || file.name,
      raw_text: data.text,
      metadata: {
        ...data.metadata,
        original_filename: file.name,
        file_size_bytes: file.size
      },
      status: 'READY'
    });

    return {
      success: true,
      normalizedContent: normalized
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while reading the PDF file.'
    };
  }
}

export interface DocxParseResult {
  success: boolean;
  normalizedContent?: NormalizedStudyContent;
  error?: string;
}

/**
 * Step 11: Client-side file reader & upload handler for DOCX extraction
 */
export async function parseDocxFile(file: File): Promise<DocxParseResult> {
  try {
    if (!file) {
      return { success: false, error: 'No Word (.docx) file selected.' };
    }

    const fileName = file.name.trim();
    if (!fileName.toLowerCase().endsWith('.docx')) {
      return {
        success: false,
        error: 'Unsupported file format. Only Microsoft Word (.docx) files are supported in this tab.'
      };
    }

    if (file.size > 15 * 1024 * 1024) {
      return {
        success: false,
        error: `File exceeds maximum allowed size of 15MB (selected file: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      };
    }

    if (file.size === 0) {
      return { success: false, error: 'The selected DOCX file is empty (0 bytes).' };
    }

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/study-material/parse-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
        fileSize: file.size
      })
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok || !data || !data.success) {
      const errStr = data?.error || (res.status === 413 ? 'File size payload is too large to process.' : `Server error (${res.status}). Failed to parse DOCX document.`);
      return {
        success: false,
        error: errStr
      };
    }

    // Create common normalized-content object conforming to Step 7 & 11
    const normalized = createNormalizedContent({
      source_type: 'docx',
      source_name: data.sourceName || file.name,
      raw_text: data.text,
      metadata: {
        ...data.metadata,
        original_filename: file.name,
        file_size_bytes: file.size
      },
      status: 'READY'
    });

    return {
      success: true,
      normalizedContent: normalized
    };
  } catch (err: any) {
    console.error('Error reading DOCX file:', err);
    return {
      success: false,
      error: err.message || 'Error processing DOCX file.'
    };
  }
}

export interface YoutubeParseResult {
  success: boolean;
  normalizedContent?: NormalizedStudyContent;
  error?: string;
}

/**
 * Step 12: Client handler to fetch YouTube video lecture transcript
 */
export async function parseYoutubeUrl(url: string): Promise<YoutubeParseResult> {
  try {
    if (!url || !url.trim()) {
      return { success: false, error: 'Please enter a YouTube video URL.' };
    }

    const res = await fetch('/api/study-material/parse-youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url.trim() })
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok || !data || !data.success) {
      return {
        success: false,
        error: data?.error || `Server error (${res.status}). Failed to extract YouTube transcript.`
      };
    }

    const normalized = createNormalizedContent({
      source_type: 'youtube',
      source_name: data.sourceName || 'YouTube Video Lecture',
      raw_text: data.text,
      metadata: data.metadata,
      status: 'READY'
    });

    return {
      success: true,
      normalizedContent: normalized
    };
  } catch (err: any) {
    console.error('Error fetching YouTube transcript:', err);
    return {
      success: false,
      error: err.message || 'Error processing YouTube transcript.'
    };
  }
}

export interface AudioParseResult {
  success: boolean;
  normalizedContent?: NormalizedStudyContent;
  error?: string;
}

/**
 * Step 12: Client handler for Audio Speech-to-Text via gemini-3.5-transcribe
 */
export async function parseAudioFile(file: File): Promise<AudioParseResult> {
  try {
    if (!file) {
      return { success: false, error: 'No audio file selected.' };
    }

    if (file.size > 25 * 1024 * 1024) {
      return {
        success: false,
        error: `Audio file exceeds maximum allowed size of 25MB (selected file: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      };
    }

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/study-material/parse-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
        mimeType: file.type || 'audio/mp3'
      })
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok || !data || !data.success) {
      return {
        success: false,
        error: data?.error || `Server error (${res.status}). Failed to transcribe audio.`
      };
    }

    const normalized = createNormalizedContent({
      source_type: 'audio',
      source_name: data.sourceName || file.name,
      raw_text: data.text,
      metadata: {
        ...data.metadata,
        original_filename: file.name,
        file_size_bytes: file.size
      },
      status: 'READY'
    });

    return {
      success: true,
      normalizedContent: normalized
    };
  } catch (err: any) {
    console.error('Error transcribing audio:', err);
    return {
      success: false,
      error: err.message || 'Error processing audio speech-to-text.'
    };
  }
}

export interface VideoParseResult {
  success: boolean;
  normalizedContent?: NormalizedStudyContent;
  error?: string;
}

/**
 * Step 14: Client handler for Video Ingestion via ffmpeg demuxing & Gemini Speech-to-Text
 */
export async function parseVideoFile(file: File): Promise<VideoParseResult> {
  try {
    if (!file) {
      return { success: false, error: 'No video file selected.' };
    }

    if (file.size > 50 * 1024 * 1024) {
      return {
        success: false,
        error: `Video file exceeds maximum allowed size of 50MB (selected file: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      };
    }

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/study-material/parse-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
        mimeType: file.type || 'video/mp4'
      })
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok || !data || !data.success) {
      return {
        success: false,
        error: data?.error || `Server error (${res.status}). Failed to process video file.`
      };
    }

    const normalized = createNormalizedContent({
      source_type: 'video',
      source_name: data.sourceName || file.name,
      raw_text: data.text,
      metadata: {
        ...data.metadata,
        original_filename: file.name,
        file_size_bytes: file.size
      },
      status: 'READY'
    });

    return {
      success: true,
      normalizedContent: normalized
    };
  } catch (err: any) {
    console.error('Error processing video:', err);
    return {
      success: false,
      error: err.message || 'Error processing video transcription.'
    };
  }
}

/**
 * Calls the server-side extraction engine (Gemini)
 */
export async function extractConceptFromStudyMaterial(
  normalizedContent: NormalizedStudyContent
): Promise<ConceptExtractionResult> {
  try {
    const res = await fetch('/api/study-material/extract-concept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ normalized_content: normalizedContent })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        error: errJson?.error || `Server extraction failed with status ${res.status}`
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Network error during concept extraction:', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with ForgeMind extraction service.'
    };
  }
}

/**
 * Sample study materials for testing Door 2
 */
export const SAMPLE_STUDY_MATERIALS = [
  {
    id: 'postgres-window',
    title: 'PostgreSQL Window Functions & Frame Specifications',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `A window function performs a calculation across a set of table rows that are somehow related to the current row. This is comparable to the type of calculation that can be done with an aggregate function. However, window functions do not cause rows to become grouped into a single output row like non-window aggregate calls would. Instead, the rows retain their separate identities. Behind the scenes, the window function is able to access more than just the current row of the query result.

A window function call always contains an OVER clause directly following the window function's name and arguments. This is what syntactically distinguishes it from a regular function or non-window aggregate. The OVER clause determines exactly how the rows of the query are split up for processing by the window function.

The PARTITION BY clause within OVER divides the rows into partitions, that share the same values of the PARTITION BY expression(s). For each row, the window function is computed across the rows that fall into the same partition as the current row.

The ORDER BY clause within OVER controls the order in which rows are processed. When an ORDER BY is specified, the default frame specification is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. This can cause unexpected running totals rather than partition-wide aggregations if the user intended to aggregate across the full partition. To compute across the full partition while still ordering, ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING or omitting the ORDER BY in plain aggregates must be explicitly chosen.

Common window functions include ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD(), and analytical aggregations like SUM() OVER (). Understanding the distinction between physical row framing (ROWS) and logical value framing (RANGE) with duplicate order values is essential for building defensible financial ledgers and analytical rollups.`
  },
  {
    id: 'rag-embeddings',
    title: 'Vector Embeddings & Retrieval Augmented Generation (RAG)',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `Vector embeddings transform unstructured textual passages into dense high-dimensional numeric arrays where semantic similarity corresponds to geometric proximity in vector space. In Retrieval-Augmented Generation (RAG), embeddings allow an application to retrieve relevant context passages to ground an LLM generation against external private knowledge bases.

A fundamental engineering trade-off in RAG systems is chunking strategy. Chunk size dictates retrieval granularity:
- Small chunks (e.g., 128 tokens) preserve fine-grained semantic density and minimize vector dilution, but risk losing contextual narrative and co-reference antecedents.
- Large chunks (e.g., 1024 tokens) provide rich context to the LLM generation prompt, but often suffer from embedding dilution where distinct concepts blur into a generalized vector average.

Furthermore, retrieval similarity metrics such as Cosine Similarity, Dot Product (for normalized vectors), and Euclidean Distance (L2) behave differently when vectors vary in magnitude. 

A critical failure mode in naive RAG implementations is semantic overlap without reciprocal rank reranking. When a query matches keyword synonyms or topical themes, top-k vector search may return redundant near-duplicate chunks rather than orthogonal facets of evidence needed to answer multi-hop questions. Implementing two-stage retrieval—dense semantic retrieval followed by cross-encoder re-ranking or maximal marginal relevance (MMR)—is required for high-precision enterprise question-answering.`
  },
  {
    id: 'low-confidence-sample',
    title: 'Ambiguous Informal Notes (Low Confidence Test)',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `Hey guys, just taking some quick meeting notes here. We had a sync at 2pm and discussed a lot of stuff. Bob mentioned we should try to make things faster. Sarah said the team is doing great. We had coffee. Let's make sure we do good work next week and review things later. Thanks!`
  }
];
