'use client';

import React from 'react';
import { Lock, Unlock, Lightbulb, ShieldAlert, Sparkles, Award } from 'lucide-react';
import { GeneratedChallenge, ChallengeHintState, EvaluationVerdict } from '../types';
import { HINT_TIER_DEFINITIONS } from '../services/hintService';

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
    <aside className="w-full flex flex-col space-y-4 shrink-0">
      {/* Tier-4 Gated Override Gate Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-md">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Reference Model</span>
            </span>
            <p className="text-xs font-medium text-zinc-200">Tier-4 Override Gate</p>
          </div>

          {currentTier >= 4 ? (
            <button
              type="button"
              id="reveal-override-btn"
              onClick={onRevealOverride}
              className="px-2.5 py-1 text-xs font-mono rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors font-medium"
            >
              {isOverrideRevealed ? 'Hide Model' : 'Reveal Model'}
            </button>
          ) : (
            <span className="flex items-center space-x-1 text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
              <Lock className="w-3 h-3 text-zinc-500" />
              <span>Unlocks after Attempt 4</span>
            </span>
          )}
        </div>

        {isOverrideRevealed && currentTier >= 4 && challenge.referenceSolution && (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1 font-semibold">
              Canonical Reference Model Answer:
            </span>
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {challenge.referenceSolution}
            </div>
          </div>
        )}
      </div>

      {/* TERMINAL MASTERY STATE OR PROGRESSIVE HINTS LADDER */}
      {isCorrect ? (
        <div id="terminal-mastery-rail-card" className="rounded-xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-zinc-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-400 block">
                Verification Status
              </span>
              <h3 className="text-sm font-serif font-medium text-zinc-100">
                Autonomous Mastery Achieved
              </h3>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200 leading-relaxed font-mono">
            {currentTier === 0
              ? 'Autonomous Mastery Achieved (0 hints required)'
              : `Solved on Attempt ${attemptNumber} with ${currentTier} hint(s) used.`}
          </div>

          <div className="text-[11px] text-zinc-400 space-y-1 font-sans">
            <p>✓ All underlying capability criteria satisfied.</p>
            <p>✓ Zero-reference execution verified.</p>
          </div>
        </div>
      ) : (
        /* Progressive Hints Stepper Header */
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-100">
                  Progressive Hints
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Gated 1 tier per failed attempt
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-300 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5">
              {currentTier}/5 Unlocked
            </span>
          </div>

          {/* Frozen Clarification Banner */}
          {isNeedsClarification && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/30 p-3 text-xs text-violet-200">
              <span className="font-mono text-[10px] uppercase tracking-wider text-violet-400 font-semibold block mb-0.5">
                Progression Frozen
              </span>
              Clarification requested by evaluator. Clarify or retry your attempt before unlocking further hints.
            </div>
          )}

          {/* 5 Progressive Cards */}
          <div className="space-y-2.5 pt-1">
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
                  className={`rounded-lg p-3.5 border transition-all text-xs ${
                    isUnlocked
                      ? isActive
                        ? 'bg-amber-500/10 border-amber-500/50 text-zinc-100 shadow-sm ring-1 ring-amber-500/20'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
                      : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-600 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-semibold tracking-wide uppercase flex items-center space-x-1.5">
                      {isUnlocked ? (
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                      <span className={isUnlocked ? 'text-amber-300' : 'text-zinc-500'}>
                        {tierDef.fullTitle}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono">
                      {isUnlocked ? (
                        <span className="text-emerald-400 font-medium">
                          {isActive ? 'Active' : 'Unlocked'}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Locked</span>
                      )}
                    </span>
                  </div>

                  {/* SECURITY GUARD: Never render raw hint string if locked */}
                  {isUnlocked ? (
                    <p className="leading-relaxed text-zinc-200 font-sans mt-1.5 text-xs">
                      {contentText || 'No hint available for this tier.'}
                    </p>
                  ) : (
                    <p className="font-mono text-[11px] text-zinc-500 italic mt-1.5">
                      Locked — Available after attempt #{tierNum}
                    </p>
                  )}

                  {/* Explicit Unlock Button for next eligible tier */}
                  {!isUnlocked && tierNum === nextTier && canRequestNext && (
                    <button
                      type="button"
                      disabled={isRequestingHint}
                      onClick={() => onRequestHint(tierNum)}
                      className="mt-2.5 w-full flex items-center justify-center space-x-1.5 rounded-md border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-mono font-medium text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
