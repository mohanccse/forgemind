'use client';

import React from 'react';
import { Lock, Unlock, Lightbulb, ShieldAlert, Sparkles, Award } from 'lucide-react';
import { GeneratedChallenge, ChallengeHintState, EvaluationVerdict } from '../../types';
import { HINT_TIER_DEFINITIONS } from '../../services/hintService';

interface HintLadderRailProps {
  challenge: GeneratedChallenge;
  hintState: ChallengeHintState;
  latestVerdict?: EvaluationVerdict | null;
  onRequestHint: (tier: number) => Promise<void>;
  isRequestingHint: boolean;
  onRevealOverride?: () => void;
  isOverrideRevealed?: boolean;
  attemptNumber?: number;
}

export const HintLadderRail: React.FC<HintLadderRailProps> = ({
  challenge,
  hintState,
  latestVerdict,
  onRequestHint,
  isRequestingHint,
  onRevealOverride,
  isOverrideRevealed = false,
  attemptNumber = 1
}) => {
  const currentTier = hintState.current_tier || 0;
  const tiers = [1, 2, 3, 4, 5] as const;

  const effectiveVerdict = latestVerdict || hintState.last_verdict || null;
  const isCorrect = effectiveVerdict === 'CORRECT';
  const isNeedsClarification = effectiveVerdict === 'NEEDS_CLARIFICATION' || hintState.progression_frozen;

  const nextTier = currentTier + 1;
  const attemptsRemaining = Math.max(0, 4 - currentTier);

  // Rule for explicit next-tier unlock availability
  const canRequestNext =
    !isCorrect &&
    !isNeedsClarification &&
    nextTier <= 5 &&
    (nextTier === 1
      ? effectiveVerdict === 'PARTIALLY_CORRECT' || effectiveVerdict === 'WRONG_APPROACH'
      : hintState.attempts_since_last_hint >= 1 &&
        (effectiveVerdict === 'PARTIALLY_CORRECT' || effectiveVerdict === 'WRONG_APPROACH'));

  return (
    <aside id="hint-ladder-rail" className="w-full flex flex-col space-y-4 shrink-0 sticky top-20 items-start self-start">
      {/* Tier-4 Gated Override Gate Card */}
      <div className="w-full p-4 rounded-xl border border-border-hairline bg-canvas-base shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#b45309] font-bold flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#b45309]" />
              <span>Reference Model</span>
            </span>
            <p className="text-xs font-semibold text-text-primary">Tier-4 Override Gate</p>
          </div>

          {currentTier >= 4 ? (
            <button
              type="button"
              id="reveal-override-btn"
              onClick={onRevealOverride}
              className="px-2.5 py-1 text-xs font-mono rounded-lg border border-amber-300 bg-amber-50 text-[#b45309] hover:bg-amber-100 transition-colors font-medium flex-shrink-0 cursor-pointer"
            >
              {isOverrideRevealed ? 'Hide Model' : 'Reveal Model'}
            </button>
          ) : (
            <span className="flex items-center space-x-1 text-[11px] font-mono text-text-muted bg-canvas-subtle px-2.5 py-1 rounded-md border border-border-hairline flex-shrink-0">
              <Lock className="w-3 h-3 text-text-muted" />
              <span>Gated</span>
            </span>
          )}
        </div>

        {/* Dynamic Tier-4 Override Helper Copy */}
        {currentTier < 4 && (
          <div className="mt-2.5 text-[11px] font-mono text-text-secondary bg-canvas-subtle rounded-lg p-2.5 border border-border-hairline">
            <span className="text-[#b45309] font-semibold">Status:</span> Unlocks after 4 failed attempts (Current: Tier {currentTier}) — <span className="text-text-primary font-bold">{attemptsRemaining}</span> failed attempt(s) remaining.
          </div>
        )}

        {isOverrideRevealed && currentTier >= 4 && challenge.referenceSolution && (
          <div className="mt-3 border-t border-border-hairline pt-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 block mb-1 font-semibold">
              Canonical Reference Model Answer:
            </span>
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-xs text-text-primary leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {challenge.referenceSolution}
            </div>
          </div>
        )}
      </div>

      {/* TERMINAL MASTERY STATE OR PROGRESSIVE HINTS LADDER */}
      {isCorrect ? (
        <div id="terminal-mastery-rail-card" className="w-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300 bg-white text-emerald-600 shrink-0 shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-800 block">
                Verification Status
              </span>
              <h3 className="text-sm font-bold text-text-primary">
                Autonomous Mastery Achieved
              </h3>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-white p-3 text-xs text-emerald-900 leading-relaxed font-mono">
            {currentTier === 0
              ? 'Autonomous Mastery Achieved (0 hints required)'
              : `Solved on Attempt ${attemptNumber} with ${currentTier} hint(s) used.`}
          </div>

          <div className="text-[11px] text-text-secondary space-y-1 font-sans">
            <p>✓ All underlying capability criteria satisfied.</p>
            <p>✓ Zero-reference execution verified.</p>
          </div>
        </div>
      ) : (
        /* Progressive Hints Stepper Header */
        <div className="w-full rounded-xl border border-border-hairline bg-canvas-base p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-hairline pb-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-[#b45309]">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-text-primary">
                  Progressive Hints
                </h3>
                <p className="text-[10px] text-text-muted">
                  Gated 1 tier per attempt
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-[#b45309] rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5">
              {currentTier}/5 Unlocked
            </span>
          </div>

          {/* Frozen Clarification Banner */}
          {isNeedsClarification && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
              <span className="font-mono text-[10px] uppercase tracking-wider text-purple-700 font-bold block mb-0.5">
                Progression Frozen
              </span>
              Clarification requested by evaluator. Clarify or retry your attempt before unlocking further hints.
            </div>
          )}

          {/* 5 Progressive Cards */}
          <div className="space-y-2 pt-1">
            {tiers.map((tierNum) => {
              const isUnlocked = currentTier >= tierNum;
              const isActive = currentTier === tierNum;
              const tierDef = HINT_TIER_DEFINITIONS[tierNum];
              const storedHint = challenge.hints?.find((h) => h.tier === tierNum);

              // Content resolution for unlocked state
              const contentText = storedHint
                ? storedHint.hint
                : tierNum === 5
                ? challenge.referenceSolution
                : null;

              return (
                <div
                  key={tierNum}
                  className={`rounded-xl p-3 border transition-all text-xs ${
                    isUnlocked
                      ? isActive
                        ? 'bg-accent-rose-tint border-primary-container/30 text-text-primary shadow-xs ring-1 ring-primary-container/20'
                        : 'bg-canvas-subtle border-border-hairline text-text-secondary'
                      : 'bg-canvas-subtle/50 border-border-hairline/60 text-text-muted opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-semibold tracking-wide uppercase flex items-center space-x-1.5">
                      {isUnlocked ? (
                        <Unlock className="w-3.5 h-3.5 text-primary-container" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-text-muted" />
                      )}
                      <span className={isUnlocked ? 'text-primary-container font-bold' : 'text-text-muted'}>
                        {tierDef.fullTitle}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono">
                      {isUnlocked ? (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {isActive ? 'Active' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-text-muted">Locked</span>
                      )}
                    </span>
                  </div>

                  {/* SECURITY GUARD: Never render raw hint string if locked */}
                  {isUnlocked ? (
                    <p className="leading-relaxed text-text-primary font-sans mt-1.5 text-xs bg-canvas-base p-2.5 rounded border border-border-hairline">
                      {contentText || 'No hint available for this tier.'}
                    </p>
                  ) : (
                    <p className="font-mono text-[11px] text-text-muted italic mt-1.5">
                      Locked · Available after attempt #{tierNum}
                    </p>
                  )}

                  {/* Explicit Unlock Button for next eligible tier */}
                  {!isUnlocked && tierNum === nextTier && canRequestNext && (
                    <button
                      type="button"
                      disabled={isRequestingHint}
                      onClick={() => onRequestHint(tierNum)}
                      className="mt-2 w-full flex items-center justify-center space-x-1.5 rounded-full border border-primary-container/40 bg-accent-rose-tint px-3 py-1.5 text-xs font-mono font-semibold text-primary-container hover:bg-accent-rose-soft transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary-container" />
                      <span>
                        {isRequestingHint ? 'Unlocking...' : `Request Tier ${tierNum} Hint`}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

