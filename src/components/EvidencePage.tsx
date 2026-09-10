'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
  AlertTriangle,
  HelpCircle,
  Clock,
  Quote,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { ViewTab, LearnerAttempt, ConceptCapabilityEvidence } from '../types';
import {
  getAllAttempts,
  seedSampleEvidenceForRice,
  clearAllAttempts
} from '../services/attemptService';
import {
  getAllConceptEvidenceProfiles,
  getConceptEvidenceProfileById
} from '../services/evidenceService';
import { INITIAL_CONCEPTS } from '../data/concepts';
import { resolveMilestoneStepNumber } from '../utils/sanitizer';

interface EvidencePageProps {
  onNavigate: (tab: ViewTab) => void;
}

export const EvidencePage: React.FC<EvidencePageProps> = ({ onNavigate }) => {
  const [attempts, setAttempts] = useState<LearnerAttempt[]>(() => getAllAttempts());
  const [profiles, setProfiles] = useState<ConceptCapabilityEvidence[]>(() =>
    getAllConceptEvidenceProfiles()
  );
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>('ALL');
  const [expandedAuditConceptId, setExpandedAuditConceptId] = useState<string | null>(null);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [showSeedSuccess, setShowSeedSuccess] = useState<boolean>(false);

  // Reload profiles whenever attempts change
  const refreshEvidence = () => {
    const freshAttempts = getAllAttempts();
    setAttempts(freshAttempts);
    setProfiles(getAllConceptEvidenceProfiles());
  };

  const handleSeedRiceExample = () => {
    seedSampleEvidenceForRice();
    refreshEvidence();
    setSelectedConceptFilter('ALL');
    setShowSeedSuccess(true);
    setTimeout(() => setShowSeedSuccess(false), 3000);
  };

  const handleClearEvidence = () => {
    if (window.confirm('Clear all recorded capability evidence? This action cannot be undone.')) {
      clearAllAttempts();
      refreshEvidence();
    }
  };

  const toggleAuditConcept = (conceptId: string) => {
    setExpandedAuditConceptId(expandedAuditConceptId === conceptId ? null : conceptId);
  };

  const toggleAttemptExpand = (attemptId: string) => {
    setExpandedAttemptId(expandedAttemptId === attemptId ? null : attemptId);
  };

  // Filter profiles
  const visibleProfiles =
    selectedConceptFilter === 'ALL'
      ? profiles
      : profiles.filter((p) => p.concept_id === selectedConceptFilter);

  return (
    <div id="evidence-page" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 text-xs font-medium text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Capability Evidence Ledger</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-normal text-zinc-100 sm:text-4xl">
            My Evidence
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
            ForgeMind does not reduce performance to a generic numerical score or arbitrary completion certificate.
            Every attempt becomes grounded evidence of what you can actually apply unassisted.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            id="seed-sample-evidence-btn"
            onClick={handleSeedRiceExample}
            className="flex items-center space-x-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
            title="Load the 4-attempt RICE Prioritization evidence profile"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Load RICE Sample (4 Attempts)</span>
          </button>

          {attempts.length > 0 && (
            <button
              onClick={handleClearEvidence}
              className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
              title="Reset all recorded attempts"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {showSeedSuccess && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center justify-between transition-all">
          <span>Loaded 4 realistic challenges/attempts for <strong>RICE Prioritization</strong> matching the Step 6 evidence rubric.</span>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">SUCCESS</span>
        </div>
      )}

      {/* Concept Filter (when multiple concepts have evidence) */}
      {profiles.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 uppercase flex items-center space-x-1 mr-2">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Concepts:</span>
          </span>
          <button
            onClick={() => setSelectedConceptFilter('ALL')}
            className={`rounded-lg px-3 py-1 text-xs font-mono transition-colors ${
              selectedConceptFilter === 'ALL'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Concepts ({profiles.length})
          </button>
          {profiles.map((p) => (
            <button
              key={p.concept_id}
              onClick={() => setSelectedConceptFilter(p.concept_id)}
              className={`rounded-lg px-3 py-1 text-xs font-mono transition-colors ${
                selectedConceptFilter === p.concept_id
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.concept_name} ({p.challenges_attempted})
            </button>
          ))}
        </div>
      )}

      {/* Main Evidence Content */}
      {visibleProfiles.length > 0 ? (
        <div className="mt-8 space-y-8">
          {visibleProfiles.map((profile) => (
            <div
              key={profile.concept_id}
              id={`concept-evidence-${profile.concept_id}`}
              className="rounded-xl border border-zinc-800 bg-[#0f1118] p-6 shadow-sm transition-all hover:border-zinc-700/80"
            >
              {/* Concept Title & Context Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono uppercase text-zinc-400">
                      {profile.domain}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      Concept ID: {profile.concept_id}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-serif text-2xl font-normal text-zinc-100">
                    {profile.concept_name}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <div className="font-mono text-sm font-semibold text-amber-300">
                    Challenges attempted: {profile.challenges_attempted}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">
                    {profile.autonomous_attempts} autonomous · {profile.total_attempts - profile.autonomous_attempts} guided
                  </div>
                </div>
              </div>

              {/* Underlying Skill Model */}
              <div className="mt-3.5 text-xs text-zinc-400">
                <span className="text-zinc-500 font-mono uppercase text-[10px] block mb-0.5">
                  Capability Model
                </span>
                <span className="italic text-zinc-300">{profile.underlying_skill}</span>
              </div>

              {/* Evidence Categories (Demonstrated vs Developing vs Insufficient Evidence) */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Demonstrated Section */}
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <h3 className="font-mono text-xs font-semibold tracking-wider text-emerald-300 uppercase">
                        Demonstrated
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {profile.demonstrated.length} capability milestone{profile.demonstrated.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {profile.demonstrated.length > 0 ? (
                    <ul className="space-y-3">
                      {profile.demonstrated.map((item, idx) => (
                        <li key={idx} className="space-y-1">
                          <div className="flex items-start space-x-2 text-sm text-zinc-200">
                            <span className="text-emerald-400 font-bold select-none">✓</span>
                            <span className="font-medium text-zinc-100">{item.capability}</span>
                          </div>
                          <div className="ml-5 text-[11px] text-zinc-400 font-mono flex items-center space-x-2">
                            <span>{item.notes}</span>
                          </div>
                          {item.evidenceQuotes.length > 0 && (
                            <div className="ml-5 mt-1 rounded bg-zinc-950/60 p-2 text-[11px] text-zinc-300 font-mono border border-zinc-800/60">
                              <span className="text-zinc-500 block text-[9px] uppercase mb-0.5">Grounded citation:</span>
                              &ldquo;{item.evidenceQuotes[0]}&rdquo;
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500 italic py-2">
                      No capabilities verified as demonstrated yet.
                    </p>
                  )}
                </div>

                {/* 2. Developing Section */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-400 font-bold">△</span>
                      <h3 className="font-mono text-xs font-semibold tracking-wider text-amber-300 uppercase">
                        Developing
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400">
                      {profile.developing.length} area{profile.developing.length !== 1 ? 's' : ''} for growth
                    </span>
                  </div>

                  {profile.developing.length > 0 ? (
                    <ul className="space-y-3">
                      {profile.developing.map((item, idx) => (
                        <li key={idx} className="space-y-1">
                          <div className="flex items-start space-x-2 text-sm text-zinc-200">
                            <span className="text-amber-400 font-bold select-none">△</span>
                            <span className="font-medium text-zinc-100">{item.capability}</span>
                          </div>
                          <div className="ml-5 text-[11px] text-amber-300/80 font-mono">
                            {item.notes}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500 italic py-2">
                      No active developing milestones flagged.
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Insufficient Evidence Section (if applicable) */}
              {profile.insufficient_evidence.length > 0 && (
                <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3.5">
                  <div className="flex items-center space-x-2 mb-2">
                    <HelpCircle className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                      Insufficient Evidence ({profile.insufficient_evidence.length})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">
                    These milestones require additional distinct challenges with specific boundary conditions to corroborate:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.insufficient_evidence.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 rounded bg-zinc-800/70 border border-zinc-700/60 px-2.5 py-1 text-xs text-zinc-300 font-mono"
                      >
                        <span className="text-zinc-500">○</span>
                        <span>{item.capability}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* "Also show" Metrics Matrix (Exact Match to Step 6 Specification) */}
              <div className="mt-6 border-t border-zinc-800/80 pt-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                  Observed Attempt Profile (Latest Challenge)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Confidence before challenge */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      Confidence before challenge
                    </span>
                    <div className="mt-1 font-mono text-xl font-bold text-amber-300">
                      {profile.confidence_before_challenge} / 5
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      Metacognitive calibration
                    </span>
                  </div>

                  {/* Observed outcome */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      Observed outcome
                    </span>
                    <div className="mt-1">
                      {profile.observed_outcome ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-bold uppercase ${
                            profile.observed_outcome === 'CORRECT'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : profile.observed_outcome === 'PARTIALLY_CORRECT'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                              : profile.observed_outcome === 'WRONG_APPROACH'
                              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                              : 'bg-violet-500/15 border border-violet-500/30 text-violet-400'
                          }`}
                        >
                          {profile.observed_outcome.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-zinc-500">None</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {profile.evaluator_confidence ? `${Math.round(profile.evaluator_confidence * 100)}% evaluator certainty` : 'Grounded evaluation'}
                    </span>
                  </div>

                  {/* Hints used */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      Hints used
                    </span>
                    <div className="mt-1 font-mono text-xl font-bold text-zinc-100">
                      {profile.hints_used}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {profile.hints_used === 0 ? 'Fully Autonomous' : `Tier ${profile.hints_used} reached`}
                    </span>
                  </div>

                  {/* Retries & Solution Reveal */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                      Solution revealed
                    </span>
                    <div className="mt-1 font-mono text-base font-semibold text-zinc-200">
                      {profile.solution_revealed ? (
                        <span className="text-amber-400">Yes (Scaffolded)</span>
                      ) : (
                        <span className="text-emerald-400">No (Protected)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {profile.retry_count} retries logged
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Ledger Expandable Button */}
              <div className="mt-6 border-t border-zinc-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={() => toggleAuditConcept(profile.concept_id)}
                  className="flex items-center space-x-2 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>
                    {expandedAuditConceptId === profile.concept_id
                      ? 'Hide Attempt Audit Trail'
                      : `Inspect Audit Trail (${profile.attempts.length} Recorded Attempt${profile.attempts.length !== 1 ? 's' : ''})`}
                  </span>
                  {expandedAuditConceptId === profile.concept_id ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="text-[11px] text-zinc-500 font-mono">
                  {profile.attempts.length > 1
                    ? 'Multiple attempts accumulated into profile'
                    : 'Provisional evidence — 1 attempt'}
                </div>
              </div>

              {/* Expanded Immutable Attempt Records */}
              {expandedAuditConceptId === profile.concept_id && (
                <div className="mt-4 space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-2 font-mono">
                    <span>IMMUTABLE EVIDENCE LEDGER</span>
                    <span>{profile.attempts.length} ENTRIES</span>
                  </div>

                  {profile.attempts.map((att) => {
                    const isAttExpanded = expandedAttemptId === att.attempt_id;
                    const dateStr = new Date(att.created_at).toLocaleString();
                    const verdictStr = att.verdict || att.evaluation?.verdict || 'PENDING';
                    const hintsVal = att.hint_tier_reached ?? att.hint_tier_used ?? 0;

                    return (
                      <div
                        key={att.attempt_id}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-zinc-200">
                                Attempt #{att.attempt_number}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold ${
                                  verdictStr === 'CORRECT'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : verdictStr === 'PARTIALLY_CORRECT'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : verdictStr === 'WRONG_APPROACH'
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                                }`}
                              >
                                {verdictStr.replace('_', ' ')}
                              </span>
                              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                                Pre-Confidence: {att.confidence_before_attempt} / 5
                              </span>
                              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                                {hintsVal === 0 ? '0 Hints' : `Tier ${hintsVal} Hint`}
                              </span>
                              {att.solution_revealed && (
                                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                                  Solution Revealed
                                </span>
                              )}
                              {att.evaluation_flag && (
                                <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                                  Flagged Review
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              ID: {att.attempt_id} • Date: {dateStr} • Retries: {att.retry_count}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleAttemptExpand(att.attempt_id)}
                            className="self-end sm:self-auto rounded p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          >
                            {isAttExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {isAttExpanded && (
                          <div className="mt-3 border-t border-zinc-800/80 pt-3 space-y-3">
                            {/* Demonstrations in this attempt */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                <span className="text-[10px] font-mono text-emerald-400 block uppercase mb-1 font-semibold">
                                  Demonstrated Capabilities
                                </span>
                                {(att.demonstrated_capabilities || att.evaluation?.demonstrated_capabilities || []).length > 0 ? (
                                  <ul className="space-y-1">
                                    {(att.demonstrated_capabilities || att.evaluation?.demonstrated_capabilities || []).map((c, i) => {
                                      const conceptMilestones = att.micro_responses?.map(m => m.milestone) ||
                                        INITIAL_CONCEPTS.find(con => con.id === profile.concept_id)?.reasoningMilestones ||
                                        profile.demonstrated.map(d => d.capability);
                                      const stepNum = resolveMilestoneStepNumber(c, conceptMilestones);
                                      return (
                                        <li key={i} className="flex items-start space-x-1.5 text-zinc-300">
                                          {stepNum ? (
                                            <span className="inline-flex items-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 border border-emerald-500/30 shrink-0">
                                              Step {stepNum}
                                            </span>
                                          ) : (
                                            <span className="text-emerald-400">✓</span>
                                          )}
                                          <span>{c}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <span className="text-zinc-500 italic text-[11px]">None verified.</span>
                                )}
                              </div>

                              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2.5">
                                <span className="text-[10px] font-mono text-amber-400 block uppercase mb-1 font-semibold">
                                  Missing Capabilities
                                </span>
                                {(att.missing_capabilities || att.evaluation?.missing_capabilities || []).length > 0 ? (
                                  <ul className="space-y-1">
                                    {(att.missing_capabilities || att.evaluation?.missing_capabilities || []).map((c, i) => {
                                      const conceptMilestones = att.micro_responses?.map(m => m.milestone) ||
                                        INITIAL_CONCEPTS.find(con => con.id === profile.concept_id)?.reasoningMilestones ||
                                        profile.demonstrated.map(d => d.capability);
                                      const stepNum = resolveMilestoneStepNumber(c, conceptMilestones);
                                      return (
                                        <li key={i} className="flex items-start space-x-1.5 text-zinc-400">
                                          {stepNum ? (
                                            <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-300 border border-amber-500/30 shrink-0">
                                              Step {stepNum}
                                            </span>
                                          ) : (
                                            <span className="text-amber-400">△</span>
                                          )}
                                          <span>{c}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <span className="text-zinc-500 italic text-[11px]">None flagged.</span>
                                )}
                              </div>
                            </div>

                            {/* Grounded Evidence Excerpts */}
                            {(att.evidence || att.evaluation?.evidence || []).length > 0 && (
                              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
                                <span className="text-[10px] font-mono text-amber-300 block uppercase mb-1 font-semibold">
                                  Grounded Citations
                                </span>
                                <div className="space-y-1">
                                  {(att.evidence || att.evaluation?.evidence || []).map((ev, i) => (
                                    <div key={i} className="text-xs font-mono text-zinc-300 bg-zinc-900/60 p-1.5 rounded">
                                      {ev}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Feedback */}
                            {att.evaluation?.brief_feedback && (
                              <div className="rounded border border-zinc-800/80 bg-zinc-900/30 p-2.5 text-xs text-zinc-300">
                                <span className="text-[10px] font-mono text-zinc-500 block uppercase mb-1">
                                  Evaluator Note
                                </span>
                                {att.evaluation.brief_feedback}
                              </div>
                            )}

                            {/* Unedited Response */}
                            <div>
                              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                                Learner Formulation
                              </span>
                              <pre className="rounded bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {att.response}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Empty State: Prompt to Prove or Load Sample */
        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-800/40 text-amber-400">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="mt-5 font-serif text-2xl font-normal text-zinc-100">
            No capability evidence recorded yet.
          </h2>

          <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
            ForgeMind does not issue arbitrary points or participation badges. Complete your first unreferenced challenge to record verifiable capability evidence.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="start-first-proof-btn"
              onClick={() => onNavigate('prove')}
              className="flex items-center space-x-2 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-amber-300 shadow-md"
            >
              <span>Start Your First Challenge</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleSeedRiceExample}
              className="flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Load RICE Sample Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Evidence Framework Principles (Clean, anti-gamified) */}
      <div className="mt-14 border-t border-zinc-800/80 pt-8">
        <div className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3">
          Capability Assessment Principles
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs leading-relaxed text-zinc-400">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
            <div className="font-mono font-semibold text-zinc-200 mb-1 flex items-center space-x-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Evidence Over Scores</span>
            </div>
            <p>
              We reject arbitrary 0–100 scores. Instead, we record specific demonstrated milestones vs developing areas observable in novel scenarios.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
            <div className="font-mono font-semibold text-zinc-200 mb-1 flex items-center space-x-1.5">
              <span className="text-amber-400">△</span>
              <span>Accumulation Over Single Attempts</span>
            </div>
            <p>
              Mastery cannot be claimed from one attempt. Multiple attempts for the same concept accumulate evidence across varied constraints and domain contexts.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
            <div className="font-mono font-semibold text-zinc-200 mb-1 flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-300" />
              <span>Concealed Reference Integrity</span>
            </div>
            <p>
              Hidden evaluation prompts and reference solutions remain strictly concealed to protect the integrity of future unreferenced tests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
