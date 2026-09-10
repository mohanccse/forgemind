import {
  ChallengeHintState,
  GeneratedChallenge,
  ProgressiveHint,
  EvaluationVerdict,
  LearnerAttempt
} from '../types';
import { flagAttemptEvaluation } from './attemptService';

const HINT_STATE_PREFIX = 'forgemind_hint_state_';

export interface TierDefinition {
  tier: number;
  name: string;
  shortDesc: string;
  fullTitle: string;
}

export const HINT_TIER_DEFINITIONS: Record<number, TierDefinition> = {
  1: {
    tier: 1,
    name: 'NUDGE',
    shortDesc: 'Small redirection.',
    fullTitle: 'Tier 1 — NUDGE'
  },
  2: {
    tier: 2,
    name: 'DIRECTION',
    shortDesc: 'Points toward the relevant reasoning direction.',
    fullTitle: 'Tier 2 — DIRECTION'
  },
  3: {
    tier: 3,
    name: 'CONCEPT',
    shortDesc: 'Reminds the learner of the relevant concept.',
    fullTitle: 'Tier 3 — CONCEPT'
  },
  4: {
    tier: 4,
    name: 'STRUCTURE',
    shortDesc: 'Provides a structured approach.',
    fullTitle: 'Tier 4 — STRUCTURE'
  },
  5: {
    tier: 5,
    name: 'SOLUTION',
    shortDesc: 'Reveals the solution.',
    fullTitle: 'Tier 5 — SOLUTION'
  }
};

/**
 * Get or initialize persistent hint state for a specific challenge.
 * Strictly scoped to challengeId and isolated per browser session.
 */
export function getHintState(challengeId: string, conceptId: string): ChallengeHintState {
  if (!challengeId || challengeId.trim() === '') {
    return {
      challenge_id: '',
      concept_id: conceptId,
      current_tier: 0,
      unlocked_tiers: [],
      last_unlocked_at_attempt: 0,
      attempts_since_last_hint: 0,
      progression_frozen: false,
      solution_revealed: false,
      evaluation_flagged: false,
      last_verdict: null
    };
  }

  // Purge any legacy localStorage key to prevent stale test data leaks
  try {
    localStorage.removeItem(`${HINT_STATE_PREFIX}${challengeId}`);
  } catch (e) {}

  try {
    const raw = sessionStorage.getItem(`${HINT_STATE_PREFIX}${challengeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure state is valid and matches challengeId
      if (parsed && parsed.challenge_id === challengeId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read hint state from storage:', e);
  }

  const defaultState: ChallengeHintState = {
    challenge_id: challengeId,
    concept_id: conceptId,
    current_tier: 0,
    unlocked_tiers: [],
    last_unlocked_at_attempt: 0,
    attempts_since_last_hint: 0,
    progression_frozen: false,
    solution_revealed: false,
    evaluation_flagged: false,
    last_verdict: null
  };

  saveHintState(challengeId, defaultState);
  return defaultState;
}

/**
 * Reset hint state to initial zero-hint state for a fresh attempt.
 */
export function resetHintState(challengeId: string, conceptId: string): ChallengeHintState {
  const defaultState: ChallengeHintState = {
    challenge_id: challengeId,
    concept_id: conceptId,
    current_tier: 0,
    unlocked_tiers: [],
    last_unlocked_at_attempt: 0,
    attempts_since_last_hint: 0,
    progression_frozen: false,
    solution_revealed: false,
    evaluation_flagged: false,
    last_verdict: null
  };
  saveHintState(challengeId, defaultState);
  try {
    localStorage.removeItem(`${HINT_STATE_PREFIX}${challengeId}`);
  } catch (e) {}
  return defaultState;
}

/**
 * Completely purges all cached hint states for a concept when returning to the Content Library or selecting a new topic.
 */
export function resetHintStateForConcept(conceptId: string): void {
  if (!conceptId) return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(HINT_STATE_PREFIX)) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.concept_id === conceptId || key.includes(conceptId))) {
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            sessionStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Persist hint state to sessionStorage strictly scoped by challengeId.
 */
export function saveHintState(challengeId: string, state: ChallengeHintState): void {
  if (!challengeId || challengeId.trim() === '') return;
  try {
    sessionStorage.setItem(`${HINT_STATE_PREFIX}${challengeId}`, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save hint state:', e);
  }
}

/**
 * Validates whether a specific hint tier can be requested under strict ForgeMind rules.
 */
export function canRequestHintTier(
  state: ChallengeHintState,
  targetTier: number,
  lastVerdict?: EvaluationVerdict | null,
  hasSubmittedAttempt: boolean = false
): { allowed: boolean; reason?: string } {
  const effectiveVerdict = lastVerdict || state.last_verdict || null;

  // Rule: Evaluator returned NEEDS_CLARIFICATION -> freeze progression
  if (state.progression_frozen || effectiveVerdict === 'NEEDS_CLARIFICATION') {
    return {
      allowed: false,
      reason: 'Hint progression is frozen. The evaluator requested clarification. Please clarify or retry your submission before advancing hints.'
    };
  }

  // Rule: If last verdict was CORRECT, no hints needed
  if (effectiveVerdict === 'CORRECT') {
    return {
      allowed: false,
      reason: 'You have already demonstrated verified capability (CORRECT). No hints are required.'
    };
  }

  // Rule: Must have submitted at least one unassisted attempt first
  if (!hasSubmittedAttempt && state.current_tier === 0 && !effectiveVerdict) {
    return {
      allowed: false,
      reason: 'You must submit your unassisted demonstration first before any hints can be requested.'
    };
  }

  // Rule: Cannot skip tiers
  if (targetTier !== state.current_tier + 1) {
    if (targetTier <= state.current_tier) {
      return {
        allowed: false,
        reason: `Tier ${targetTier} has already been unlocked.`
      };
    }
    return {
      allowed: false,
      reason: `Cannot skip tiers. You must unlock Tier ${state.current_tier + 1} first.`
    };
  }

  // Rule: Target tier bounds (1 to 5)
  if (targetTier < 1 || targetTier > 5) {
    return {
      allowed: false,
      reason: 'Hint tiers range strictly from 1 to 5.'
    };
  }

  // Tier 1: Requires an attempt evaluated as PARTIALLY_CORRECT or WRONG_APPROACH
  if (targetTier === 1) {
    if (effectiveVerdict !== 'PARTIALLY_CORRECT' && effectiveVerdict !== 'WRONG_APPROACH') {
      return {
        allowed: false,
        reason: 'Hint 1 is available only after submitting an attempt evaluated as Partially Correct or Wrong Approach.'
      };
    }
    return { allowed: true };
  }

  // Tiers 2, 3, 4: Requires a retry attempt submitted AFTER unlocking the previous tier!
  if (targetTier >= 2 && targetTier <= 4) {
    if (state.attempts_since_last_hint < 1) {
      return {
        allowed: false,
        reason: `Submit a retry attempt after viewing Tier ${state.current_tier} before requesting Tier ${targetTier}.`
      };
    }

    if (effectiveVerdict !== 'PARTIALLY_CORRECT' && effectiveVerdict !== 'WRONG_APPROACH') {
      return {
        allowed: false,
        reason: `Hint ${targetTier} requires a recent attempt evaluated as Partially Correct or Wrong Approach.`
      };
    }

    return { allowed: true };
  }

  // Tier 5: Solution reveal
  // Rule: Tier 5 is not available before the required progression (must have reached Tier 4 and submitted a retry)
  if (targetTier === 5) {
    if (state.current_tier < 4) {
      return {
        allowed: false,
        reason: 'Tier 5 is not available before the required progression (Tier 1 through Tier 4 with retries).'
      };
    }

    if (state.attempts_since_last_hint < 1) {
      return {
        allowed: false,
        reason: 'Submit a retry attempt after viewing Tier 4 before unlocking Tier 5 (Solution Reveal).'
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid progression request.' };
}

/**
 * Updates hint state when an attempt is submitted and evaluated.
 */
export function recordAttemptEvaluationInHintState(
  challengeId: string,
  conceptId: string,
  attemptNumber: number,
  verdict?: EvaluationVerdict | null
): ChallengeHintState {
  const state = getHintState(challengeId, conceptId);

  // Store last_verdict in state
  state.last_verdict = verdict || null;

  if (verdict === 'NEEDS_CLARIFICATION') {
    state.progression_frozen = true;
    state.frozen_reason =
      'Evaluation returned NEEDS_CLARIFICATION: The response was insufficient, off-topic, or ambiguous. Hint progression is frozen until clarified.';
  } else {
    // Unfreeze if a substantive verdict was returned
    state.progression_frozen = false;
    state.frozen_reason = undefined;
  }

  // Handle progressive hint unlocking on failed attempts
  if (verdict === 'PARTIALLY_CORRECT' || verdict === 'WRONG_APPROACH') {
    state.attempts_since_last_hint = (state.attempts_since_last_hint || 0) + 1;
  }

  saveHintState(challengeId, state);
  return state;
}

/**
 * Request unlocking the next hint tier.
 * STRICT: Gating is enforced on both client and server.
 * IMPORTANT: ZERO LLM calls are made. It purely uses stored challenge hints.
 */
export async function requestHintTier(
  challenge: GeneratedChallenge,
  targetTier: number,
  lastVerdict?: EvaluationVerdict | null,
  attemptNumber: number = 1,
  lastAttemptId?: string
): Promise<{
  success: boolean;
  hint?: ProgressiveHint;
  solution?: string;
  error?: string;
  state: ChallengeHintState;
}> {
  const state = getHintState(challenge.id, challenge.conceptId);

  // Client-side rule validation
  const check = canRequestHintTier(state, targetTier, lastVerdict, true);
  if (!check.allowed) {
    return {
      success: false,
      error: check.reason,
      state
    };
  }

  // Attempt server-side verification first
  let serverValidated = false;
  let serverResponse: any = null;

  try {
    const res = await fetch(`/api/challenge/${challenge.id}/request-hint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conceptId: challenge.conceptId,
        requestedTier: targetTier,
        lastVerdict,
        attemptNumber,
        lastAttemptId,
        challenge // pass stored challenge for resilient server-side lookup
      })
    });

    if (res.ok) {
      serverResponse = await res.json();
      if (serverResponse.success) {
        serverValidated = true;
      } else {
        return {
          success: false,
          error: serverResponse.error || 'Server rejected hint request.',
          state
        };
      }
    }
  } catch (netErr) {
    // Fall back to client application enforcement if server is unreachable
    console.warn('Network call to hint endpoint failed, relying on application enforcement:', netErr);
  }

  // Find stored hint in existing challenge
  const storedHint = challenge.hints?.find((h) => h.tier === targetTier);
  if (!storedHint && targetTier !== 5) {
    return {
      success: false,
      error: `Stored hint for Tier ${targetTier} was not found in challenge definition.`,
      state
    };
  }

  // Construct standard hint object
  const tierDef = HINT_TIER_DEFINITIONS[targetTier];
  const hintObj: ProgressiveHint = storedHint || {
    tier: targetTier as any,
    type: targetTier === 1 ? 'Nudge' : targetTier === 2 ? 'Direction' : targetTier === 3 ? 'Concept reminder' : targetTier === 4 ? 'Structural guidance' : 'Solution reveal',
    title: tierDef.fullTitle,
    hint: targetTier === 5 ? challenge.referenceSolution : `Guidance for ${tierDef.name}`,
    penaltyDescription: targetTier === 1 ? '-5% on Independence' : targetTier === 2 ? '-12%' : targetTier === 3 ? '-20%' : targetTier === 4 ? '-35%' : '-60%'
  };

  // Update and persist state
  state.current_tier = targetTier;
  if (!state.unlocked_tiers.includes(targetTier)) {
    state.unlocked_tiers.push(targetTier);
  }
  state.last_unlocked_at_attempt = attemptNumber;
  state.attempts_since_last_hint = 0; // Reset counter for the newly unlocked tier

  // Rule: Tier 5 reveals solution and marks solution_revealed = true
  if (targetTier === 5) {
    state.solution_revealed = true;
    state.solution_revealed_at = new Date().toISOString();
  }

  saveHintState(challenge.id, state);

  return {
    success: true,
    hint: hintObj,
    solution: targetTier === 5 ? challenge.referenceSolution : undefined,
    state
  };
}

/**
 * Flag an evaluation for review (Evaluation Override).
 * Only allowed after Tier 4 has been reached.
 * Strictly avoids exposing hidden evaluation instructions or prompts.
 */
export async function flagEvaluationOverride(
  challengeId: string,
  conceptId: string,
  attemptId: string,
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
  state: ChallengeHintState;
}> {
  const state = getHintState(challengeId, conceptId);

  // Rule: After Tier 4 only
  if (state.current_tier < 4) {
    return {
      success: false,
      error: 'Evaluation override and review requests are only available after reaching Tier 4.',
      state
    };
  }

  const rationale = reason?.trim() || 'Learner flagged evaluation: alternative valid approach formulated.';

  // Attempt server persistence
  try {
    await fetch(`/api/challenge/${challengeId}/flag-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attemptId,
        conceptId,
        reason: rationale
      })
    });
  } catch (err) {
    console.warn('Server flag-review call failed, persisting locally:', err);
  }

  // Update local hint state
  state.evaluation_flagged = true;
  state.flagged_review_reason = rationale;
  state.flagged_at = new Date().toISOString();
  saveHintState(challengeId, state);

  // Update attempt record in permanent ledger
  flagAttemptEvaluation(attemptId, rationale);

  return {
    success: true,
    state
  };
}
