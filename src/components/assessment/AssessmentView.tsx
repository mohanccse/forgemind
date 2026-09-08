'use client';

import React from 'react';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  Send,
  ShieldCheck,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  AlertOctagon,
  HelpCircle,
  Quote
} from 'lucide-react';
import { Concept, ViewTab, GeneratedChallenge } from '../../types';
import { HintLadderRail } from '../HintLadderRail';
import { useAssessmentEngine } from '../../hooks/useAssessmentEngine';

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

  const confidenceOptions = [
    { value: 1, label: '1 — Not confident', desc: 'Little to no certainty on independent derivation' },
    { value: 2, label: '2', desc: 'Vague recall of general mechanics' },
    { value: 3, label: '3', desc: 'Moderate confidence; understand principles' },
    { value: 4, label: '4', desc: 'High confidence; can navigate constraints' },
    { value: 5, label: '5 — Very confident', desc: 'Mastery certainty; ready for edge cases' }
  ];

  const milestones = challenge.structuralMilestones || concept.reasoningMilestones || [];
  const questions = challenge.microQuestions || milestones.map((m) => `Target Step: ${m}`);
  const totalMilestones = milestones.length;
  const answeredCount = milestones.filter(
    (_, idx) => (engine.microAnswers[idx] || '').trim().length > 0
  ).length;

  return (
    <div id="assessment-view">
      {/* Top Navigation & Active Topic Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="back-to-prove-btn"
            onClick={onBackToProve}
            className="inline-flex items-center space-x-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Concept Preview</span>
          </button>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="inline-flex items-center space-x-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold text-amber-300">
            <span>Topic: {concept.name}</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-mono text-emerald-300">
            <Lock className="h-3 w-3" />
            <span>Zero-Reference Execution Active</span>
          </div>

          <span className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
            Door: <strong className="text-zinc-300 font-semibold">{challenge.sourceType === 'USER_GENERATED' ? 'Door 2 (Custom Upload)' : 'Door 1 (Content Library)'}</strong>
          </span>

          <span className="text-xs text-zinc-500 hidden md:inline">
            Domain: <strong className="text-zinc-400 font-normal">{concept.domain}</strong>
          </span>
        </div>
      </div>

      {/* Main Challenge Content */}
      <div className="mt-6">
        {/* STAGE 1: CONFIDENCE GATE */}
        {engine.stage === 'confidence' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300 uppercase">
                    TOPIC: {concept.name}
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
                    {challenge.difficulty}
                  </span>
                </div>

                <button
                  onClick={onRegenerateChallenge}
                  className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate Scenario</span>
                </button>
              </div>

              <h1 className="mt-4 font-serif text-2xl font-normal text-zinc-100 sm:text-3xl">
                {challenge.title}
              </h1>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-[#0c0d12] p-3 text-xs text-zinc-300">
                <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">
                  Target Capability
                </span>
                {challenge.capabilityTested || concept.underlyingSkill}
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Scenario & Problem Context
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200 whitespace-pre-line">
                  {challenge.scenario}
                </p>
              </div>

              {challenge.contextData && (
                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                      Operational Telemetry & Parameters
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Immutable Context</span>
                  </div>
                  <pre className="overflow-x-auto text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {challenge.contextData}
                  </pre>
                </div>
              )}

              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center space-x-2 text-xs font-mono font-medium uppercase tracking-wider text-amber-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Your Mandate</span>
                </div>
                <p className="text-sm text-zinc-100 leading-relaxed font-medium">
                  {challenge.mandate}
                </p>
              </div>
            </div>

            {/* CONFIDENCE CALIBRATION GATE */}
            <div
              id="confidence-gate-card"
              className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#161208] to-[#0f0e13] p-6 sm:p-8 shadow-xl"
            >
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>Pre-Challenge Calibration</span>
              </div>

              <h2 className="mt-2 text-lg sm:text-xl font-serif text-zinc-100">
                How confident are you that you can solve this?
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
                {confidenceOptions.map((opt) => {
                  const isSelected = engine.confidenceBeforeAttempt === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => engine.setConfidenceBeforeAttempt(opt.value)}
                      className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 shadow-md text-amber-200 ring-1 ring-amber-400/50'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-sm font-semibold">{opt.label}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isSelected ? 'bg-amber-400' : 'bg-zinc-700'
                          }`}
                        />
                      </div>
                      <span className="mt-2 text-[11px] leading-tight text-zinc-400">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800/80 pt-5">
                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Independent attempt starts on Step 1. All hints start locked (0/5 Unlocked).</span>
                </div>

                <button
                  id="begin-attempt-btn"
                  onClick={engine.handleStartIndependentAttempt}
                  className="flex items-center justify-center space-x-2 rounded-lg bg-amber-400 px-6 py-3 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-all shadow-lg active:scale-[0.99]"
                >
                  <span>Begin Independent Attempt</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: INDEPENDENT STEP WORKSPACE */}
        {engine.stage === 'attempt' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Independent Attempt Active:</span> Topic: <strong className="text-amber-300">{concept.name}</strong>. Zero-reference mode enforced.
                </div>
              </div>
              <div className="text-zinc-400 font-mono text-[11px]">
                Confidence: <strong className="text-amber-300">{engine.confidenceBeforeAttempt}/5</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Primary Workspace (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300 uppercase">
                        TOPIC: {concept.name}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">• {challenge.difficulty}</span>
                    </div>
                    <h2 className="mt-1 font-serif text-lg text-zinc-100">{challenge.title}</h2>
                  </div>

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-amber-400 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mandate</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      {challenge.mandate}
                    </p>
                  </div>
                </div>

                {/* Step Deck Input Area */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-amber-300 font-semibold flex items-center space-x-1.5">
                        <ListChecks className="h-4 w-4" />
                        <span>Step-by-Step Response</span>
                      </span>
                      <span className="text-zinc-600">|</span>
                      <span className="text-xs text-zinc-400 font-mono">
                        1-2 lines per step (~150-200 chars nudge)
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 bg-zinc-950/60 border border-zinc-800/80 rounded-md p-1">
                      <button
                        type="button"
                        onClick={() => engine.setViewAllMilestones(false)}
                        className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          !engine.viewAllMilestones
                            ? 'bg-amber-400 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Single Step
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.setViewAllMilestones(true)}
                        className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          engine.viewAllMilestones
                            ? 'bg-amber-400 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All Steps
                      </button>
                    </div>
                  </div>

                  {/* Stepper Buttons Bar */}
                  <div className="mt-3 flex-1 space-y-4">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {milestones.map((_, idx) => {
                        const isAnswered = (engine.microAnswers[idx] || '').trim().length > 0;
                        const isActive = !engine.viewAllMilestones && engine.activeStep === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              engine.setActiveStep(idx);
                              engine.setViewAllMilestones(false);
                            }}
                            className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-all flex-shrink-0 ${
                              isActive
                                ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 font-semibold shadow-sm'
                                : isAnswered
                                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                                : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {isAnswered && <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
                            <span>Step {idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!engine.viewAllMilestones && (
                      <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center space-x-1.5 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300 border border-amber-500/30">
                            <span>Step {engine.activeStep + 1} of {totalMilestones}</span>
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {answeredCount} of {totalMilestones} answered
                          </span>
                        </div>

                        <div>
                          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400/90">
                            Step {engine.activeStep + 1}: {milestones[engine.activeStep]}
                          </h4>
                          <p className="text-xs text-zinc-200 mt-1 font-sans leading-relaxed font-medium">
                            {questions[engine.activeStep] || milestones[engine.activeStep]}
                          </p>
                        </div>

                        <div className="relative mt-2">
                          <textarea
                            rows={3}
                            value={engine.microAnswers[engine.activeStep] || ''}
                            onChange={(e) => engine.handleMicroAnswerChange(engine.activeStep, e.target.value)}
                            placeholder="Answer in 1-2 lines (approx. 150-200 characters recommended)..."
                            className="w-full rounded-lg border border-zinc-800 bg-[#090a0e] p-3 text-xs leading-relaxed text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                            <span>
                              {(engine.microAnswers[engine.activeStep] || '').length} chars
                            </span>
                            {(engine.microAnswers[engine.activeStep] || '').trim().length > 0 && (
                              <span className="text-emerald-400 flex items-center space-x-1">
                                <Check className="h-3 w-3" />
                                <span>Saved</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                          <button
                            type="button"
                            disabled={engine.activeStep === 0}
                            onClick={() => engine.setActiveStep((prev) => Math.max(0, prev - 1))}
                            className="inline-flex items-center space-x-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Previous Step</span>
                          </button>

                          <button
                            type="button"
                            disabled={engine.activeStep === totalMilestones - 1}
                            onClick={() => engine.setActiveStep((prev) => Math.min(totalMilestones - 1, prev + 1))}
                            className="inline-flex items-center space-x-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-3 py-1 text-xs text-amber-300 font-medium disabled:opacity-40"
                          >
                            <span>Next Step</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {engine.validationError && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      <span>{engine.validationError}</span>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                    <button
                      type="button"
                      id="submit-attempt-btn"
                      disabled={engine.isSubmitting}
                      onClick={engine.handleSubmitAttempt}
                      className={`inline-flex items-center justify-center space-x-2 rounded-lg px-6 py-2.5 text-xs font-semibold transition-all shadow-md ${
                        engine.isSubmitting
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                          : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-[0.99]'
                      }`}
                    >
                      {engine.isSubmitting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing Submission...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Attempt</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Progressive Hint Rail */}
              <div className="lg:col-span-4">
                <HintLadderRail
                  challenge={challenge}
                  hintState={engine.hintState}
                  latestVerdict={engine.evaluationResult?.verdict || null}
                  onRequestHint={engine.handleRequestHint}
                  isRequestingHint={engine.isRequestingHint}
                  onRevealOverride={() => engine.setIsOverrideRevealed(!engine.isOverrideRevealed)}
                  isOverrideRevealed={engine.isOverrideRevealed}
                />
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: EVALUATION OUTPUT */}
        {engine.stage === 'submitted' && engine.submittedAttempt && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#0e1014] p-6 sm:p-8">
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Attempt #{engine.submittedAttempt.attempt_number} Logged
                    </span>
                    <h1 className="font-serif text-2xl text-zinc-100">
                      Topic: {concept.name}
                    </h1>
                  </div>
                </div>

                {/* Evaluation Engine Result Display */}
                {engine.isEvaluating && (
                  <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                    <RefreshCw className="h-6 w-6 text-amber-400 animate-spin mx-auto" />
                    <h3 className="mt-3 font-serif text-lg text-zinc-100">Evaluating Attempt...</h3>
                  </div>
                )}

                {!engine.isEvaluating && engine.evaluationResult && (
                  <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-6">
                    <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-mono uppercase tracking-wider font-semibold border ${
                          engine.evaluationResult.verdict === 'CORRECT'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : engine.evaluationResult.verdict === 'PARTIALLY_CORRECT'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : engine.evaluationResult.verdict === 'WRONG_APPROACH'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                        }`}
                      >
                        Verdict: {engine.evaluationResult.verdict.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-200">
                      {engine.evaluationResult.brief_feedback}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                        <div className="flex items-center space-x-2 text-emerald-400 mb-2 font-mono text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Demonstrated ({engine.evaluationResult.demonstrated_capabilities.length})</span>
                        </div>
                        {engine.evaluationResult.demonstrated_capabilities.map((c, i) => (
                          <div key={i} className="text-xs text-zinc-300 mt-1">• {c}</div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                        <div className="flex items-center space-x-2 text-amber-400 mb-2 font-mono text-xs font-semibold">
                          <AlertCircle className="h-4 w-4" />
                          <span>Missing ({engine.evaluationResult.missing_capabilities.length})</span>
                        </div>
                        {engine.evaluationResult.missing_capabilities.map((c, i) => (
                          <div key={i} className="text-xs text-zinc-400 mt-1">• {c}</div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                      <div className="flex items-center space-x-2 text-amber-300 mb-2 font-mono text-xs font-semibold">
                        <Quote className="h-3.5 w-3.5" />
                        <span>Grounded Evidence Audit ({engine.evaluationResult.evidence.length})</span>
                      </div>
                      {engine.evaluationResult.evidence.map((ev, i) => (
                        <div key={i} className="rounded border border-zinc-800/60 bg-zinc-950/60 p-2 text-xs font-mono text-zinc-300 mt-1">
                          {ev}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onNavigate('evidence')}
                    className="rounded-lg bg-amber-400 px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
                  >
                    View in My Evidence
                  </button>

                  <button
                    onClick={engine.handleRetryAttempt}
                    className="inline-flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Make Another Attempt</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <HintLadderRail
                challenge={challenge}
                hintState={engine.hintState}
                latestVerdict={engine.evaluationResult?.verdict || null}
                onRequestHint={engine.handleRequestHint}
                isRequestingHint={engine.isRequestingHint}
                onRevealOverride={() => engine.setIsOverrideRevealed(!engine.isOverrideRevealed)}
                isOverrideRevealed={engine.isOverrideRevealed}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
