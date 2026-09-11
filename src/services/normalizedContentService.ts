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
    id: 'ai-evals-guardrails',
    title: 'AI Model Evaluation: Latency, Guardrails & Quality Evals for PMs',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `When deploying generative AI features into customer-facing software products, product managers must navigate the tripartite trade-off between output quality (evals), system latency (P95 response time), and economic cost per query.

A core operational responsibility of an AI Product Manager is establishing quantitative benchmark suites rather than relying on qualitative spot-checks or vibe checks. Offline evaluations assess model performance against golden evaluation datasets measuring task adherence, factual groundedness (hallucination rate), and brand alignment. Online evaluations track live telemetry including user feedback thumbs-up/down, completion acceptance rate, and downstream user retention.

Furthermore, AI PMs must navigate deterministic vs probabilistic product trade-offs. Implementing safety guardrails (such as input sanitization classifiers, toxicity filters, and schema-constrained decoding) introduces latency overhead. When P95 latency exceeds 2.5 seconds, user engagement drops precipitously. The AI PM must establish tiered model routing: dispatching simple classification queries to smaller fine-tuned SLMs (Small Language Models) while reserving frontier models for complex multi-step reasoning tasks.`
  },
  {
    id: 'rice-prioritization',
    title: 'RICE Scoring & Quantitative Prioritization under Runway Constraints',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `The RICE prioritization framework enables product managers to quantify competing roadmap opportunities using four dimensions: Reach, Impact, Confidence, and Effort. The composite score is calculated as: (Reach × Impact × Confidence) / Effort.

Reach is measured in users or customer accounts over a defined time window (e.g., customers per quarter) to ensure uniform units.
Impact estimates quantitative lift on the core North Star metric using a standard scale (3 for massive impact, 2 for high, 1 for medium, 0.5 for low, 0.25 for minimal).
Confidence acts as a Bayesian discount factor for estimation bias (100% for high confidence backed by quantitative user research, 80% for medium backed by survey telemetry, 50% for low speculative bets).
Effort is estimated in person-months of cross-functional engineering, design, and product time.

A critical vulnerability in RICE execution is unit mismatch and denominator manipulation. Teams often artificially deflate effort estimates or inflate confidence percentages to bias pet projects. Senior PMs must pressure-test confidence scores against empirical user research and establish hard cutoffs when operating under strict runway constraints.`
  },
  {
    id: 'low-confidence-sample',
    title: 'Ambiguous Informal Notes (Low Confidence Test)',
    sourceType: 'paste_text' as StudyMaterialSourceType,
    text: `Hey team, quick notes from our sync. We discussed making the onboarding flow faster. Sarah said the churn looks high. Bob mentioned we should maybe add some AI features soon. Let's touch base again next Tuesday to see what we want to build. Thanks!`
  }
];
