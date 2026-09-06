'use client';

import React, { useState } from 'react';
import {
  GeneratedChallenge,
  Concept,
  ChallengeHintState,
  LearnerAttempt,
  EvaluationVerdict
} from '../types';
import { HINT_TIER_DEFINITIONS } from '../services/hintService';
import {
  Lightbulb,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Flag,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HintLadderProps {
  challenge: GeneratedChallenge;
  concept: Concept;
  hintState: ChallengeHintState;
  latestAttempt: LearnerAttempt | null;
  onRequestHint: (tier: number) => Promise<void>;
  onRetry: () => void;
  onFlagReview: (reason: string) => Promise<void>;
  isRequestingHint: boolean;
}

export const HintLadder: React.FC<HintLadderProps> = ({
  challenge,
  concept,
  hintState,
  latestAttempt,
  onRequestHint,
  onRetry,
  onFlagReview,
  isRequestingHint
}) => {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  const lastVerdict: EvaluationVerdict | null =
    latestAttempt?.evaluation?.verdict || latestAttempt?.verdict || hintState.last_verdict || null;
  const isCorrect = lastVerdict === 'CORRECT';
  const isNeedsClarification = lastVerdict === 'NEEDS_CLARIFICATION' || hintState.progression_frozen;

  const currentTier = hintState.current_tier;
  const nextTier = currentTier + 1;

  // Determine if next tier is requestable
  const canRequestNext =
    !isCorrect &&
    !isNeedsClarification &&
    nextTier <= 5 &&
    (nextTier === 1
      ? lastVerdict === 'PARTIALLY_CORRECT' || lastVerdict === 'WRONG_APPROACH'
      : hintState.attempts_since_last_hint >= 1 &&
        (lastVerdict === 'PARTIALLY_CORRECT' || lastVerdict === 'WRONG_APPROACH'));

  const needsRetryBeforeNext =
    !isCorrect &&
    !isNeedsClarification &&
    currentTier >= 1 &&
    nextTier <= 5 &&
    hintState.attempts_since_last_hint < 1;

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOverride) return;
    setIsSubmittingOverride(true);
    try {
      await onFlagReview(overrideRationale);
      setOverrideSuccess(true);
      setShowOverrideInput(false);
    } catch (err) {
      console.error('Failed to submit evaluation override:', err);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div id="hint-ladder-container" className="mt-8 rounded-2xl border border-zinc-800 bg-[#0e0f14]/90 p-6 sm:p-7 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-lg font-medium text-zinc-100">
                Progressive Hint Ladder
              </h3>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                Tier {currentTier} of 5
              </span>
              {hintState.solution_revealed && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                  solution_revealed = true
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Strict step-by-step guidance. No automatic hints. Learner must explicitly request each tier after retrying.
            </p>
          </div>
        </div>

        {/* Retry Button Quick Access if unlocked */}
        {currentTier >= 1 && !isCorrect && (
          <button
            id="retry-with-hints-btn"
            type="button"
            onClick={onRetry}
            className="inline-flex items-center space-x-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {isNeedsClarification ? 'Clarify & Retry Attempt' : `Retry Challenge with Tier ${currentTier}`}
            </span>
          </button>
        )}
      </div>

      {/* STATUS: NEEDS_CLARIFICATION BANNER */}
      {isNeedsClarification && (
        <div id="clarification-frozen-banner" className="mt-5 rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">
          <div className="flex items-start space-x-3">
            <HelpCircle className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold font-mono uppercase tracking-wider text-violet-300">
                  Hint Progression Frozen
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  Current State Preserved (Tier {currentTier})
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                The evaluator returned <strong className="text-violet-300">NEEDS_CLARIFICATION</strong>. Your formulation lacked sufficient substantive explanation, constraints verification, or was ambiguous.
                Hint progression is strictly frozen and cannot advance until you clarify your submission.
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center space-x-1.5 rounded-md bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clarify or Retry Submission</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS: CORRECT BANNER */}
      {isCorrect && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-emerald-300">
                Capability Verified — Full Independence Demonstrated
              </h4>
              <p className="text-xs text-zinc-300 mt-0.5">
                Your submission satisfied all structural milestones. No further hints are needed for this challenge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5-TIER HINT LADDER LIST */}
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((tierNum) => {
          const tierDef = HINT_TIER_DEFINITIONS[tierNum];
          const isUnlocked = hintState.unlocked_tiers.includes(tierNum);
          const isNext = tierNum === nextTier;
          const isFuture = tierNum > nextTier;
          const storedHint = challenge.hints?.find((h) => h.tier === tierNum);

          return (
            <div
              key={tierNum}
              id={`hint-tier-${tierNum}`}
              className={`rounded-xl border transition-all duration-200 ${
                isUnlocked
                  ? tierNum === 5
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-amber-500/30 bg-zinc-950/70'
                  : isNext
                  ? canRequestNext
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-zinc-800 bg-zinc-950/40'
                  : 'border-zinc-800/60 bg-zinc-950/20 opacity-60'
              }`}
            >
              {/* Tier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      isUnlocked
                        ? tierNum === 5
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isNext && canRequestNext
                        ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                        : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}
                  >
                    {isUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-200">
                        {tierDef.fullTitle}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-normal">
                        — {tierDef.shortDesc}
                      </span>
                    </div>

                    {storedHint && (
                      <span className="text-[10px] font-mono text-amber-400/90 block mt-0.5">
                        {storedHint.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status / Actions */}
                <div className="flex items-center space-x-3 sm:self-center">
                  {isUnlocked && (
                    <span className="inline-flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Unlocked</span>
                    </span>
                  )}

                  {/* Action for the NEXT tier */}
                  {!isUnlocked && isNext && !isCorrect && (
                    <>
                      {canRequestNext ? (
                        <button
                          id={`request-hint-${tierNum}-btn`}
                          type="button"
                          disabled={isRequestingHint}
                          onClick={() => onRequestHint(tierNum)}
                          className={`inline-flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                            tierNum === 5
                              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-950/50'
                              : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-md shadow-amber-950/50'
                          }`}
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>
                            {isRequestingHint
                              ? 'Unlocking...'
                              : tierNum === 5
                              ? 'Reveal Reference Solution (Tier 5)'
                              : tierNum === 1
                              ? 'Reveal Tier 1 Hint (NUDGE)'
                              : `Request Hint ${tierNum} (${tierDef.name})`}
                          </span>
                        </button>
                      ) : needsRetryBeforeNext ? (
                        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                          <span className="text-zinc-500">Locked:</span>
                          <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex items-center space-x-1 text-amber-400 hover:text-amber-300 underline font-sans text-xs"
                          >
                            <span>Submit retry attempt with Tier {currentTier} first</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-zinc-500">
                          {isNeedsClarification ? 'Frozen until clarified' : 'Locked — Awaiting attempt evaluation'}
                        </span>
                      )}
                    </>
                  )}

                  {/* Future tiers */}
                  {isFuture && (
                    <span className="text-[11px] font-mono text-zinc-600">
                      Locked — Future tiers remain hidden
                    </span>
                  )}
                </div>
              </div>

              {/* Unlocked Content Section */}
              {isUnlocked && (
                <div className="border-t border-zinc-800/80 bg-zinc-900/30 p-4 sm:p-5 space-y-3">
                  {tierNum < 5 && storedHint && (
                    <div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        {storedHint.hint}
                      </p>
                      <div className="mt-2.5 flex items-center space-x-2 text-[10px] font-mono text-zinc-500">
                        <span>Independence impact:</span>
                        <span className="text-amber-400/90 font-medium">{storedHint.penaltyDescription}</span>
                      </div>
                    </div>
                  )}

                  {/* TIER 5: FULL MODEL SOLUTION REVEAL */}
                  {tierNum === 5 && (
                    <div id="solution-reveal-panel" className="space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <FileCheck className="h-4 w-4" />
                          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider">
                            Full Model Reference Solution & Trade-Off Defense
                          </h4>
                        </div>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                          solution_revealed = true
                        </span>
                      </div>

                      {storedHint && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300 leading-relaxed">
                          <strong className="text-amber-300 block mb-1">Model Synthesis:</strong>
                          {storedHint.hint}
                        </div>
                      )}

                      <div className="rounded-lg border border-emerald-500/30 bg-zinc-950 p-4">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 block mb-2 font-semibold">
                          Reference Solution
                        </span>
                        <pre className="overflow-x-auto text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-96">
                          {challenge.referenceSolution}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 5: EVALUATION OVERRIDE (Available After Tier 4) */}
      {currentTier >= 4 && (
        <div id="evaluation-override-card" className="mt-8 rounded-xl border border-zinc-700 bg-zinc-950/80 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Flag className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-zinc-100 font-serif">
                  Still think your answer was valid?
                </h4>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                If your technical approach was sound, adhered to all scenario constraints, or used a legitimate alternative reasoning path despite the automated evaluation verdict, you can flag this evaluation for instructor audit.
              </p>
            </div>

            {hintState.evaluation_flagged || overrideSuccess ? (
              <div className="inline-flex items-center space-x-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Flagged for Review</span>
              </div>
            ) : (
              <button
                id="open-override-btn"
                type="button"
                onClick={() => setShowOverrideInput(!showOverrideInput)}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors"
              >
                <span>Flag Evaluation / Request Review</span>
                {showOverrideInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {/* If already flagged */}
          {(hintState.evaluation_flagged || overrideSuccess) && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between font-mono text-[11px] text-amber-300 mb-1">
                <span>Evaluation Flag Persisted in Evidence Ledger</span>
                <span>{new Date(hintState.flagged_at || Date.now()).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-zinc-400">
                Rationale: &ldquo;{hintState.flagged_review_reason || overrideRationale || 'Learner flagged evaluation for instructor review.'}&rdquo;
              </p>
            </div>
          )}

          {/* Override Form */}
          {showOverrideInput && !hintState.evaluation_flagged && !overrideSuccess && (
            <form onSubmit={handleFlagSubmit} className="mt-4 border-t border-zinc-800/80 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Why do you believe your answer was valid? (Defense / Trade-Off Rationale)
                </label>
                <textarea
                  value={overrideRationale}
                  onChange={(e) => setOverrideRationale(e.target.value)}
                  placeholder="Explain which constraints your response satisfied and why your technical alternative is legitimate..."
                  rows={3}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOverrideInput(false)}
                  className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !overrideRationale.trim()}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
                >
                  <Flag className="h-3 w-3" />
                  <span>{isSubmittingOverride ? 'Persisting Flag...' : 'Confirm & Persist Flag'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
