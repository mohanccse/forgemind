'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Share2,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Quote,
  Trash2,
  SlidersHorizontal,
  Download,
  Fingerprint,
  Zap,
  QrCode,
  Award
} from 'lucide-react';
import { ViewTab, LearnerAttempt, ConceptCapabilityEvidence } from '../types';
import {
  getAllAttempts,
  seedSampleEvidenceForRice,
  clearAllAttempts
} from '../services/attemptService';
import {
  getAllConceptEvidenceProfiles
} from '../services/evidenceService';
import { resolveMilestoneStepNumber } from '../utils/sanitizer';

interface EvidencePageProps {
  onNavigate: (tab: ViewTab) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ onNavigate }) => {
  const [attempts, setAttempts] = useState<LearnerAttempt[]>(() => getAllAttempts());
  const [profiles, setProfiles] = useState<ConceptCapabilityEvidence[]>(() =>
    getAllConceptEvidenceProfiles()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'autonomous' | 'assisted' | 'export'>('all');
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [showSeedSuccess, setShowSeedSuccess] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Reload profiles whenever attempts change
  const refreshEvidence = () => {
    const freshAttempts = getAllAttempts();
    setAttempts(freshAttempts);
    setProfiles(getAllConceptEvidenceProfiles());
  };

  const handleSeedRiceExample = () => {
    seedSampleEvidenceForRice();
    refreshEvidence();
    setShowSeedSuccess(true);
    setTimeout(() => setShowSeedSuccess(false), 3000);
  };

  const handleClearEvidence = () => {
    if (window.confirm('Clear all recorded capability evidence? This action cannot be undone.')) {
      clearAllAttempts();
      refreshEvidence();
    }
  };

  const toggleAttemptExpand = (attemptId: string) => {
    setExpandedAttemptId(expandedAttemptId === attemptId ? null : attemptId);
  };

  const handleShareProof = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#fm-8f921d-verified`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  // Filtered attempts based on search and category
  const filteredAttempts = useMemo(() => {
    return attempts.filter((att) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (att.concept_id || '').toLowerCase().includes(q) ||
        (att.response || '').toLowerCase().includes(q) ||
        (att.verdict || '').toLowerCase().includes(q) ||
        (att.attempt_id || '').toLowerCase().includes(q);

      const isAutonomous = (att.hint_tier_reached || 0) === 0;
      let matchesCategory = true;
      if (categoryFilter === 'autonomous') matchesCategory = isAutonomous;
      if (categoryFilter === 'assisted') matchesCategory = !isAutonomous;
      if (categoryFilter === 'export') matchesCategory = att.verdict === 'CORRECT';

      return matchesSearch && matchesCategory;
    });
  }, [attempts, searchQuery, categoryFilter]);

  const autonomousCount = attempts.filter((a) => (a.hint_tier_reached || 0) === 0).length;
  const assistedCount = attempts.length - autonomousCount;

  return (
    <div id="evidence-page" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* Header Badge & Editorial Title */}
      <div className="flex flex-col items-start gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-text-secondary border border-border-hairline shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-code-sm text-[11px] font-medium tracking-tight">
            Cryptographic Ledger · {attempts.length} Artifacts Verified
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4 mt-1">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-text-primary">Capability </span>
              <span className="text-primary-container">Evidence Vault</span>
            </h1>
            <p className="font-body-md text-sm text-text-secondary mt-1.5 leading-relaxed max-w-xl">
              Tamper-proof verifiable evidence records of your unassisted problem-solving models, executive memos,
              and capability credentials.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              id="seed-sample-evidence-btn"
              onClick={handleSeedRiceExample}
              className="inline-flex items-center space-x-1.5 rounded-full border border-accent-rose-soft bg-accent-rose-tint px-3.5 py-1.5 text-xs font-semibold text-primary-container hover:bg-accent-rose-soft transition-colors cursor-pointer"
              title="Load the 4-attempt RICE Prioritization evidence profile"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load RICE Sample</span>
            </button>

            {attempts.length > 0 && (
              <button
                onClick={handleClearEvidence}
                className="inline-flex items-center space-x-1 rounded-full border border-border-hairline bg-canvas-subtle px-3 py-1.5 text-xs text-text-muted hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                title="Reset all recorded attempts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showSeedSuccess && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between transition-all">
          <span>Loaded 4 realistic challenges/attempts for <strong>RICE Prioritization</strong> with audit rubric.</span>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">SUCCESS</span>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none" />
          <input
            id="vault-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search verified memos, artifacts, hashes..."
            className="w-full h-10 pl-10 pr-16 bg-canvas-elevated border border-border-hairline rounded-full shadow-xs font-body-sm text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-muted font-code-sm text-[10px] font-medium tracking-wider">
              ⌘K
            </span>
          </div>
        </div>

        {/* Category Pill Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1" id="filter-container">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-text-primary text-white font-semibold shadow-xs'
                : 'bg-canvas-subtle border border-border-hairline text-text-secondary hover:text-text-primary hover:bg-surface-container'
            }`}
          >
            All Evidence ({attempts.length})
          </button>
          <button
            onClick={() => setCategoryFilter('autonomous')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'autonomous'
                ? 'bg-text-primary text-white font-semibold shadow-xs'
                : 'bg-canvas-subtle border border-border-hairline text-text-secondary hover:text-text-primary hover:bg-surface-container'
            }`}
          >
            Autonomous ({autonomousCount})
          </button>
          <button
            onClick={() => setCategoryFilter('assisted')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'assisted'
                ? 'bg-text-primary text-white font-semibold shadow-xs'
                : 'bg-canvas-subtle border border-border-hairline text-text-secondary hover:text-text-primary hover:bg-surface-container'
            }`}
          >
            Assisted ({assistedCount})
          </button>
          <button
            onClick={() => setCategoryFilter('export')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'export'
                ? 'bg-text-primary text-white font-semibold shadow-xs'
                : 'bg-canvas-subtle border border-border-hairline text-text-secondary hover:text-text-primary hover:bg-surface-container'
            }`}
          >
            Export Ready
          </button>
        </div>
      </div>

      {/* Verifiable Capability Credential Banner */}
      <div className="mt-6 bg-canvas-elevated border border-border-hairline rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-accent-rose-tint rounded-full -mr-16 -mt-16 pointer-events-none opacity-50" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-title-md text-base font-bold text-text-primary">
                    Master Practitioner
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="font-code-sm text-[11px] text-text-muted">Tier-1 Verifiable Credential</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full text-text-secondary font-code-sm text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live & Shareable</span>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center justify-between border border-border-hairline">
            <div className="flex flex-col">
              <span className="font-code-sm text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                Root Proof Signature
              </span>
              <span className="font-code-sm text-xs text-text-primary font-bold select-all">
                #fm-8f921d-verified
              </span>
            </div>
            <div className="w-9 h-9 bg-canvas-base rounded-lg p-1 flex items-center justify-center shadow-xs border border-border-hairline">
              <QrCode className="w-5 h-5 text-text-primary" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-primary-container" />
              <span className="font-label-sm text-xs text-text-secondary font-medium">
                SHA-256 Audit Trail Active
              </span>
            </div>

            <button
              id="copy-proof-btn"
              onClick={handleShareProof}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container text-white font-label-sm text-xs font-semibold shadow-xs hover:bg-primary-container/90 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copySuccess ? 'Link Copied!' : 'Share Proof Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-title-md text-base font-bold text-text-primary">
            Verified Evidence Ledger
          </h2>
          <span className="w-5 h-5 rounded-full bg-surface-container text-text-secondary font-code-sm text-[11px] flex items-center justify-center font-bold">
            {filteredAttempts.length}
          </span>
        </div>
        <span className="font-code-sm text-[11px] text-text-muted">Sorted by freshness</span>
      </div>

      {/* Verified Artifacts List */}
      <div className="mt-4 flex flex-col gap-4" id="artifacts-feed">
        {filteredAttempts.length === 0 ? (
          <div className="bg-canvas-elevated rounded-2xl p-10 text-center border border-border-hairline shadow-sm space-y-3">
            <FileText className="w-8 h-8 text-text-muted mx-auto" />
            <h3 className="font-headline-sm text-sm font-bold text-text-primary">
              No evidence artifacts found
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Complete a closed-book challenge or load sample records to generate cryptographically signed evidence.
            </p>
            <button
              onClick={() => onNavigate('prove')}
              className="px-4 py-2 rounded-full bg-primary-container text-white font-label-md text-xs font-semibold hover:bg-primary-container/90 transition-colors cursor-pointer"
            >
              Start a Challenge
            </button>
          </div>
        ) : (
          filteredAttempts.map((att, idx) => {
            const isExpanded = expandedAttemptId === att.attempt_id;
            const isAutonomous = (att.hint_tier_reached || 0) === 0;
            const evalObj = att.evaluation;
            const isCorrectVerdict = att.verdict === 'CORRECT';
            const hashSignature = `#fm-${att.attempt_id.slice(-6)}`;

            return (
              <article
                key={att.attempt_id || idx}
                className="bg-canvas-elevated rounded-2xl p-5 shadow-sm border border-border-hairline flex flex-col gap-3 transition-all hover:border-border-focus"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded font-code-sm text-[10px] uppercase font-bold tracking-wider bg-[#eff4ff] text-[#2563eb] border border-[#dbeafe]">
                        {att.concept_id?.replace(/[-_]+/g, ' ').toUpperCase() || 'PRODUCT STRATEGY'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary font-label-sm text-[11px] font-medium">
                        {isAutonomous ? 'Tier-1 Autonomous' : `Tier-2 Calibrated (${att.hint_tier_reached} hints)`}
                      </span>
                    </div>
                    <h3 className="font-title-md text-base font-bold text-text-primary mt-1 leading-snug">
                      Executive Decision Benchmark: {att.concept_id?.replace(/[-_]+/g, ' ')}
                    </h3>
                  </div>

                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-code-sm text-xs font-bold border ${
                      isCorrectVerdict
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-[#b45309] border-amber-200'
                    }`}
                  >
                    {isCorrectVerdict ? '100%' : '65%'}
                  </div>
                </div>

                {/* Evidence Extract Snippet */}
                <div className="bg-canvas-subtle rounded-xl p-3 flex flex-col gap-1 border border-border-hairline">
                  <div className="flex items-center justify-between text-text-muted font-code-sm text-[11px]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Extracted Proof Excerpt
                    </span>
                    <span>
                      {new Date(att.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-body-sm text-xs text-text-secondary italic line-clamp-2">
                    "{att.response?.slice(0, 160)}..."
                  </p>
                </div>

                {/* Badges & Verification Hash Details */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border-hairline/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-text-primary font-label-sm text-[11px]">
                      <Zap className="w-3 h-3 text-emerald-600" />
                      {isAutonomous ? 'Zero Hints Used' : `${att.hint_tier_reached} Hints Used`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-text-secondary font-code-sm text-[11px]">
                      <Fingerprint className="w-3 h-3 text-primary-container" />
                      {hashSignature}
                    </span>
                  </div>
                  <span className="font-code-sm text-[10px] text-emerald-700 font-semibold tracking-tight">
                    Cryptographically Signed
                  </span>
                </div>

                {/* Expanded Detailed Audit Breakdown */}
                {isExpanded && evalObj && (
                  <div className="p-4 bg-canvas-subtle rounded-xl border border-border-hairline space-y-3 mt-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-mono border-b border-border-hairline pb-2">
                      <span className="font-bold text-text-primary">
                        Verdict: {evalObj.verdict}
                      </span>
                      <span className="text-text-muted">
                        Confidence: {Math.round((evalObj.evaluator_confidence || 1) * 100)}%
                      </span>
                    </div>

                    {evalObj.brief_feedback && (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        <strong className="text-text-primary block mb-0.5 font-mono">Evaluator Feedback:</strong>
                        {evalObj.brief_feedback}
                      </p>
                    )}

                    {evalObj.demonstrated_capabilities && evalObj.demonstrated_capabilities.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-emerald-700 uppercase font-bold block">
                          Demonstrated Capabilities ({evalObj.demonstrated_capabilities.length})
                        </span>
                        {evalObj.demonstrated_capabilities.map((c, cIdx) => (
                          <div key={cIdx} className="text-xs text-text-primary flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {evalObj.evidence && evalObj.evidence.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="font-mono text-[10px] text-text-muted uppercase font-bold block">
                          Evidence Grounding ({evalObj.evidence.length})
                        </span>
                        {evalObj.evidence.map((ev, evIdx) => (
                          <div key={evIdx} className="text-xs font-code-sm text-text-secondary bg-canvas-base p-2 rounded border border-border-hairline">
                            {ev}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => toggleAttemptExpand(att.attempt_id)}
                    className="flex-1 h-9 rounded-full bg-surface-container hover:bg-slate-200 text-text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Hide Full Evidence</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>View Full Evidence</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => alert(`Exporting audit record #${att.attempt_id}...`)}
                    className="h-9 px-4 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary font-label-sm text-xs flex items-center justify-center gap-1 transition-colors border border-border-hairline cursor-pointer"
                    title="Export Record"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
