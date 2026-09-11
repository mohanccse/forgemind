'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  FileCode,
  UploadCloud,
  Youtube,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  Layers,
  Lock,
  Clock,
  ChevronRight,
  RefreshCw,
  Upload
} from 'lucide-react';
import {
  ViewTab,
  Concept,
  StudyMaterialSourceType,
  ContentProcessingStatus,
  NormalizedStudyContent,
  ExtractedConceptCandidate
} from '../types';
import { AI_EVALS_MASTERCLASS_TEST_FIXTURE } from '../lib/test_fixtures';
import {
  createNormalizedContent,
  extractConceptFromStudyMaterial,
  parsePdfFile,
  parseDocxFile,
  parseYoutubeUrl,
  SAMPLE_STUDY_MATERIALS
} from '../services/normalizedContentService';
import { saveConfirmedUserConcept } from '../services/userConceptService';
import { INITIAL_CONCEPTS } from '../data/concepts';
import {
  STUDY_MATERIAL_LIMITS,
  validateStudyMaterialFile,
  sanitizeText,
  stripHtml
} from '../utils/sanitizer';

/**
 * Formats raw filenames or concept identifiers into clean, capitalized titles
 */
function formatConceptTitle(rawName: string): string {
  if (!rawName) return 'Custom Operational Concept';
  let cleaned = rawName
    .replace(/\.(docx|pdf|txt|mp3|wav|m4a)$/i, '')
    .replace(/_\d+mb$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Removes raw file extensions and sizes from text descriptions or skills
 */
function cleanTextString(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\.(docx|pdf|txt|mp3|wav|m4a)/gi, '')
    .replace(/_\d+mb/gi, '')
    .trim();
}

/**
 * Finds if a candidate concept name matches a pre-authored concept in the Content Library
 */
function findSimilarLibraryConcept(candidateName: string, candidateDomain?: string): Concept | undefined {
  if (!candidateName) return undefined;
  const normCandidate = candidateName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

  // Exclude product strategy/playbook (not in pre-authored library)
  if (normCandidate.includes('strategy') || normCandidate.includes('playbook')) {
    return undefined;
  }

  return INITIAL_CONCEPTS.find((lib) => {
    const normLib = lib.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (normCandidate === normLib) return true;

    // Key technical term matching
    const keyTerms = ['window function', 'rice', 'rag', 'embedding', 'prompt engineering', 'classification', 'join', 'group by', 'cte', 'jtbd', 'mvp', 'a/b testing', 'ab testing'];
    const matchedTerm = keyTerms.find((term) => normCandidate.includes(term) && normLib.includes(term));
    if (matchedTerm) return true;

    return false;
  });
}

interface StudyMaterialPageProps {
  onNavigate: (tab: ViewTab) => void;
  onConceptConfirmed: (concept: Concept) => void;
}

export const StudyMaterialPage: React.FC<StudyMaterialPageProps> = ({
  onNavigate,
  onConceptConfirmed
}) => {
  const [activeSourceType, setActiveSourceType] = useState<StudyMaterialSourceType>('paste_text');
  const [materialTitle, setMaterialTitle] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<ContentProcessingStatus>('READY');
  const [normalizedContent, setNormalizedContent] = useState<NormalizedStudyContent | null>(null);
  const [extractedCandidate, setExtractedCandidate] = useState<ExtractedConceptCandidate | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Step 10: PDF Ingestion State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);

  // Step 11: DOCX Ingestion State
  const docxFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocx, setSelectedDocx] = useState<File | null>(null);

  // Step 12: YouTube Ingestion State
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');

  // Step 12: Process YouTube URL
  const handleYoutubeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!youtubeUrlInput.trim()) return;

    setExtractionError(null);
    setExtractedCandidate(null);
    setProcessingStatus('PROCESSING');

    const parseRes = await parseYoutubeUrl(youtubeUrlInput);

    if (!parseRes.success || !parseRes.normalizedContent) {
      setProcessingStatus('FAILED');
      setExtractionError(parseRes.error || 'Failed to extract YouTube transcript.');
      return;
    }

    setNormalizedContent(parseRes.normalizedContent);

    try {
      const extractRes = await extractConceptFromStudyMaterial(parseRes.normalizedContent);

      if (!extractRes.success || !extractRes.candidate) {
        setProcessingStatus('FAILED');
        setExtractionError(extractRes.error || 'Unable to extract concept from YouTube transcript.');
        return;
      }

      setProcessingStatus('READY');
      setExtractedCandidate(extractRes.candidate);
    } catch (err: any) {
      setProcessingStatus('FAILED');
      setExtractionError(err.message || 'Processing pipeline error during YouTube concept extraction.');
    }
  };

  // Explicitly labeled test fixture handler when YouTube rate limits live requests
  const handleLoadTestFixture = async () => {
    setExtractionError(null);
    setExtractedCandidate(null);
    setProcessingStatus('PROCESSING');

    const fixture = AI_EVALS_MASTERCLASS_TEST_FIXTURE;
    const normalized = createNormalizedContent({
      source_type: 'youtube',
      source_name: fixture.sourceName,
      raw_text: fixture.text
    });
    setNormalizedContent(normalized);

    try {
      const extractRes = await extractConceptFromStudyMaterial(normalized);
      if (!extractRes.success || !extractRes.candidate) {
        setProcessingStatus('FAILED');
        setExtractionError(extractRes.error || 'Unable to extract concept from test fixture.');
        return;
      }
      setProcessingStatus('READY');
      setExtractedCandidate(extractRes.candidate);
    } catch (err: any) {
      setProcessingStatus('FAILED');
      setExtractionError(err.message || 'Error processing test fixture.');
    }
  };

  // Load pre-configured sample text
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_STUDY_MATERIALS.find((s) => s.id === sampleId);
    if (!sample) return;
    setActiveSourceType('paste_text');
    setMaterialTitle(sample.title);
    setPastedText(sample.text);
    setExtractedCandidate(null);
    setExtractionError(null);
    setProcessingStatus('READY');
  };

  // Step 10: Process uploaded PDF File
  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setExtractionError(null);
    setExtractedCandidate(null);
    setSelectedPdf(file);
    setProcessingStatus('PROCESSING');

    // Parse PDF
    const parseRes = await parsePdfFile(file);

    if (!parseRes.success || !parseRes.normalizedContent) {
      setProcessingStatus('FAILED');
      setExtractionError(parseRes.error || 'Failed to extract text from PDF document.');
      return;
    }

    setNormalizedContent(parseRes.normalizedContent);

    // Concept Extraction (Gemini)
    try {
      const extractRes = await extractConceptFromStudyMaterial(parseRes.normalizedContent);

      if (!extractRes.success || !extractRes.candidate) {
        setProcessingStatus('FAILED');
        setExtractionError(extractRes.error || 'Unable to extract concept from PDF.');
        return;
      }

      setProcessingStatus('READY');
      setExtractedCandidate(extractRes.candidate);
    } catch (err: any) {
      setProcessingStatus('FAILED');
      setExtractionError(err.message || 'Processing pipeline error during PDF concept extraction.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handlePdfUpload(files[0]);
    }
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        handlePdfUpload(file);
      } else {
        setExtractionError('Only .pdf files are accepted in PDF Upload mode.');
      }
    }
  };

  // Step 11: Process uploaded DOCX File
  const handleDocxUpload = async (file: File) => {
    if (!file) return;
    setExtractionError(null);
    setExtractedCandidate(null);
    setSelectedDocx(file);
    setProcessingStatus('PROCESSING');

    // Parse DOCX
    const parseRes = await parseDocxFile(file);

    if (!parseRes.success || !parseRes.normalizedContent) {
      setProcessingStatus('FAILED');
      setExtractionError(parseRes.error || 'Failed to extract text from DOCX document.');
      return;
    }

    setNormalizedContent(parseRes.normalizedContent);

    // Concept Extraction (Gemini)
    try {
      const extractRes = await extractConceptFromStudyMaterial(parseRes.normalizedContent);

      if (!extractRes.success || !extractRes.candidate) {
        setProcessingStatus('FAILED');
        setExtractionError(extractRes.error || 'Unable to extract concept from DOCX document.');
        return;
      }

      setProcessingStatus('READY');
      setExtractedCandidate(extractRes.candidate);
    } catch (err: any) {
      setProcessingStatus('FAILED');
      setExtractionError(err.message || 'Processing pipeline error during DOCX concept extraction.');
    }
  };

  const handleDocxFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleDocxUpload(files[0]);
    }
  };

  const handleDocxDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.docx')) {
        handleDocxUpload(file);
      } else {
        setExtractionError('Unsupported file format. Only Microsoft Word (.docx) files are supported in this tab.');
      }
    }
  };

  // Process text and extract concept
  const handleProcessAndExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pastedText.trim()) return;

    setExtractionError(null);
    setExtractedCandidate(null);
    setProcessingStatus('PROCESSING');

    // Step 7: Create common normalized-content object
    const normalized = createNormalizedContent({
      source_type: activeSourceType,
      source_name: materialTitle.trim() || 'Untitled Study Material',
      raw_text: pastedText,
      language: 'en',
      status: 'PROCESSING'
    });

    setNormalizedContent(normalized);

    try {
      const result = await extractConceptFromStudyMaterial(normalized);

      if (!result.success || !result.candidate) {
        setProcessingStatus('FAILED');
        setExtractionError(result.error || 'Unable to extract concept from the provided material.');
        return;
      }

      setProcessingStatus('READY');
      setExtractedCandidate(result.candidate);
    } catch (err: any) {
      setProcessingStatus('FAILED');
      setExtractionError(err.message || 'Processing pipeline error.');
    }
  };

  // Step 7 User Confirmation
  const handleConfirmConcept = () => {
    if (!extractedCandidate || !normalizedContent) return;

    // Store the concept as user-owned with source_type = USER_GENERATED
    const savedConcept = saveConfirmedUserConcept(extractedCandidate, normalizedContent);

    // Route it directly into the existing Challenge Engine
    onConceptConfirmed(savedConcept);
  };

  // Reset to choose another
  const handleChooseAnother = () => {
    setExtractedCandidate(null);
    setExtractionError(null);
    setProcessingStatus('READY');
  };

  // Word count and char count for UI
  const charCount = pastedText.length;
  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;

  return (
    <div id="study-material-page" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 text-xs font-medium text-amber-300">
          <Layers className="h-3.5 w-3.5" />
          <span>Door 2: Bring My Own Study Material</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-normal text-zinc-100 sm:text-4xl">
          Bring what you studied
        </h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Feed notes, articles, or documentation you just studied. ForgeMind normalizes the content, extracts the latent capability model, and prepares an unreferenced novel challenge.
        </p>
        <p className="mt-2.5 text-xs text-zinc-500 flex items-center space-x-1.5 font-mono">
          <Info className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span>By submitting material, you confirm you have rights to this content and consent to its storage during this prototype's testing phase.</span>
        </p>
      </div>

      {/* STATE 1: Extraction Candidate Returned */}
      {extractedCandidate ? (
        (() => {
          const matchedLibraryConcept = findSimilarLibraryConcept(
            extractedCandidate.concept_name,
            extractedCandidate.domain
          );

          return (
            <div className="mt-8 space-y-6">
              {extractedCandidate.is_confident ? (
                /* High Confidence: Concept Confirmation Card */
                <div
                  id="concept-confirmation-card"
                  className="rounded-xl border border-amber-500/30 bg-[#0f111a] p-6 shadow-xl space-y-6"
                >
                  {/* Optional Dual Choice Notice if a similar library concept exists */}
                  {matchedLibraryConcept && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-4 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-sky-400">
                        <Info className="h-4 w-4 shrink-0" />
                        <span className="font-semibold">Similar Topic Found in Pre-Authored Content Library</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        We detected a similar pre-authored concept (<strong className="text-sky-300">{matchedLibraryConcept.name}</strong>) in the Content Library. You can choose to proceed with our pre-authored topic or use your custom uploaded content:
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => onConceptConfirmed(matchedLibraryConcept)}
                          className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-sky-500/20 border border-sky-500/40 px-4 py-2.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/30 transition-colors"
                        >
                          <span>Use Pre-Authored Library Topic ('{matchedLibraryConcept.name}')</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmConcept}
                          className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors shadow"
                        >
                          <span>Use My Custom Content ('{extractedCandidate.concept_name}')</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-amber-400">
                      <Sparkles className="h-4 w-4" />
                      <span>{matchedLibraryConcept ? 'Extracted Custom Candidate' : 'We Extracted This Concept From Your Document'}</span>
                    </div>

                    {/* Stage 0 -> Stage 1 Length Guardrail Truncation Banner */}
                    {extractedCandidate.was_truncated && extractedCandidate.truncation_notice && (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start space-x-2.5">
                        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-mono font-semibold uppercase text-amber-300 block text-[11px]">
                            Source Length Guardrail (40,000 Chars Cap)
                          </span>
                          <p className="font-mono text-amber-200/90 leading-relaxed text-[11px]">
                            {extractedCandidate.truncation_notice}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Concept Name */}
                    <div className="mt-4">
                      <span className="text-xs font-mono uppercase text-zinc-500 block mb-1">
                        Extracted Concept:
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-normal text-zinc-100">
                        {formatConceptTitle(extractedCandidate.concept_name)}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono uppercase text-zinc-300">
                          {extractedCandidate.domain}
                        </span>
                        <span className="text-xs font-mono text-zinc-500">
                          Difficulty: {extractedCandidate.approximate_difficulty || 'Applied'}
                        </span>
                        <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5">
                          Source Document Extracted
                        </span>
                        {normalizedContent?.metadata?.method === 'gemini-transcribe-fallback' && (
                          <span className="rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono px-2 py-0.5 flex items-center space-x-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            <span>Transcribed via Gemini Audio Fallback</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                      {cleanTextString(extractedCandidate.description)}
                    </p>

                    {/* Underlying Skill */}
                    <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                      <span className="text-xs font-mono uppercase text-zinc-400 block mb-1 font-semibold">
                        Underlying skill:
                      </span>
                      <p className="text-sm font-medium text-amber-300">
                        {cleanTextString(extractedCandidate.underlying_skill)}
                      </p>
                    </div>

                    {/* Capabilities */}
                    <div className="mt-6">
                      <span className="text-xs font-mono uppercase text-zinc-400 block mb-2 font-semibold">
                        Capabilities Extracted From Document:
                      </span>
                      <ul className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
                        {extractedCandidate.capabilities.map((cap, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-zinc-200">
                            <span className="text-emerald-400 font-bold select-none">✓</span>
                            <span>{cleanTextString(cap)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Extracted Raw Document Text Preview */}
                    {normalizedContent?.normalized_text && (
                      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono uppercase text-zinc-300 font-semibold flex items-center space-x-1.5">
                            <FileText className="h-3.5 w-3.5 text-amber-400" />
                            <span>Extracted Text Content ({normalizedContent.source_name}):</span>
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {normalizedContent.normalized_text.length.toLocaleString()} chars • {normalizedContent.normalized_text.trim().split(/\s+/).length.toLocaleString()} words
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto rounded bg-zinc-900/60 p-3 text-xs font-mono text-zinc-300 leading-relaxed border border-zinc-800/60 whitespace-pre-wrap select-text">
                          {normalizedContent.normalized_text}
                        </div>
                      </div>
                    )}

                    {/* Actions: [Proceed with Uploaded Content] [Choose Another] */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 pt-6">
                      <div className="text-xs text-zinc-400 font-mono">
                        Confirm to route your extracted concept into the live Challenge Engine.
                      </div>

                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <button
                          id="choose-another-concept-btn"
                          type="button"
                          onClick={handleChooseAnother}
                          className="flex-1 sm:flex-initial rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                          Choose Another File
                        </button>

                        <button
                          id="confirm-use-concept-btn"
                          type="button"
                          onClick={handleConfirmConcept}
                          className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-amber-300 shadow-md"
                        >
                          <span>Proceed with Uploaded Content</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
            /* LOW CONFIDENCE: Extraction Insufficient */
            <div
              id="low-confidence-notice"
              className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-6 sm:p-8"
            >
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h2 className="font-serif text-xl font-normal text-rose-200">
                  We're not confident enough to identify the concept.
                </h2>
              </div>

              <div className="mt-4 rounded-lg bg-zinc-950/80 border border-zinc-800 p-4 text-xs font-mono text-zinc-300 space-y-2">
                <div>
                  <span className="text-zinc-500 uppercase text-[10px] block">Extractor Evaluation:</span>
                  <p className="mt-0.5 text-zinc-300">
                    {extractedCandidate.insufficient_reason ||
                      extractedCandidate.confidence_reasoning ||
                      "The provided material lacks structured operational principles, defined algorithms, or concrete trade-offs."}
                  </p>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Confidence score: {Math.round((extractedCandidate.confidence_score || 0) * 100)}% (threshold required: 65%)
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-zinc-900/40 p-4 text-xs text-zinc-400 space-y-2 border border-zinc-800/60">
                <div className="font-semibold text-zinc-300 font-mono text-[11px] uppercase">
                  How to get high confidence:
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Include specific definitions, formulas, or operational mechanisms.</li>
                  <li>Describe the underlying technical constraints, parameters, or trade-offs.</li>
                  <li>Avoid informal chat logs, fragmented bullet points, or meeting greetings.</li>
                </ul>
              </div>

              {/* Low confidence: Do not generate a challenge */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80">
                <span className="text-xs text-rose-400/90 font-mono">
                  Challenge generation blocked due to low confidence.
                </span>
                <button
                  id="refine-material-btn"
                  onClick={handleChooseAnother}
                  className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Refine Study Material
                </button>
              </div>
            </div>
          )}
        </div>
      );
    })()
  ) : (
        /* STATE 2: Input Selection & Processing Interface */
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Format Selectors */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Supported Input Formats
            </div>

            {/* 1. Paste Text (Active) */}
            <button
              id="tab-mode-paste"
              type="button"
              onClick={() => setActiveSourceType('paste_text')}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                activeSourceType === 'paste_text'
                  ? 'border-amber-500/40 bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className={`h-4 w-4 ${activeSourceType === 'paste_text' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Paste Text</div>
                  <div className="text-[10px] text-zinc-500">Raw notes, guides, articles</div>
                </div>
              </div>
              <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-1.5 py-0.5">
                Active
              </span>
            </button>

            {/* 2. Upload PDF */}
            <button
              id="tab-mode-pdf"
              type="button"
              onClick={() => setActiveSourceType('pdf')}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                activeSourceType === 'pdf'
                  ? 'border-amber-500/40 bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <UploadCloud className={`h-4 w-4 ${activeSourceType === 'pdf' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Upload PDF</div>
                  <div className="text-[10px] text-zinc-500">Whitepapers, strategy decks</div>
                </div>
              </div>
              <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-1.5 py-0.5">
                Active
              </span>
            </button>

            {/* 3. Upload DOCX */}
            <button
              id="tab-mode-docx"
              type="button"
              onClick={() => setActiveSourceType('docx')}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                activeSourceType === 'docx'
                  ? 'border-amber-500/40 bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileCode className={`h-4 w-4 ${activeSourceType === 'docx' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Upload DOCX</div>
                  <div className="text-[10px] text-zinc-500">PRDs, spec docs, strategy memos</div>
                </div>
              </div>
              <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-1.5 py-0.5">
                Active
              </span>
            </button>



            {/* 6. YouTube URL */}
            <button
              id="tab-mode-youtube"
              type="button"
              onClick={() => setActiveSourceType('youtube')}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                activeSourceType === 'youtube'
                  ? 'border-amber-500/40 bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Youtube className={`h-4 w-4 ${activeSourceType === 'youtube' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="font-medium text-xs sm:text-sm">YouTube URL</div>
                  <div className="text-[10px] text-zinc-500">In development • Coming soon</div>
                </div>
              </div>
              <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-1.5 py-0.5">
                Coming Soon
              </span>
            </button>

            {/* Pre-fill quick samples */}
            <div className="pt-4 border-t border-zinc-800/80">
              <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-2">
                Quick Test Samples:
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadSample('ai-evals-guardrails')}
                  className="w-full text-left text-xs text-zinc-400 hover:text-amber-300 truncate font-mono block rounded p-1 hover:bg-zinc-800/50"
                >
                  • AI Model Evaluation & Guardrails
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('rice-prioritization')}
                  className="w-full text-left text-xs text-zinc-400 hover:text-amber-300 truncate font-mono block rounded p-1 hover:bg-zinc-800/50"
                >
                  • RICE Quantitative Prioritization
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('low-confidence-sample')}
                  className="w-full text-left text-xs text-rose-400/80 hover:text-rose-300 truncate font-mono block rounded p-1 hover:bg-zinc-800/50"
                >
                  • Low-Confidence Notes Test
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Active Input Viewport */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 lg:col-span-2">
            {activeSourceType === 'paste_text' ? (
              /* Active: Paste Text Form */
              <form onSubmit={handleProcessAndExtract} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Topic or Material Title
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">Optional</span>
                </div>

                <input
                  id="material-title-input"
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="e.g. AI Model Evaluation & Guardrails, RICE Prioritization under Constraints..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />

                <div className="flex items-center justify-between pt-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Study Content / Notes
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {wordCount} words • {charCount} chars
                  </span>
                </div>

                <textarea
                  id="material-paste-textarea"
                  rows={10}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the product notes, strategy memos, PRD excerpts, case studies, or AI framework articles you just studied. ForgeMind will extract the latent capability model..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 text-xs font-mono leading-relaxed text-zinc-200 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />

                {extractionError && (
                  <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{extractionError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-500">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Reference material is stripped during challenge generation.</span>
                  </div>

                  <button
                    id="submit-material-paste-btn"
                    type="submit"
                    disabled={!pastedText.trim() || processingStatus === 'PROCESSING'}
                    className="flex w-full sm:w-auto items-center justify-center space-x-2 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-amber-300 disabled:opacity-40 disabled:pointer-events-none shadow"
                  >
                    {processingStatus === 'PROCESSING' ? (
                      <span className="flex items-center space-x-2">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                        <span>Extracting Capability Model...</span>
                      </span>
                    ) : (
                      <>
                        <span>Extract Concept & Capability Model</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : activeSourceType === 'pdf' ? (
              /* Step 10 Active: PDF File Ingestion Interface */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Upload PDF Study Material
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Text-based PDFs up to 15MB
                  </span>
                </div>

                {/* File Dropzone */}
                <div
                  id="pdf-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handlePdfDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/80 p-8 text-center transition-all hover:border-amber-500/50 hover:bg-zinc-900/50 cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    id="pdf-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-6 w-6" />
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {selectedPdf ? selectedPdf.name : 'Click to upload or drag & drop a PDF'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {selectedPdf
                        ? `${(selectedPdf.size / (1024 * 1024)).toFixed(2)} MB • Ready to extract`
                        : 'PDF documents, research papers, course notes (text-based)'}
                    </p>
                  </div>

                  <div className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 group-hover:bg-zinc-700 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    <span>Select PDF File</span>
                  </div>
                </div>

                {/* Error Banner */}
                {extractionError && (
                  <div id="pdf-extraction-error-banner" className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-4 text-xs text-rose-300 space-y-2">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <div className="space-y-1">
                        <span className="font-semibold text-rose-200 block">PDF Extraction Failure</span>
                        <p className="text-rose-300/90 leading-relaxed font-mono">{extractionError}</p>
                      </div>
                    </div>
                    {extractionError.includes('extractable text') && (
                      <div className="rounded bg-rose-950/60 p-2.5 text-[11px] text-zinc-400 border border-rose-900/40">
                        <strong className="text-zinc-300 font-mono">Note for Scanned Documents:</strong> This PDF appears to contain scanned images without an underlying text layer. Per Step 10 specifications, OCR is disabled. Please paste text directly into the <strong>Paste Text</strong> tab or use a text-searchable PDF.
                      </div>
                    )}
                  </div>
                )}

                {/* Processing Spinner */}
                {processingStatus === 'PROCESSING' && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs font-mono text-amber-300 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span>Parsing PDF text stream & extracting capability model...</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Step 10 Pipeline</span>
                  </div>
                )}
              </div>
            ) : activeSourceType === 'docx' ? (
              /* Step 11 Active: DOCX File Ingestion Interface */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Upload Word (.DOCX) Study Material
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Microsoft Word documents up to 15MB
                  </span>
                </div>

                {/* File Dropzone */}
                <div
                  id="docx-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDocxDrop}
                  onClick={() => docxFileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/80 p-8 text-center transition-all hover:border-amber-500/50 hover:bg-zinc-900/50 cursor-pointer"
                >
                  <input
                    ref={docxFileInputRef}
                    id="docx-file-input"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDocxFileInputChange}
                    className="hidden"
                  />

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                    <FileCode className="h-6 w-6" />
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {selectedDocx ? selectedDocx.name : 'Click to upload or drag & drop a DOCX file'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {selectedDocx
                        ? `${(selectedDocx.size / (1024 * 1024)).toFixed(2)} MB • Ready to extract`
                        : 'Word documents, course notes, outlines (.docx)'}
                    </p>
                  </div>

                  <div className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 group-hover:bg-zinc-700 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    <span>Select DOCX File</span>
                  </div>
                </div>

                {/* Error Banner */}
                {extractionError && (
                  <div id="docx-extraction-error-banner" className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-4 text-xs text-rose-300 space-y-2">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <div className="space-y-1">
                        <span className="font-semibold text-rose-200 block">DOCX Extraction Failure</span>
                        <p className="text-rose-300/90 leading-relaxed font-mono">{extractionError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Spinner */}
                {processingStatus === 'PROCESSING' && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs font-mono text-amber-300 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span>Extracting text from DOCX & building capability model...</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Step 11 Pipeline</span>
                  </div>
                )}
              </div>
            ) : activeSourceType === 'youtube' ? (
              /* YouTube Ingestion: In Development / Coming Soon */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    YouTube Video Ingestion
                  </label>
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5">
                    In Progress • Coming Soon
                  </span>
                </div>

                {/* Prominent Status Notice */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Youtube className="h-6 w-6" />
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="font-serif text-lg text-zinc-100 font-normal">
                      Video Transcript Extraction In Progress
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Automated YouTube transcript fetching is currently undergoing upgrades due to upstream caption rate-limits. This automated capability will be available in an upcoming release.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSourceType('paste_text')}
                      className="inline-flex items-center space-x-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors shadow"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Paste Video Transcript as Text Instead</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadTestFixture}
                      className="inline-flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <span>Load Sample Video Fixture [AI Evals Masterclass]</span>
                    </button>
                  </div>
                </div>

                {/* Experimental Sandbox for Manual URL Testing */}
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-zinc-500">
                      Experimental Sandbox:
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      May encounter YouTube rate-limiting
                    </span>
                  </div>

                  <form onSubmit={handleYoutubeSubmit} className="space-y-3">
                    <input
                      id="youtube-url-input"
                      type="url"
                      value={youtubeUrlInput}
                      onChange={(e) => {
                        setYoutubeUrlInput(e.target.value);
                        setExtractionError(null);
                        setExtractedCandidate(null);
                        setProcessingStatus('READY');
                      }}
                      placeholder="https://www.youtube.com/watch?v=... (Optional experimental test)"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none font-mono"
                    />

                    <div className="flex justify-end">
                      <button
                        id="extract-youtube-btn"
                        type="submit"
                        disabled={!youtubeUrlInput.trim() || processingStatus === 'PROCESSING'}
                        className="rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Try Experimental Fetch
                      </button>
                    </div>
                  </form>

                  {/* Error Banner */}
                  {extractionError && (
                    <div id="youtube-extraction-error-banner" className="rounded border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <div className="space-y-1">
                        <span className="font-semibold text-rose-200 block text-[11px]">YouTube Subtitle Fetch Rate-Limited</span>
                        <p className="font-mono text-[10px] text-rose-300/90 leading-relaxed">{extractionError}</p>
                      </div>
                    </div>
                  )}

                  {/* Processing Spinner */}
                  {processingStatus === 'PROCESSING' && (
                    <div className="text-xs font-mono text-amber-300 flex items-center space-x-2 pt-1">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span>Attempting YouTube transcript fetch...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-zinc-400">
                Please select a study material input format from the options on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Door 2 Pipeline Flow Architecture Indicator */}
      <div className="mt-14 border-t border-zinc-800/80 pt-6">
        <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-3">
          Door 2 Execution Architecture
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300">Study Material</span>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300">Normalized Text</span>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300">Concept Extraction</span>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300">Capability Model</span>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-amber-300 font-semibold">Existing Challenge Engine</span>
        </div>
      </div>
    </div>
  );
};
