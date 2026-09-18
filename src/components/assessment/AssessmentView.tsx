'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Send,
  ShieldCheck,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  Quote,
  Award,
  ArrowRight,
  Flag,
  Sparkles,
  FileText,
  Bookmark,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Concept, ViewTab, GeneratedChallenge } from '../../types';
import { HintLadderRail } from './HintLadderRail';
import { useAssessmentEngine } from '../../hooks/useAssessmentEngine';
import { resolveMilestoneStepNumber } from '../../utils/sanitizer';

interface AssessmentViewProps {
  concept: Concept;
  challenge: GeneratedChallenge;
  onBackToProve: () => void;
  onNavigate: (tab: ViewTab) => void;
  onRegenerateChallenge: () => void;
}

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  concept,
  challenge,
  onBackToProve,
  onNavigate,
  onRegenerateChallenge
}) => {
  const engine = useAssessmentEngine({
    concept,
    challenge,
    sourceType: challenge.sourceType || concept.sourceType || 'LIBRARY'
  });

  const memoTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showStepDetails, setShowStepDetails] = useState<boolean>(false);
  const [isScenarioExpanded, setIsScenarioExpanded] = useState<boolean>(false);
  const [isPreScenarioExpanded, setIsPreScenarioExpanded] = useState<boolean>(false);

  const confidenceOptions = [
    { value: 1, label: '1', desc: 'Little certainty on independent derivation' },
    { value: 2, label: '2', desc: 'Vague recall of general mechanics' },
    { value: 3, label: '3', desc: 'Moderate confidence; understand principles' },
    { value: 4, label: '4', desc: 'High confidence; can navigate constraints' },
    { value: 5, label: '5', desc: 'Mastery certainty; ready for edge cases' }
  ];

  const milestones = challenge.structuralMilestones || concept.reasoningMilestones || [];
  const questions = challenge.microQuestions || milestones.map((m) => `Target Step: ${m}`);
  const totalMilestones = milestones.length;

  const evalResult = engine.evaluationResult || engine.submittedAttempt?.evaluation;
  const isCorrect =
    evalResult?.verdict === 'CORRECT' ||
    engine.submittedAttempt?.verdict === 'CORRECT';

  const wordCount = (engine.response || '').trim()
    ? (engine.response || '').trim().split(/\s+/).length
    : 0;

  // Insert section anchor into single memo textarea
  const handleInsertSection = (sectionTitle: string) => {
    const textarea = memoTextareaRef.current;
    const current = engine.response || '';
    const sectionHeader = `\n\n### ${sectionTitle}\n`;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextVal = current.substring(0, start) + sectionHeader + current.substring(end);
      engine.handleMemoChange(nextVal);
      setTimeout(() => {
        textarea.focus();
        const nextPos = start + sectionHeader.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 20);
    } else {
      engine.handleMemoChange(current + sectionHeader);
    }
  };

  return (
    <div id="assessment-view" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* Top Navigation & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-hairline pb-4 mb-6">
        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            id="back-to-prove-btn"
            onClick={onBackToProve}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Diagnostic Studio</span>
          </button>
          <span className="text-border-focus hidden sm:inline">·</span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-accent-rose-tint border border-accent-rose-soft text-xs font-mono font-semibold text-primary-container">
            <span>Topic: {concept.name}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          <div className="flex items-center space-x-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-mono text-emerald-800 font-medium">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Zero-Reference Execution Active</span>
          </div>

          <span className="rounded border border-border-hairline bg-canvas-subtle px-2 py-0.5 text-[10px] font-mono text-text-secondary">
            Door:{' '}
            <strong className="text-text-primary font-semibold">
              {challenge.sourceType === 'USER_GENERATED' ||
              concept.sourceType === 'USER_GENERATED' ||
              concept.isUserOwned
                ? 'Door 2 (Custom Upload)'
                : 'Door 1 (Content Library)'}
            </strong>
          </span>

          <span className="text-xs text-text-muted hidden md:inline">
            Domain: <strong className="text-text-primary font-medium">{concept.domain || 'Product Strategy'}</strong>
          </span>
        </div>
      </div>

      {/* Main Challenge Content */}
      <div className="w-full">
        {/* STAGE 1: CONFIDENCE GATE */}
        {engine.stage === 'confidence' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="rounded-2xl border border-border-hairline bg-canvas-elevated p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-hairline pb-4">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-accent-rose-tint border border-accent-rose-soft px-2.5 py-0.5 text-xs font-mono font-bold text-primary-container uppercase">
                    TOPIC: {concept.name}
                  </span>
                  <span className="rounded bg-canvas-subtle border border-border-hairline px-2 py-0.5 text-[11px] font-mono text-text-secondary">
                    {challenge.difficulty}
                  </span>
                </div>

                <button
                  onClick={onRegenerateChallenge}
                  className="flex items-center space-x-1 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate Scenario</span>
                </button>
              </div>

              <h1 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                {challenge.title}
              </h1>

              <div className="mt-4 rounded-xl border border-border-hairline bg-canvas-subtle p-3.5 text-xs text-text-secondary">
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider block mb-1 font-semibold">
                  Target Capability Benchmark
                </span>
                <span className="text-text-primary font-medium">
                  {challenge.capabilityTested || concept.underlyingSkill}
                </span>
              </div>

              {(() => {
                const isPreLongScenario = (challenge.scenario?.length || 0) > 400 || !!challenge.contextData;
                return (
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold">
                        Scenario & Problem Context
                      </h3>
                      {isPreLongScenario && (
                        <button
                          type="button"
                          onClick={() => setIsPreScenarioExpanded(!isPreScenarioExpanded)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-primary-container font-semibold hover:underline cursor-pointer"
                        >
                          {isPreScenarioExpanded ? (
                            <>Collapse <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Show Full Context <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>
                    <div className={!isPreScenarioExpanded && isPreLongScenario ? "relative max-h-48 overflow-hidden mt-2" : "max-h-[500px] overflow-y-auto pr-1 mt-2"}>
                      <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                        {challenge.scenario}
                      </p>

                      {challenge.contextData && (
                        <div className="mt-4 rounded-xl border border-border-hairline bg-canvas-subtle p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-primary-container font-semibold">
                              Operational Telemetry & Parameters
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">Immutable Sandbox</span>
                          </div>
                          <pre className="overflow-x-auto text-xs font-code-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                            {challenge.contextData}
                          </pre>
                        </div>
                      )}

                      {!isPreScenarioExpanded && isPreLongScenario && (
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas-elevated to-transparent pointer-events-none" />
                      )}
                    </div>
                    {isPreLongScenario && (
                      <button
                        type="button"
                        onClick={() => setIsPreScenarioExpanded(!isPreScenarioExpanded)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-primary-container hover:underline mt-2 font-medium cursor-pointer"
                      >
                        {isPreScenarioExpanded ? (
                          <><span>Collapse Context</span><ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <><span>Show Full Scenario Context</span><ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Mandate Card */}
              <div className="mt-6 rounded-xl border border-accent-rose-soft bg-accent-rose-tint p-4">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-primary-container mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Executive Mandate</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed font-medium">
                  {challenge.mandate}
                </p>
              </div>
            </div>

            {/* CONFIDENCE CALIBRATION GATE CARD */}
            <div
              id="confidence-gate-card"
              className="rounded-2xl border border-border-hairline bg-canvas-elevated p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center space-x-2 text-primary-container text-xs font-mono uppercase tracking-wider font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Pre-Challenge Calibration</span>
              </div>

              <h2 className="mt-2 text-lg sm:text-xl font-display font-bold text-text-primary">
                How confident are you that you can solve this under zero-reference conditions?
              </h2>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {confidenceOptions.map((opt) => {
                  const isSelected = engine.confidenceBeforeAttempt === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => engine.setConfidenceBeforeAttempt(opt.value)}
                      className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary-container bg-accent-rose-tint shadow-xs text-text-primary ring-1 ring-primary-container'
                          : 'border-border-hairline bg-canvas-subtle hover:bg-canvas-base hover:border-border-focus text-text-secondary'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-sm font-bold text-text-primary">{opt.label}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isSelected ? 'bg-primary-container' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <span className="mt-2 text-[11px] leading-snug text-text-muted">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border-hairline pt-6">
                <div className="flex items-center space-x-2 text-xs text-text-muted">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Independent crucible attempt starts immediately. Hints start gated (0/5).</span>
                </div>

                <button
                  id="begin-attempt-btn"
                  onClick={engine.handleStartIndependentAttempt}
                  className="flex items-center justify-center space-x-2 rounded-full bg-primary-container px-6 py-2.5 text-xs font-semibold text-white hover:bg-primary-container/90 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <span>Begin Independent Attempt</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: INDEPENDENT WORKSPACE (03 - workspace) */}
        {engine.stage === 'attempt' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Primary Column (8 Cols) */}
              <div className="lg:col-span-8 space-y-5 self-start">
                {/* Benchmark Title & Pre-Assessment Header Card */}
                <div className="bg-canvas-elevated rounded-2xl p-5 shadow-sm border border-border-hairline flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-accent-rose-tint text-primary-container font-label-sm text-xs font-semibold">
                          {concept.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[11px] text-text-secondary">
                          {challenge.difficulty}
                        </span>
                      </div>
                      <h1 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight mt-1">
                        {challenge.title}
                      </h1>
                      <p className="font-body-sm text-xs text-text-secondary leading-relaxed">
                        {challenge.capabilityTested || concept.underlyingSkill}
                      </p>
                    </div>

                    {/* Pre-flight Confidence Pill Indicator */}
                    <div className="flex flex-col items-end gap-1.5 bg-canvas-subtle p-2.5 rounded-xl border border-border-hairline">
                      <span className="font-label-sm text-[11px] text-text-muted">Pre-flight Confidence</span>
                      <div className="flex items-center gap-1" id="confidence-pills">
                        {[1, 2, 3, 4, 5].map((val) => {
                          const isSelected = engine.confidenceBeforeAttempt === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => engine.setConfidenceBeforeAttempt(val)}
                              className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary-container text-white shadow-xs'
                                  : 'bg-surface-container text-text-secondary hover:bg-slate-200'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mandate Card */}
                <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm border border-border-hairline flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-container" />
                    <h2 className="font-title-md text-sm sm:text-base text-text-primary font-bold">
                      Executive Mandate
                    </h2>
                  </div>
                  <p className="font-body-md text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {challenge.mandate}
                  </p>
                  {milestones.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas-base border border-border-hairline shadow-xs"
                        >
                          <span className="font-code-sm text-primary-container font-bold text-xs mt-0.5">
                            0{idx + 1}
                          </span>
                          <span className="font-body-sm text-xs text-text-primary">
                            {m}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unfamiliar Scenario Context Box */}
                {(() => {
                  const isLongScenario = (challenge.scenario?.length || 0) > 350 || !!challenge.contextData;
                  return (
                    <div className="bg-canvas-elevated rounded-2xl p-5 shadow-sm border border-border-hairline flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-title-md text-sm font-bold text-text-primary">
                          Scenario Context
                        </span>
                        <div className="flex items-center gap-2">
                          {isLongScenario && (
                            <button
                              type="button"
                              onClick={() => setIsScenarioExpanded(!isScenarioExpanded)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-primary-container font-semibold hover:underline cursor-pointer"
                            >
                              {isScenarioExpanded ? (
                                <>Collapse <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Show Full Context <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-muted font-label-sm text-[10px] tracking-wider uppercase font-semibold">
                            Live Case
                          </span>
                        </div>
                      </div>

                      <div className={!isScenarioExpanded && isLongScenario ? "relative max-h-40 overflow-hidden" : "max-h-[500px] overflow-y-auto pr-1"}>
                        <p className="font-body-sm text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                          {challenge.scenario}
                        </p>

                        {challenge.contextData && (
                          <div className="p-3 rounded-xl bg-canvas-subtle border border-border-hairline text-xs font-code-sm text-text-primary whitespace-pre-wrap leading-relaxed mt-3">
                            {challenge.contextData}
                          </div>
                        )}

                        {!isScenarioExpanded && isLongScenario && (
                          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-canvas-elevated to-transparent pointer-events-none" />
                        )}
                      </div>

                      {isLongScenario && (
                        <button
                          type="button"
                          onClick={() => setIsScenarioExpanded(!isScenarioExpanded)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-primary-container hover:underline mt-1 font-medium cursor-pointer self-start"
                        >
                          {isScenarioExpanded ? (
                            <><span>Collapse Context</span><ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <><span>Show Full Scenario Context</span><ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* If previous attempt evaluated with gaps */}
                {engine.submittedAttempt && !isCorrect && (
                  <div className="bg-accent-rose-tint rounded-2xl p-5 shadow-sm border border-outline-variant flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/60">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-primary-container" />
                        <h3 className="font-title-md text-sm text-text-primary font-bold">
                          Attempt {engine.submittedAttempt.attempt_number} Evaluated
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary-container text-white font-label-sm text-[10px] uppercase font-bold tracking-wider">
                          Gaps Detected
                        </span>
                      </div>
                    </div>
                    {evalResult?.brief_feedback && (
                      <p className="font-body-sm text-xs text-text-secondary leading-relaxed bg-canvas-base p-3 rounded-xl border border-border-hairline">
                        {evalResult.brief_feedback}
                      </p>
                    )}
                  </div>
                )}

                {/* Crucible Memo Editor Canvas */}
                <div className="bg-canvas-elevated rounded-2xl shadow-sm border border-border-hairline p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-hairline">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-container" />
                      <h3 className="font-title-md text-sm font-bold text-text-primary">
                        Crucible Memo Canvas
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 font-label-sm text-[11px] text-text-muted">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span id="autosave-status">
                          {engine.draftSavedTimestamp ? `Autosaved at ${engine.draftSavedTimestamp}` : 'Autosaved'}
                        </span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-surface-container font-code-sm text-[11px] text-text-secondary">
                        <span id="word-count" className="font-semibold text-text-primary">
                          {wordCount}
                        </span>{' '}
                        words
                      </div>
                    </div>
                  </div>

                  {/* Section Guide Quick-Tags */}
                  <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap pb-1.5 no-scrollbar">
                    {milestones.length > 0 ? (
                      milestones.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertSection(`${idx + 1}. ${m.toUpperCase()}`)}
                          className="whitespace-nowrap px-3 py-1 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary text-[11px] font-medium transition-colors border border-border-hairline cursor-pointer"
                        >
                          + {idx + 1}. {m.slice(0, 26)}...
                        </button>
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleInsertSection('1. CORE BOUNDARY & CONFLICTING SIGNALS')}
                          className="whitespace-nowrap px-3 py-1 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary text-[11px] font-medium transition-colors border border-border-hairline cursor-pointer"
                        >
                          + 1. Boundary & Signals
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSection('2. PRINCIPLE / ANCHOR')}
                          className="whitespace-nowrap px-3 py-1 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary text-[11px] font-medium transition-colors border border-border-hairline cursor-pointer"
                        >
                          + 2. Anchor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSection('3. DEFENSIBLE SEQUENCING PLAN')}
                          className="whitespace-nowrap px-3 py-1 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary text-[11px] font-medium transition-colors border border-border-hairline cursor-pointer"
                        >
                          + 3. Sequencing
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSection('4. RISK MITIGATION & INCENTIVES')}
                          className="whitespace-nowrap px-3 py-1 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary text-[11px] font-medium transition-colors border border-border-hairline cursor-pointer"
                        >
                          + 4. Alignment
                        </button>
                      </>
                    )}
                  </div>

                  {/* Unified Structured Textarea */}
                  <div className="relative w-full">
                    <textarea
                      ref={memoTextareaRef}
                      id="crucible-memo-textarea"
                      rows={12}
                      value={engine.response || ''}
                      onChange={(e) => engine.handleMemoChange(e.target.value)}
                      placeholder="Draft your executive memo here. Use the section anchors above to structure your argument..."
                      className="w-full rounded-xl bg-canvas-subtle p-4 font-body-sm text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-canvas-base focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all resize-y leading-relaxed border border-border-hairline shadow-inner"
                    />
                    {/* Live Character Counter & Auto-Trim Safety Net */}
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <div className="text-[11px] font-mono flex items-center gap-2">
                        <span
                          className={
                            (engine.response || '').length > 10000
                              ? 'text-rose-600 font-bold'
                              : (engine.response || '').length > 8500
                              ? 'text-amber-600 font-semibold'
                              : 'text-text-muted'
                          }
                        >
                          {(engine.response || '').length.toLocaleString()} / 10,000 characters
                        </span>
                        {(engine.response || '').length > 8500 && (engine.response || '').length <= 10000 && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Approaching limit
                          </span>
                        )}
                        {(engine.response || '').length > 10000 && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-bold">
                            {((engine.response || '').length - 10000).toLocaleString()} chars over ceiling
                          </span>
                        )}
                      </div>

                      {(engine.response || '').length > 10000 && engine.handleTrimToLimit && (
                        <button
                          type="button"
                          onClick={engine.handleTrimToLimit}
                          className="text-[11px] font-mono text-primary-container hover:text-primary-container/80 underline font-semibold cursor-pointer"
                        >
                          Auto-Trim to 10k
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Validation or Evaluation Error Alert */}
                  {(engine.validationError || engine.evaluationError) && (
                    <div className="p-3 rounded-xl border border-primary-container/30 bg-accent-rose-tint text-primary-container text-xs font-mono flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-primary-container shrink-0" />
                      <span>{engine.validationError || engine.evaluationError}</span>
                    </div>
                  )}

                  {/* Action Sub-Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        id="save-draft-btn"
                        type="button"
                        onClick={() => {
                          engine.handleMemoChange(engine.response || '');
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-secondary font-label-md text-xs transition-colors inline-flex items-center gap-1.5 border border-border-hairline cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-text-muted" />
                        <span>Save Local Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStepDetails(!showStepDetails)}
                        className="text-[11px] font-mono text-text-muted hover:text-text-primary underline cursor-pointer"
                      >
                        {showStepDetails ? 'Hide Step Prompts' : 'View Step-by-Step Prompts'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="submit-attempt-btn"
                        type="button"
                        disabled={engine.isSubmitting || engine.isEvaluating}
                        onClick={engine.handleSubmitAttempt}
                        className="min-h-[40px] px-6 py-2 rounded-full bg-primary-container hover:bg-primary-container/90 text-white font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {engine.isSubmitting || engine.isEvaluating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Evaluating synthesis...</span>
                          </>
                        ) : (
                          <>
                            <span>
                              Submit Attempt {engine.submittedAttempt ? engine.submittedAttempt.attempt_number + 1 : 1}
                            </span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Optional Step-by-Step prompt guide accordion */}
                  {showStepDetails && (
                    <div className="mt-3 p-4 rounded-xl bg-canvas-subtle border border-border-hairline space-y-3">
                      <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider font-semibold block">
                        Underlying Benchmark Milestones ({totalMilestones})
                      </span>
                      <div className="space-y-2">
                        {milestones.map((m, idx) => (
                          <div key={idx} className="text-xs bg-canvas-base p-2.5 rounded-lg border border-border-hairline">
                            <span className="font-mono text-primary-container font-bold mr-1.5">
                              Step {idx + 1}:
                            </span>
                            <span className="text-text-primary font-medium">{m}</span>
                            <p className="text-text-secondary mt-1 text-[11px]">
                              {questions[idx] || m}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Progressive Hint Rail (4 Cols) */}
              <div className="lg:col-span-4 self-start">
                <HintLadderRail
                  challenge={challenge}
                  hintState={engine.hintState}
                  latestVerdict={evalResult?.verdict || null}
                  onRequestHint={engine.handleRequestHint}
                  isRequestingHint={engine.isRequestingHint}
                  onRevealOverride={() => engine.setIsOverrideRevealed(!engine.isOverrideRevealed)}
                  isOverrideRevealed={engine.isOverrideRevealed}
                  attemptNumber={engine.submittedAttempt?.attempt_number || 1}
                />
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: EVALUATION OUTPUT (04 - evaluation) */}
        {engine.stage === 'submitted' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6 self-start">
              {/* Immediate Loading Indicator while evaluating */}
              {(engine.isEvaluating || engine.isSubmitting) && (
                <div
                  id="evaluating-loading-banner"
                  className="rounded-2xl border border-border-hairline bg-canvas-elevated p-8 sm:p-12 text-center space-y-4 shadow-sm"
                >
                  <RefreshCw className="w-8 h-8 text-primary-container animate-spin mx-auto" />
                  <h3 className="font-display text-xl font-bold text-text-primary">
                    Evaluating Synthesis against Benchmark...
                  </h3>
                  <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                    Analyzing demonstrated capabilities, structural reasoning milestones, and quantitative trade-offs
                    against the ground-truth rubric.
                  </p>
                </div>
              )}

              {/* Error Fallback Card if Evaluation Failed */}
              {!engine.isEvaluating && !evalResult && (
                <article className="bg-canvas-elevated rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-display font-bold text-text-primary">Evaluation Incomplete</h2>
                    <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                      {engine.evaluationError || 'The evaluation could not be processed. Your responses have been preserved.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => engine.setStage('attempt')}
                    className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-full bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-colors shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return to Editor & Revise</span>
                  </button>
                </article>
              )}

              {/* HERO EVALUATION CARD (04 - evaluation/code.html) */}
              {!engine.isEvaluating && evalResult && (
                <>
                  <article
                    className="bg-canvas-elevated rounded-2xl border border-border-hairline shadow-sm p-6 sm:p-8"
                    id="evaluation-results-card"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : evalResult.verdict === 'PARTIALLY_CORRECT'
                              ? 'bg-amber-50 text-[#b45309] border-amber-200'
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}
                        >
                          {isCorrect ? (
                            <Award className="w-6 h-6" />
                          ) : (
                            <CheckCircle2 className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-[11px] font-mono tracking-widest uppercase font-bold ${
                              isCorrect ? 'text-emerald-700' : 'text-[#b45309]'
                            }`}
                          >
                            {isCorrect
                              ? 'CAPABILITY DEMONSTRATED & VERIFIED'
                              : 'CRITICAL BENCHMARK GAPS DETECTED'}
                          </p>
                          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary tracking-tight mt-0.5">
                            {isCorrect
                              ? 'Autonomous Mastery Achieved'
                              : evalResult.verdict === 'PARTIALLY_CORRECT'
                              ? 'Partially Demonstrated'
                              : evalResult.verdict === 'NEEDS_CLARIFICATION'
                              ? 'Clarification Needed'
                              : 'Revision Required'}
                          </h1>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isCorrect ? 'Tier-1 Verified' : 'Revision Needed'}
                        </span>
                      </div>
                    </div>

                    <p className="text-text-secondary text-sm leading-relaxed mb-6 font-normal">
                      {isCorrect ? (
                        <>
                          Congratulations! Your unassisted synthesis for{' '}
                          <strong className="font-semibold text-text-primary bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {concept.name}
                          </strong>{' '}
                          satisfies all operational criteria without relying on hint assistance.
                        </>
                      ) : (
                        <>
                          Your synthesis for{' '}
                          <strong className="font-semibold text-text-primary bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {concept.name}
                          </strong>{' '}
                          revealed structural reasoning gaps against the required rubric.
                        </>
                      )}
                    </p>

                    {/* Evaluator Decision Strip */}
                    <div
                      className={`rounded-xl border p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-3 ${
                        isCorrect
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-canvas-subtle border-border-hairline text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted font-medium">Evaluator Decision:</span>
                        <span className="font-bold tracking-wide flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCorrect ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {evalResult.verdict}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted font-medium">Confidence:</span>
                        <span className="font-semibold bg-canvas-base px-2 py-0.5 rounded border border-border-hairline">
                          {Math.round((evalResult.evaluator_confidence || 1) * 100)}%
                        </span>
                      </div>
                    </div>
                  </article>

                  {/* Feedback on Understanding */}
                  <article className="bg-canvas-elevated rounded-xl border border-border-hairline p-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-text-muted" />
                      <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-text-primary">
                        Feedback on Understanding
                      </h2>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {evalResult.brief_feedback ||
                        'Strong autonomous formulation addressing evaluation constraints directly.'}
                    </p>
                  </article>

                  {/* Dual Named Competency Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Column 1: Validated Competencies */}
                    <article className="bg-canvas-elevated rounded-xl border border-emerald-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-hairline">
                          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <h3 className="font-mono text-xs uppercase tracking-wider font-bold">
                              Validated Competencies ({evalResult.demonstrated_capabilities?.length || 0})
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
                            Demonstrated
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {(evalResult.demonstrated_capabilities || []).length === 0 ? (
                            <li className="text-xs text-text-secondary italic py-2">No milestones fully demonstrated yet.</li>
                          ) : (
                            evalResult.demonstrated_capabilities.map((c, i) => {
                              const stepNum = resolveMilestoneStepNumber(c, milestones);
                              return (
                                <li key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold shrink-0 mt-0.5 border border-emerald-200">
                                    {stepNum ? `Step ${stepNum}` : '✓'}
                                  </span>
                                  <span className="leading-relaxed text-text-primary">{c}</span>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    </article>

                    {/* Column 2: Identified Blindspots & Gaps */}
                    <article className="bg-canvas-elevated rounded-xl border border-border-hairline p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-hairline">
                          <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                            <AlertCircle className="w-4 h-4 text-[#b45309]" />
                            <h3 className="font-mono text-xs uppercase tracking-wider font-bold">
                              Identified Blindspots ({evalResult.missing_capabilities?.length || 0})
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono bg-canvas-subtle text-text-secondary font-medium px-2 py-0.5 rounded border border-border-hairline">
                            Audit Gap
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {!evalResult.missing_capabilities || evalResult.missing_capabilities.length === 0 ? (
                            <li className="text-xs text-emerald-700 italic py-2">
                              • 0 missing — 100% operational criteria substantiated.
                            </li>
                          ) : (
                            evalResult.missing_capabilities.map((c, i) => {
                              const stepNum = resolveMilestoneStepNumber(c, milestones);
                              return (
                                <li key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[#b45309] font-mono text-[10px] font-bold shrink-0 mt-0.5 border border-amber-200">
                                    {stepNum ? `Step ${stepNum}` : 'Gap'}
                                  </span>
                                  <span className="leading-relaxed">{c}</span>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    </article>
                  </div>

                  {/* Grounded Evidence Audit */}
                  {evalResult.evidence && evalResult.evidence.length > 0 && (
                    <article className="bg-canvas-elevated rounded-xl border border-border-hairline p-5 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <Quote className="w-4 h-4 text-text-muted" />
                        <h3 className="font-mono text-xs uppercase tracking-wider text-text-primary font-bold">
                          Grounded Evidence Audit ({evalResult.evidence.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {evalResult.evidence.map((ev, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border-hairline bg-canvas-subtle p-3 text-xs font-mono text-text-secondary leading-relaxed"
                          >
                            {ev}
                          </div>
                        ))}
                      </div>
                    </article>
                  )}

                  {/* Evaluation Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-hairline">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => onNavigate('evidence')}
                        className="px-5 py-2 rounded-full bg-canvas-subtle hover:bg-surface-container text-text-primary font-label-md text-xs font-semibold transition-colors border border-border-hairline cursor-pointer"
                      >
                        View in My Evidence
                      </button>

                      {!isCorrect && (
                        <button
                          onClick={engine.handleRetryAttempt}
                          className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-full bg-primary-container text-white font-label-md text-xs font-semibold hover:bg-primary-container/90 transition-colors shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revise & Retry Attempt</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const reason = prompt('Please state the reason for disputing this evaluation verdict:');
                          if (reason && reason.trim().length > 0) {
                            engine.handleFlagReview(reason.trim());
                            alert('Verdict flagged for review. Your feedback has been logged in session history.');
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full border border-border-hairline bg-canvas-base text-text-muted hover:text-text-primary hover:border-border-focus text-xs font-mono transition-colors cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>
                          {engine.submittedAttempt?.evaluation_flagged
                            ? 'Flagged for Review'
                            : 'Flag this Evaluation'}
                        </span>
                      </button>
                    </div>

                    {isCorrect && (
                      <button
                        id="continue-next-module-btn"
                        onClick={() => onNavigate('prove')}
                        className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-emerald-600 text-white font-label-md text-xs font-semibold hover:bg-emerald-500 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Continue to Next Module</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Progressive Hint Rail (4 Cols) */}
            <div className="lg:col-span-4 self-start">
              <HintLadderRail
                challenge={challenge}
                hintState={engine.hintState}
                latestVerdict={evalResult?.verdict || null}
                onRequestHint={engine.handleRequestHint}
                isRequestingHint={engine.isRequestingHint}
                onRevealOverride={() => engine.setIsOverrideRevealed(!engine.isOverrideRevealed)}
                isOverrideRevealed={engine.isOverrideRevealed}
                attemptNumber={engine.submittedAttempt?.attempt_number || 1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

