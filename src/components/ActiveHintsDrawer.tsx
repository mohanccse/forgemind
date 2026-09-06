'use client';

import React, { useState } from 'react';
import { GeneratedChallenge, ChallengeHintState } from '../types';
import { HINT_TIER_DEFINITIONS } from '../services/hintService';
import { Lightbulb, ChevronDown, ChevronUp, Unlock, CheckCircle2 } from 'lucide-react';

interface ActiveHintsDrawerProps {
  challenge: GeneratedChallenge;
  hintState: ChallengeHintState;
}

export const ActiveHintsDrawer: React.FC<ActiveHintsDrawerProps> = ({
  challenge,
  hintState
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (hintState.current_tier === 0 || hintState.unlocked_tiers.length === 0) {
    return null;
  }

  return (
    <div
      id="active-hints-drawer"
      className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold font-mono uppercase tracking-wider text-amber-300">
                Active Guidance (Unlocked Tiers 1–{hintState.current_tier})
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-mono text-amber-300 border border-amber-500/20">
                Retry Attempt Mode
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Apply this guidance to revise your reasoning and address missing milestones.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <span>{isExpanded ? 'Hide Guidance' : 'Show Guidance'}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3.5 space-y-2.5 border-t border-amber-500/20 pt-3">
          {hintState.unlocked_tiers.map((tierNum) => {
            const tierDef = HINT_TIER_DEFINITIONS[tierNum];
            const storedHint = challenge.hints?.find((h) => h.tier === tierNum);
            if (!storedHint && tierNum !== 5) return null;

            return (
              <div
                key={tierNum}
                className="rounded-lg border border-amber-500/20 bg-zinc-950/80 p-3 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                      {tierDef.fullTitle}
                    </span>
                    {storedHint && (
                      <span className="text-[11px] text-zinc-400 font-medium">
                        • {storedHint.title}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Unlocked</span>
                  </span>
                </div>

                <p className="text-zinc-200 text-xs leading-relaxed">
                  {storedHint ? storedHint.hint : challenge.referenceSolution}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
