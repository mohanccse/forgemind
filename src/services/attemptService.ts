import { LearnerAttempt, GeneratedChallenge, ChallengeSourceType, EvaluationResult } from '../types';

const STORAGE_KEYS = {
  LEARNER_ID: 'forgemind_learner_id',
  SESSION_ID: 'forgemind_session_id',
  ATTEMPTS: 'forgemind_attempts_records',
  ACTIVE_CHALLENGE_PREFIX: 'forgemind_active_challenge_',
  DRAFT_PREFIX: 'forgemind_draft_'
};

/**
 * Ensures a stable, persistent learner ID across browser restarts.
 */
export function getOrCreateLearnerId(): string {
  try {
    let learnerId = localStorage.getItem(STORAGE_KEYS.LEARNER_ID);
    if (!learnerId) {
      learnerId = `learner_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(STORAGE_KEYS.LEARNER_ID, learnerId);
    }
    return learnerId;
  } catch (e) {
    return 'learner_ephemeral';
  }
}

/**
 * Ensures a session ID for the current browser session.
 */
export function getOrCreateSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  } catch (e) {
    return 'sess_ephemeral';
  }
}

/**
 * Retrieve all persisted attempts isolated for the active learner.
 */
export function getAllAttempts(specificLearnerId?: string): LearnerAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    const all: LearnerAttempt[] = JSON.parse(raw);
    const activeLearnerId = specificLearnerId || getOrCreateLearnerId();
    // Database Isolation: Only return attempts that belong to the active learner
    // or seed demonstrations
    return all.filter(
      (a) =>
        !a.learner_id ||
        a.learner_id === activeLearnerId ||
        a.learner_id === 'seed_learner' ||
        a.learner_id === 'learner_ephemeral'
    );
  } catch (e) {
    console.error('Failed to load attempts from storage:', e);
    return [];
  }
}

/**
 * Get attempts specifically for a concept.
 */
export function getAttemptsForConcept(conceptId: string): LearnerAttempt[] {
  return getAllAttempts().filter((a) => a.concept_id === conceptId);
}

/**
 * Get attempts specifically for a challenge.
 */
export function getAttemptsForChallenge(challengeId: string): LearnerAttempt[] {
  return getAllAttempts().filter((a) => a.challenge_id === challengeId);
}

/**
 * Calculate the next attempt number for this challenge.
 */
export function getNextAttemptNumber(conceptId: string, challengeId: string): number {
  const existing = getAllAttempts().filter(
    (a) => a.challenge_id === challengeId || a.concept_id === conceptId
  );
  if (existing.length === 0) return 1;
  const maxNumber = Math.max(...existing.map((a) => a.attempt_number || 1));
  return maxNumber + 1;
}

/**
 * Persist an independent attempt to permanent local storage.
 * Enforces all Step 6 STORE schema fields.
 */
export function recordAttempt(attempt: LearnerAttempt): boolean {
  try {
    const existing = getAllAttempts();
    // Duplicate protection: verify attempt_id uniqueness
    if (existing.some((a) => a.attempt_id === attempt.attempt_id)) {
      console.warn('Attempt already recorded with id:', attempt.attempt_id);
      return false;
    }

    const sanitized: LearnerAttempt = {
      ...attempt,
      capability_model_id: attempt.capability_model_id || attempt.concept_id,
      retry_count: attempt.retry_count ?? Math.max(0, (attempt.attempt_number || 1) - 1),
      hint_tier_reached: attempt.hint_tier_reached ?? attempt.hint_tier_used ?? 0,
      hint_tier_used: attempt.hint_tier_reached ?? attempt.hint_tier_used ?? 0,
      solution_revealed: attempt.solution_revealed ?? false,
      evaluation_flag: attempt.evaluation_flag ?? attempt.evaluation_flagged ?? false,
      evaluation_flagged: attempt.evaluation_flag ?? attempt.evaluation_flagged ?? false
    };

    const updated = [sanitized, ...existing];
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Failed to record attempt in local storage:', e);
    return false;
  }
}

/**
 * Persist the active challenge to survive browser refresh without resetting the session.
 */
export function persistActiveChallenge(conceptId: string, challenge: GeneratedChallenge): void {
  try {
    sessionStorage.setItem(
      `${STORAGE_KEYS.ACTIVE_CHALLENGE_PREFIX}${conceptId}`,
      JSON.stringify(challenge)
    );
  } catch (e) {
    console.warn('Could not persist active challenge to session:', e);
  }
}

/**
 * Retrieve the active challenge from session storage.
 */
export function getPersistedActiveChallenge(conceptId: string): GeneratedChallenge | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEYS.ACTIVE_CHALLENGE_PREFIX}${conceptId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export interface AttemptDraftState {
  confidence_before_attempt: number;
  response: string;
  stage: 'confidence' | 'attempt' | 'submitted';
  lastSaved: string;
}

/**
 * Save draft response and confidence state so user work is never lost.
 */
export function saveAttemptDraft(challengeId: string, draft: AttemptDraftState): void {
  try {
    sessionStorage.setItem(`${STORAGE_KEYS.DRAFT_PREFIX}${challengeId}`, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save attempt draft:', e);
  }
}

/**
 * Load draft response and confidence state for a challenge.
 */
export function getAttemptDraft(challengeId: string): AttemptDraftState | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEYS.DRAFT_PREFIX}${challengeId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Clear the draft after submission.
 */
export function clearAttemptDraft(challengeId: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_KEYS.DRAFT_PREFIX}${challengeId}`);
  } catch (e) {
    // ignore
  }
}

/**
 * Attach a fresh evaluation to a recorded attempt.
 * Flattens all Step 6 evaluation fields onto the top-level attempt record.
 */
export function updateAttemptEvaluation(attemptId: string, evaluation: EvaluationResult): boolean {
  try {
    const existing = getAllAttempts();
    const index = existing.findIndex((a) => a.attempt_id === attemptId);
    if (index === -1) {
      console.warn('Attempt not found to update evaluation:', attemptId);
      return false;
    }
    existing[index] = {
      ...existing[index],
      evaluation,
      verdict: evaluation.verdict,
      demonstrated_capabilities: evaluation.demonstrated_capabilities || [],
      missing_capabilities: evaluation.missing_capabilities || [],
      evidence: evaluation.evidence || [],
      evaluator_confidence: evaluation.evaluator_confidence
    };
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error('Failed to update attempt evaluation:', e);
    return false;
  }
}

/**
 * Flag an evaluation for human / instructor review (After Tier 4).
 * Persists the flag with learner rationale.
 */
export function flagAttemptEvaluation(attemptId: string, reason?: string): boolean {
  try {
    const existing = getAllAttempts();
    const index = existing.findIndex((a) => a.attempt_id === attemptId);
    if (index === -1) {
      console.warn('Attempt not found to flag for review:', attemptId);
      return false;
    }
    existing[index] = {
      ...existing[index],
      evaluation_flag: true,
      evaluation_flagged: true,
      flagged_review_reason: reason || 'Learner flagged evaluation for instructor review (After Tier 4).',
      flagged_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error('Failed to flag attempt evaluation:', e);
    return false;
  }
}

/**
 * Update hint tier used and solution revealed status on an attempt.
 */
export function updateAttemptHintInfo(
  attemptId: string,
  hintTier: number,
  solutionRevealed?: boolean
): boolean {
  try {
    const existing = getAllAttempts();
    const index = existing.findIndex((a) => a.attempt_id === attemptId);
    if (index === -1) {
      return false;
    }
    existing[index] = {
      ...existing[index],
      hint_tier_reached: hintTier,
      hint_tier_used: hintTier,
      solution_revealed: solutionRevealed ?? existing[index].solution_revealed
    };
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error('Failed to update attempt hint info:', e);
    return false;
  }
}

/**
 * Clear all attempts from local storage (for testing or reset)
 */
export function clearAllAttempts(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
  } catch (e) {
    console.warn('Failed to clear attempts:', e);
  }
}

/**
 * Seed realistic multi-attempt capability evidence for RICE Prioritization
 * Demonstrates multiple accumulated attempts for the same concept as required by Step 6:
 * - 4 Challenges attempted
 * - Demonstrated: Identifies competing options, Makes defensible trade-offs, Justifies recommendation
 * - Developing: Quantitative reasoning, Handling uncertainty
 * - Confidence before challenge: 5 / 5
 * - Observed outcome: PARTIALLY_CORRECT
 * - Hints used: 2
 */
export function seedSampleEvidenceForRice(): void {
  const learnerId = getOrCreateLearnerId();
  const sessionId = getOrCreateSessionId();
  const conceptId = 'rice-prioritization';
  const capabilityModelId = 'Prioritizing competing initiatives using structured trade-offs.';

  const sampleAttempts: LearnerAttempt[] = [
    {
      learner_id: learnerId,
      concept_id: conceptId,
      capability_model_id: capabilityModelId,
      challenge_id: 'rice-series-b-deadlock',
      attempt_id: `att_seed_rice_4`,
      session_id: sessionId,
      source_type: 'LIBRARY',
      confidence_before_attempt: 5,
      response: `Executive Decision Memo:\n\n1. Option Comparison & Trade-offs:\nWe have two competing strategic paths. Option A (Custom Compliance Webhooks) provides $400k ARR across 2 enterprise deals with high sales optimism, but represents an isolated solution with 2 person-months effort. Option B (Automated Reconciliation Engine) directly attacks our core churn driver affecting 4,200 monthly active accounts.\n\n2. RICE Evaluation:\n- Option A: Reach = 2; Impact = 3 (massive); Confidence = 50% (verbal sales pipeline only); Effort = 2 person-months. Raw score = (2 * 3 * 0.5) / 2 = 1.5\n- Option B: Reach = 4,200; Impact = 1 (moderate); Confidence = 80% (churn exit survey data); Effort = 3 person-months. Raw score = (4200 * 1 * 0.8) / 3 = 1,120\n\n3. Executive Recommendation:\nWe must ship Option B immediately. Building custom webhooks for uncommitted prospects creates bespoke platform debt. Automated reconciliation protects systemic retention and keeps our Series B narrative intact around product-market repeatability. However, we acknowledge lingering variance in churn resolution assumptions.`,
      attempt_number: 4,
      retry_count: 2,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: 'submitted',
      verdict: 'PARTIALLY_CORRECT',
      demonstrated_capabilities: [
        'Identifies competing options',
        'Makes defensible trade-offs',
        'Justifies recommendation'
      ],
      missing_capabilities: [
        'Quantitative reasoning',
        'Handling uncertainty'
      ],
      evidence: [
        'Learner cleanly juxtaposes Option A ($400k ARR, 2 prospects) with Option B (4,200 accounts)',
        'Defends decision against bespoke platform debt and systemic retention risk',
        'Directly articulates executive recommendation: "We must ship Option B immediately"'
      ],
      hint_tier_reached: 2,
      hint_tier_used: 2,
      solution_revealed: false,
      evaluator_confidence: 0.92,
      evaluation_flag: false,
      evaluation_flagged: false,
      evaluation: {
        verdict: 'PARTIALLY_CORRECT',
        demonstrated_capabilities: [
          'Identifies competing options',
          'Makes defensible trade-offs',
          'Justifies recommendation'
        ],
        missing_capabilities: [
          'Quantitative reasoning',
          'Handling uncertainty'
        ],
        evidence: [
          'Learner cleanly juxtaposes Option A ($400k ARR, 2 prospects) with Option B (4,200 accounts)',
          'Defends decision against bespoke platform debt and systemic retention risk',
          'Directly articulates executive recommendation: "We must ship Option B immediately"'
        ],
        brief_feedback: 'Strong strategic framing and qualitative trade-off defense. However, the calculation treats enterprise account units directly against self-serve accounts without a sensitivity threshold or confidence interval for uncertainty.',
        evaluator_confidence: 0.92
      }
    },
    {
      learner_id: learnerId,
      concept_id: conceptId,
      capability_model_id: capabilityModelId,
      challenge_id: 'rice-series-b-deadlock',
      attempt_id: `att_seed_rice_3`,
      session_id: sessionId,
      source_type: 'LIBRARY',
      confidence_before_attempt: 4,
      response: `Revision with Direction guidance:\nComparing the enterprise webhook feature to self-serve reconciliation.\nReach for A is 2 deals; Impact is high; Confidence is discounted to 0.5; Effort is 2.\nReach for B is 4,200 accounts; Impact is 1; Confidence is 0.8; Effort is 3.\n\nOption B offers far greater total retention yield. Even if sales closes one deal, losing 50 self-serve churners per month causes compounding revenue degradation over our 6-week runway.`,
      attempt_number: 3,
      retry_count: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      status: 'submitted',
      verdict: 'PARTIALLY_CORRECT',
      demonstrated_capabilities: [
        'Identifies competing options',
        'Makes defensible trade-offs'
      ],
      missing_capabilities: [
        'Quantitative reasoning',
        'Handling uncertainty',
        'Justifies recommendation'
      ],
      evidence: [
        'Juxtaposed enterprise webhooks against self-serve accounts',
        'Analyzed compounding retention degradation against 6-week runway'
      ],
      hint_tier_reached: 2,
      hint_tier_used: 2,
      solution_revealed: false,
      evaluator_confidence: 0.88,
      evaluation_flag: false,
      evaluation: {
        verdict: 'PARTIALLY_CORRECT',
        demonstrated_capabilities: [
          'Identifies competing options',
          'Makes defensible trade-offs'
        ],
        missing_capabilities: [
          'Quantitative reasoning',
          'Handling uncertainty',
          'Justifies recommendation'
        ],
        evidence: [
          'Juxtaposed enterprise webhooks against self-serve accounts',
          'Analyzed compounding retention degradation against 6-week runway'
        ],
        brief_feedback: 'Progressing well on trade-off synthesis; need an explicit executive call and quantitative reconciliation.',
        evaluator_confidence: 0.88
      }
    },
    {
      learner_id: learnerId,
      concept_id: conceptId,
      capability_model_id: capabilityModelId,
      challenge_id: 'rice-series-b-deadlock',
      attempt_id: `att_seed_rice_2`,
      session_id: sessionId,
      source_type: 'LIBRARY',
      confidence_before_attempt: 4,
      response: `Reviewing feature A vs feature B.\nFeature A score: (2 * 3 * 0.5) / 2 = 1.5\nFeature B score: (4200 * 1 * 0.8) / 3 = 1120\nFeature B has a way higher score so we should do feature B.`,
      attempt_number: 2,
      retry_count: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      status: 'submitted',
      verdict: 'PARTIALLY_CORRECT',
      demonstrated_capabilities: [
        'Identifies competing options'
      ],
      missing_capabilities: [
        'Quantitative reasoning',
        'Handling uncertainty',
        'Makes defensible trade-offs',
        'Justifies recommendation'
      ],
      evidence: [
        'Calculated raw RICE scores for feature A and B'
      ],
      hint_tier_reached: 1,
      hint_tier_used: 1,
      solution_revealed: false,
      evaluator_confidence: 0.85,
      evaluation_flag: false,
      evaluation: {
        verdict: 'PARTIALLY_CORRECT',
        demonstrated_capabilities: [
          'Identifies competing options'
        ],
        missing_capabilities: [
          'Quantitative reasoning',
          'Handling uncertainty',
          'Makes defensible trade-offs',
          'Justifies recommendation'
        ],
        evidence: [
          'Calculated raw RICE scores for feature A and B'
        ],
        brief_feedback: 'Identified the two options, but calculation directly equates prospect accounts with end users without analyzing the unit mismatch.',
        evaluator_confidence: 0.85
      }
    },
    {
      learner_id: learnerId,
      concept_id: conceptId,
      capability_model_id: capabilityModelId,
      challenge_id: 'rice-enterprise-prioritization-matrix',
      attempt_id: `att_seed_rice_1`,
      session_id: sessionId,
      source_type: 'LIBRARY',
      confidence_before_attempt: 5,
      response: `I would tell the VP of Sales that we cannot build custom webhooks because we only have 6 weeks of runway. We need to prioritize self-serve users because there are 4,200 of them.`,
      attempt_number: 1,
      retry_count: 0,
      created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      status: 'submitted',
      verdict: 'WRONG_APPROACH',
      demonstrated_capabilities: [
        'Identifies competing options'
      ],
      missing_capabilities: [
        'Quantitative reasoning',
        'Handling uncertainty',
        'Makes defensible trade-offs',
        'Justifies recommendation'
      ],
      evidence: [
        'Mentioned runway constraint and the two competing teams'
      ],
      hint_tier_reached: 0,
      hint_tier_used: 0,
      solution_revealed: false,
      evaluator_confidence: 0.9,
      evaluation_flag: false,
      evaluation: {
        verdict: 'WRONG_APPROACH',
        demonstrated_capabilities: [
          'Identifies competing options'
        ],
        missing_capabilities: [
          'Quantitative reasoning',
          'Handling uncertainty',
          'Makes defensible trade-offs',
          'Justifies recommendation'
        ],
        evidence: [
          'Mentioned runway constraint and the two competing teams'
        ],
        brief_feedback: 'Unsupported intuition. Did not calculate RICE scores, evaluate sales confidence discount, or provide defensible trade-off analysis.',
        evaluator_confidence: 0.9
      }
    }
  ];

  try {
    const existing = getAllAttempts();
    // Keep attempts from other concepts, replace any previous seed attempts
    const otherConcepts = existing.filter((a) => a.concept_id !== conceptId);
    const combined = [...sampleAttempts, ...otherConcepts];
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(combined));
  } catch (e) {
    console.error('Failed to seed sample evidence:', e);
  }
}

