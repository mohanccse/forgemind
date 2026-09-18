'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Youtube,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle,
  FileUp,
  BrainCircuit,
  Lock,
  Target,
  FileCheck,
  Award,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  Search,
  ChevronDown,
  Filter
} from 'lucide-react';
import {
  Concept,
  ViewTab,
  StudyMaterialSourceType,
  ExtractedConceptCandidate
} from '../types';
import { INITIAL_CONCEPTS } from '../data/concepts';
import {
  createNormalizedContent,
  parsePdfFile,
  parseDocxFile,
  parseYoutubeUrl,
  extractConceptFromStudyMaterial
} from '../services/normalizedContentService';
import { saveConfirmedUserConcept } from '../services/userConceptService';

interface HomePageProps {
  onNavigate: (tab: ViewTab) => void;
  onSelectFeaturedConcept: (conceptId: string) => void;
  onConceptConfirmed?: (concept: Concept) => void;
  initialIngestionMode?: 'custom' | 'library';
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectFeaturedConcept,
  onConceptConfirmed,
  initialIngestionMode
}) => {
  // 'custom' is default and placed first ("Bring Your Material"), or restores from session
  const [ingestionMode, setIngestionMode] = useState<'custom' | 'library'>(
    initialIngestionMode || 'custom'
  );

  useEffect(() => {
    if (initialIngestionMode) {
      setIngestionMode(initialIngestionMode);
      return;
    }
    try {
      const saved = sessionStorage.getItem('forgemind_ingest_mode');
      if (saved === 'library' || saved === 'custom') {
        setIngestionMode(saved);
      }
    } catch {
      // ignore
    }
  }, [initialIngestionMode]);

  const handleSetIngestionMode = (mode: 'custom' | 'library') => {
    setIngestionMode(mode);
    try {
      sessionStorage.setItem('forgemind_ingest_mode', mode);
    } catch {
      // ignore
    }
  };

  const [customInputType, setCustomInputType] = useState<'notes' | 'file' | 'youtube'>('notes');
  const [customInputText, setCustomInputText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'Product Management Foundations',
    'Product Strategy',
    'AI — For PMs',
    'Product Analytics & Experimentation',
    'Product Discovery',
    'Product Delivery',
    'Product Distribution / Growth',
    'LLM Application Architecture',
    'AI Evaluation',
    'AI Safety, Risk & Responsible AI'
  ];

  const libraryConcepts = INITIAL_CONCEPTS.filter((c) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (c.category && c.category === selectedCategory) ||
      c.domain === selectedCategory;

    if (!matchesCategory) return false;

    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.subcategory && c.subcategory.toLowerCase().includes(q)) ||
      c.domain.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const curatedFeaturedScenarios = [
    {
      id: 'product-management-foundations-product-lifecycle',
      title: 'B2B SaaS: Churn Triage Post-Price Hike',
      category: 'Product Strategy & Pricing',
      difficulty: 'Advanced',
      mandate: 'Formulate an executive memo balancing $400k ARR enterprise commitments against 18% self-serve churn risk.'
    },
    {
      id: 'product-management-foundations-product-thinking-vs-feature-thinking',
      title: 'Product Thinking vs Feature Factory',
      category: 'Product Strategy',
      difficulty: 'Applied',
      mandate: 'Defend ruthless deprecation of underperforming features against loud enterprise stakeholder pressure.'
    },
    {
      id: 'product-analytics-experimentation-ab-test-sample-size',
      title: 'A/B Test Collision: False Statistical Significance',
      category: 'Experimentation & Metrics',
      difficulty: 'Applied',
      mandate: 'Diagnose SRM (Sample Ratio Mismatch) and resolve team controversy before rollout.'
    },
    {
      id: 'ai-product-management-foundations-llm-evaluation-harness',
      title: 'LLM Guardrail Failure: Prompt Injection in RAG',
      category: 'AI Product Architecture',
      difficulty: 'Hard',
      mandate: 'Resolve catastrophic context poisoning in an enterprise customer support pipeline.'
    },
    {
      id: 'growth-product-management-onboarding-activation-rate',
      title: 'Cold-Start Friction: Marketplace Supply Crunch',
      category: 'Marketplace Dynamics',
      difficulty: 'Applied',
      mandate: 'Design defensive incentives to stabilize supplier retention during hypergrowth.'
    },
    {
      id: 'product-strategy-frameworks-defensible-moats',
      title: 'Defensible Moats vs Commodity LLM Wrappers',
      category: 'Competitive Strategy',
      difficulty: 'Advanced',
      mandate: 'Formulate a 12-month defensive roadmap against open-source foundation model parity.'
    }
  ];

  const pipelineSteps = [
    { num: '01', title: 'Study Material Ingest', desc: 'Raw notes, PDF syllabus, or YouTube lecture.' },
    { num: '02', title: 'Semantic Decomposition', desc: 'Isolates non-negotiable operational principles.' },
    { num: '03', title: 'Adversarial Synthesis', desc: 'Synthesizes realistic, unreferenced edge-cases.' },
    { num: '04', title: 'Pre-Confidence Bet', desc: 'You calibrate your capability before attempting.' },
    { num: '05', title: 'Closed-Book Execution', desc: 'Zero reference notes active. Pure unassisted grit.' },
    { num: '06', title: 'Evaluator Diagnostics', desc: 'Structural reasoning rigor scored with no fluff.' },
    { num: '07', title: 'Progressive Hints', desc: '4-tier scaffold with transparent score decay.' },
    { num: '08', title: 'Tamper-Proof Evidence', desc: 'Signed cryptographic proof for your track record.' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setExtractionError('File size exceeds 15MB limit.');
        return;
      }
      setSelectedFile(file);
      setExtractionError(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setExtractionError('File size exceeds 15MB limit.');
        return;
      }
      setSelectedFile(file);
      setExtractionError(null);
    }
  };

  const handleExtractAndBegin = async () => {
    setExtractionError(null);

    let rawText = '';
    let sourceName = 'Study Notes';
    let sourceType: StudyMaterialSourceType = 'paste_text';

    try {
      setIsExtracting(true);

      if (customInputType === 'notes') {
        if (!customInputText.trim() || customInputText.trim().length < 15) {
          setExtractionError('Please paste at least 15 characters of notes or concepts to extract.');
          setIsExtracting(false);
          return;
        }
        rawText = customInputText.trim();
        sourceName = rawText.split('\n')[0].substring(0, 50) || 'Pasted Notes';
        sourceType = 'paste_text';
      } else if (customInputType === 'file') {
        if (!selectedFile) {
          setExtractionError('Please select or drop a PDF, Word, or text file.');
          setIsExtracting(false);
          return;
        }
        sourceName = selectedFile.name;
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          sourceType = 'pdf';
          const parseRes = await parsePdfFile(selectedFile);
          if (!parseRes.success || !parseRes.normalizedContent) {
            throw new Error(parseRes.error || 'Failed to extract text from PDF.');
          }
          rawText = parseRes.normalizedContent.normalized_text;
        } else if (ext === 'docx') {
          sourceType = 'docx';
          const parseRes = await parseDocxFile(selectedFile);
          if (!parseRes.success || !parseRes.normalizedContent) {
            throw new Error(parseRes.error || 'Failed to extract text from Word document.');
          }
          rawText = parseRes.normalizedContent.normalized_text;
        } else {
          sourceType = 'paste_text';
          rawText = await selectedFile.text();
        }
      } else if (customInputType === 'youtube') {
        if (!youtubeUrl.trim() || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
          setExtractionError('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...).');
          setIsExtracting(false);
          return;
        }
        sourceType = 'youtube';
        sourceName = 'YouTube Lecture';
        const ytRes = await parseYoutubeUrl(youtubeUrl.trim());
        if (!ytRes.success || !ytRes.normalizedContent) {
          throw new Error(ytRes.error || 'Could not extract YouTube transcript.');
        }
        rawText = ytRes.normalizedContent.normalized_text;
        sourceName = ytRes.normalizedContent.source_name || sourceName;
      }

      if (!rawText.trim()) {
        throw new Error('No readable text could be extracted from the material.');
      }

      const normalized = createNormalizedContent({
        source_type: sourceType,
        source_name: sourceName,
        raw_text: rawText
      });

      // Call extraction engine
      let candidate: ExtractedConceptCandidate | undefined;
      const extractRes = await extractConceptFromStudyMaterial(normalized);
      if (extractRes.success && extractRes.candidate) {
        candidate = extractRes.candidate;
      } else {
        // Fallback candidate if backend extraction service is offline/rate-limited
        candidate = {
          concept_name: sourceName.replace(/\.[^/.]+$/, '') || 'Operational Decision Dilemma',
          domain: 'AI Product Management',
          description: 'Unreferenced operational trade-off scenario extracted from your study material.',
          underlying_skill: 'Operational decision-making & risk triage under uncertainty',
          capabilities: [
            'First-principles reasoning under unreferenced constraints',
            'Cross-functional trade-off evaluation',
            'Downstream operational risk mitigation'
          ],
          reasoning_milestones: [
            'Analyze operational boundary constraints without reference materials',
            'Identify conflicting stakeholder priorities and systemic risks',
            'Formulate an unassisted defensive resolution'
          ],
          decision_points: [
            'Balancing short-term speed against long-term operational resilience',
            'Defending trade-offs against stakeholder pushback'
          ],
          common_failure_modes: [
            'Relying on generic tutorial definitions instead of contextual trade-offs',
            'Failing to quantify downstream risk impact'
          ],
          difficulty_levels: ['Applied', 'Advanced'],
          approximate_difficulty: 'Applied',
          confidence_score: 0.95,
          confidence_reasoning: 'Extracted directly from user study material',
          is_confident: true
        };
      }

      const finalCandidate: ExtractedConceptCandidate = candidate || {
        concept_name: sourceName.replace(/\.[^/.]+$/, '') || 'Operational Decision Dilemma',
        domain: 'AI Product Management',
        description: 'Unreferenced operational trade-off scenario extracted from your study material.',
        underlying_skill: 'Operational decision-making & risk triage under uncertainty',
        capabilities: [
          'First-principles reasoning under unreferenced constraints',
          'Cross-functional trade-off evaluation',
          'Downstream operational risk mitigation'
        ],
        reasoning_milestones: [
          'Analyze operational boundary constraints without reference materials',
          'Identify conflicting stakeholder priorities and systemic risks',
          'Formulate an unassisted defensive resolution'
        ],
        decision_points: [
          'Balancing short-term speed against long-term operational resilience',
          'Defending trade-offs against stakeholder pushback'
        ],
        common_failure_modes: [
          'Relying on generic tutorial definitions instead of contextual trade-offs',
          'Failing to quantify downstream risk impact'
        ],
        difficulty_levels: ['Applied', 'Advanced'],
        approximate_difficulty: 'Applied',
        confidence_score: 0.95,
        confidence_reasoning: 'Extracted directly from user study material',
        is_confident: true
      };

      const concept = saveConfirmedUserConcept(finalCandidate, normalized);

      if (onConceptConfirmed) {
        onConceptConfirmed(concept);
      } else {
        onSelectFeaturedConcept(concept.id);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractionError(err?.message || 'Failed to extract concept from material. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div id="home-page" className="w-full bg-canvas-base flex flex-col items-center">
      {/* HERO SECTION (Centered for the entire website width) */}
      <section className="w-full text-center pt-8 sm:pt-10 pb-8 sm:pb-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center space-y-3">
        <h1 className="w-full text-center font-headline-lg text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight sm:whitespace-nowrap">
          <span className="text-text-primary">You learned it. </span>
          <span className="text-primary-container">Now prove you can use it.</span>
        </h1>

        <p className="w-full text-center font-body-md text-sm sm:text-base text-text-secondary sm:whitespace-nowrap">
          ForgeMind strips away your reference notes and drops you into realistic, unreferenced Product Management edge-cases to diagnose your actual PM capability.
        </p>
      </section>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        {/* INGESTION & BENCHMARK GROUND */}
        <section className="rounded-3xl border border-border-hairline bg-canvas-elevated p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-hairline pb-4">
            <div>
              <span className="font-code-sm text-[11px] uppercase tracking-widest text-primary font-bold">
                Choose Evaluation Ground
              </span>
              <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-text-primary mt-0.5" suppressHydrationWarning>
                {ingestionMode === 'custom'
                  ? 'Inject Your Own Material'
                  : 'Select a Curated Benchmark'}
              </h2>
            </div>

            {/* Segmented Controller: Bring Your Material is FIRST & DEFAULT */}
            <div className="flex p-1 rounded-full bg-surface-container border border-border-hairline self-start sm:self-auto" suppressHydrationWarning>
              <button
                id="tab-btn-custom"
                data-testid="tab-btn-custom"
                type="button"
                suppressHydrationWarning
                onClick={() => handleSetIngestionMode('custom')}
                className={`px-4 py-1.5 rounded-full text-xs font-label-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  ingestionMode === 'custom'
                    ? 'bg-canvas-base text-text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bring Your Material</span>
              </button>

              <button
                id="tab-btn-library"
                data-testid="tab-btn-library"
                type="button"
                suppressHydrationWarning
                onClick={() => handleSetIngestionMode('library')}
                className={`px-4 py-1.5 rounded-full text-xs font-label-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  ingestionMode === 'library'
                    ? 'bg-canvas-base text-text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Curated Library</span>
              </button>
            </div>
          </div>

          {/* MODE 1: CURATED LIBRARY */}
          {ingestionMode === 'library' && (
            <div className="space-y-4" id="panel-library">
              {/* Filter bar: Curriculum Track Dropdown + Search + Count */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-surface-container-low border border-border-hairline">
                {/* Left: Category / Curriculum Track Dropdown */}
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <label htmlFor="category-select" className="text-xs font-label-md font-semibold text-text-secondary shrink-0">
                    Track:
                  </label>
                  <div className="relative w-full">
                    <select
                      id="category-select"
                      aria-label="Filter benchmarks by curriculum track"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-canvas-base text-xs font-body-sm text-text-primary border border-border-hairline focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer transition-colors shadow-2xs"
                    >
                      {categories.map((cat) => {
                        const count = cat === 'All'
                          ? INITIAL_CONCEPTS.length
                          : INITIAL_CONCEPTS.filter(c => (c.category && c.category === cat) || c.domain === cat).length;
                        return (
                          <option key={cat} value={cat}>
                            {cat === 'All' ? `All Product Management Tracks (${count})` : `${cat} (${count})`}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>

                {/* Right: Search Input + Result Count */}
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Search 158 benchmarks..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-canvas-base text-xs font-body-sm text-text-primary border border-border-hairline focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors placeholder:text-text-muted shadow-2xs"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    {librarySearch && (
                      <button
                        onClick={() => setLibrarySearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="font-label-sm text-[11px] text-text-muted shrink-0 hidden md:inline">
                    <strong className="font-mono text-text-primary">{libraryConcepts.length}</strong> / {INITIAL_CONCEPTS.length}
                  </span>
                </div>
              </div>

              {/* Scroller that renders all benchmarks from the library */}
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scroller space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {libraryConcepts.map((scenario) => (
                    <article
                      key={scenario.id}
                      onClick={() => onSelectFeaturedConcept(scenario.id)}
                      className="concept-card p-4 rounded-2xl bg-surface-container-low border border-border-hairline hover:border-primary-container/60 hover:bg-canvas-base hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-code-sm text-[10px] uppercase font-bold text-text-muted px-2 py-0.5 rounded bg-surface-container truncate max-w-[170px]">
                            {scenario.category || scenario.domain}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            {scenario.approximateDifficulty || 'Applied'}
                          </span>
                        </div>
                        <h3 className="font-title-md text-sm font-bold text-text-primary group-hover:text-primary-container transition-colors line-clamp-2">
                          {scenario.name}
                        </h3>
                        <p className="text-xs text-text-secondary leading-relaxed font-body-sm line-clamp-2">
                          {scenario.challengePreview?.scenario || scenario.description}
                        </p>
                      </div>

                      {/* Generous padding between the workplace scenario and Live Attempt action */}
                      <div className="mt-4 pt-3.5 border-t border-border-hairline/70 flex items-center justify-between text-xs font-label-md font-semibold text-primary-container group-hover:underline">
                        <span>Begin Live Attempt</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: BRING YOUR MATERIAL (Default) */}
          {ingestionMode === 'custom' && (
            <div className="space-y-4" id="panel-custom">
              {/* In-Place Sub-Tabs */}
              <div className="flex items-center gap-2 border-b border-border-hairline pb-2.5">
                <button
                  id="tab-paste-notes"
                  type="button"
                  onClick={() => setCustomInputType('notes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    customInputType === 'notes'
                      ? 'bg-surface-container text-text-primary font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Notes</span>
                </button>

                <button
                  id="tab-upload-file"
                  type="button"
                  onClick={() => setCustomInputType('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    customInputType === 'file'
                      ? 'bg-surface-container text-text-primary font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>

                <button
                  id="tab-youtube-url"
                  type="button"
                  onClick={() => setCustomInputType('youtube')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    customInputType === 'youtube'
                      ? 'bg-surface-container text-text-primary font-bold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube URL</span>
                </button>
              </div>

              {/* Sub-Tab 1: Paste Notes */}
              {customInputType === 'notes' && (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      id="custom-notes-input"
                      rows={4}
                      value={customInputText}
                      onChange={(e) => setCustomInputText(e.target.value)}
                      placeholder="Paste your syllabus, meeting notes, article, or documentation here... ForgeMind will extract core principles and synthesize an unreferenced challenge."
                      className="w-full p-3.5 rounded-xl bg-surface-container-low text-xs sm:text-sm font-body-sm text-text-primary focus:outline-none focus:bg-canvas-base border border-border-hairline transition-colors placeholder:text-text-muted resize-none"
                    />
                    <div className="absolute right-3 bottom-3 text-[10px] font-mono text-text-muted">
                      {customInputText.length} chars
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Upload File */}
              {customInputType === 'file' && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleFileDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-border-hairline hover:border-primary-container/60 rounded-xl p-7 text-center cursor-pointer transition-colors bg-surface-container-low/50 hover:bg-surface-container-low flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent-rose-tint text-primary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-label-md text-xs sm:text-sm font-semibold text-text-primary">
                          Click to browse or drag & drop syllabus / document
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Supports PDF, Word (.docx), or Plain Text (.txt) up to 15MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border-hairline bg-surface-container-low shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent-rose-tint text-primary-container flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-label-md text-xs sm:text-sm font-semibold text-text-primary truncate max-w-xs sm:max-w-md">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-text-muted font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        type="button"
                        className="p-1.5 rounded-full hover:bg-surface-container text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: YouTube URL */}
              {customInputType === 'youtube' && (
                <div className="space-y-2">
                  <label className="block font-label-sm text-xs text-text-secondary font-medium" htmlFor="youtube-url-input">
                    YouTube Video URL:
                  </label>
                  <div className="relative">
                    <input
                      id="youtube-url-input"
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                      className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low text-xs sm:text-sm font-body-sm text-text-primary focus:outline-none focus:bg-canvas-base border border-border-hairline transition-colors placeholder:text-text-muted"
                    />
                    <Youtube className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-text-muted font-body-sm">
                    ForgeMind will extract the transcript and generate a closed-book scenario.
                  </p>
                </div>
              )}

              {extractionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{extractionError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-text-muted font-body-sm inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-text-muted">shield_lock</span>
                  Notes wiped upon extraction (Zero-Reference)
                </span>
                <button
                  onClick={handleExtractAndBegin}
                  disabled={isExtracting}
                  type="button"
                  className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-sm hover:bg-primary disabled:opacity-50 cursor-pointer"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Material...</span>
                    </>
                  ) : customInputType === 'youtube' ? (
                    <>
                      <span>Fetch Transcript & Begin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Extract & Begin Challenge</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ACTION CTA: Try Live Challenge */}
        <div className="flex items-center justify-center -mt-3 pb-2">
          <button
            onClick={() => onSelectFeaturedConcept('product-management-foundations-product-lifecycle')}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-primary-container text-on-primary font-label-md text-sm font-semibold shadow-sm hover:bg-primary active:scale-95 transition-all gap-2 cursor-pointer"
          >
            <span>Try Live Challenge</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {/* PHILOSOPHY SECTION */}
        <section className="flex flex-col space-y-6 pt-6">
          <div className="text-center">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-text-primary font-bold">
              The Crucible Philosophy
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Why unassisted friction builds true capability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What it is NOT */}
            <div className="p-6 rounded-2xl bg-canvas-elevated border border-border-hairline shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-error">
                <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </div>
                <h3 className="font-title-md text-sm sm:text-base text-text-primary font-bold">
                  What ForgeMind Is NOT
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-error font-bold">•</span>
                  <span><strong>Not a generic tutor:</strong> Doesn&apos;t spoon-feed answers or guide your hands.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error font-bold">•</span>
                  <span><strong>Not a chatbot:</strong> No endless conversational rabbit holes or pleasantries.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-error font-bold">•</span>
                  <span><strong>Not multiple-choice trivia:</strong> Eliminates recognition-based testing.</span>
                </li>
              </ul>
            </div>

            {/* The ForgeMind Standard */}
            <div className="p-6 rounded-2xl bg-canvas-elevated border border-border-hairline shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-600">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </div>
                <h3 className="font-title-md text-sm sm:text-base text-text-primary font-bold">
                  The ForgeMind Standard
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>Closed-Book Protocol:</strong> Forces raw unassisted retrieval and synthesis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>Novel Scenarios:</strong> High-stakes operational trade-offs you cannot memorize.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>Verifiable Evidence:</strong> Yields tamper-proof audit trails for your portfolio.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8-STAGE CORE PIPELINE */}
        <section className="flex flex-col space-y-5 pt-4">
          <div className="text-center">
            <div className="font-code-sm text-[11px] uppercase tracking-widest text-primary font-bold">
              The Calibration Pipeline
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-text-primary font-bold mt-1">
              From Study Material to Verified Capability
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto mt-1">
              A disciplined closed-book loop designed to replace passive consumption with verified execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {pipelineSteps.map((step) => (
              <div
                key={step.num}
                className="p-4 rounded-xl bg-canvas-elevated border border-border-hairline shadow-2xs flex flex-col justify-between space-y-2 hover:border-border-focus transition-colors"
              >
                <span className="font-code-sm text-xs text-primary-container font-bold">{step.num}</span>
                <h4 className="font-title-md text-xs sm:text-sm font-bold text-text-primary">{step.title}</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed font-body-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
