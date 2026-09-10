import { EvaluationVerdict, EvaluationResult, ChallengeHintState } from '../types';

export interface AssessmentStateTransition {
  nextAttemptCount: number;
  nextCurrentTier: number;
  freezeState: boolean; // True for NEEDS_CLARIFICATION or CORRECT
  isTerminalMastery: boolean;
  inputsEditable: boolean;
  alertType: 'mastery' | 'diagnostic' | 'clarification_reprompt' | null;
  alertMessage: string;
}

/**
 * Standardized ForgeMind Assessment State Machine Response Mapping
 * Aligned strictly with PRD v4.1 (Sections 6.3.3, 6.3.4, 8, and 12.1).
 *
 * State Machine Rules:
 * 1. CORRECT:
 *    - Freeze inputs (textarea disabled)
 *    - Hide submit action
 *    - Display "Autonomous Mastery Achieved" terminal completion card
 *    - Set right rail to show verified completion without locked hint cards
 * 2. PARTIALLY_CORRECT or WRONG_APPROACH:
 *    - Retain all typed answers in the inputs for user revision
 *    - Increment attemptCount by exactly 1
 *    - Increment currentTier by exactly 1 (Math.min(prev + 1, 5))
 *    - Render targeted diagnostic feedback showing missing milestones
 *    - Auto-expand newly unlocked hint tier in the right rail
 * 3. NEEDS_CLARIFICATION:
 *    - Freeze state completely: DO NOT increment attemptCount; DO NOT increment currentTier; DO NOT unlock new hints
 *    - Render clear, non-punitive re-prompt alert: "Your submission could not be evaluated as a concrete attempt. Please provide an actionable rationale to receive targeted feedback."
 *    - Keep inputs fully editable
 */
export function computeAssessmentStateTransition(
  verdict: EvaluationVerdict,
  currentAttemptCount: number,
  currentHintState: ChallengeHintState
): AssessmentStateTransition {
  const currentTier = currentHintState.current_tier;

  switch (verdict) {
    case 'CORRECT':
      return {
        nextAttemptCount: currentAttemptCount + 1,
        nextCurrentTier: currentTier,
        freezeState: true,
        isTerminalMastery: true,
        inputsEditable: false,
        alertType: 'mastery',
        alertMessage: 'Autonomous Mastery Achieved: Verified capability demonstrated without hint assistance.'
      };

    case 'PARTIALLY_CORRECT':
      return {
        nextAttemptCount: currentAttemptCount + 1,
        nextCurrentTier: Math.min(5, currentTier + 1),
        freezeState: false,
        isTerminalMastery: false,
        inputsEditable: true,
        alertType: 'diagnostic',
        alertMessage: 'Partially Correct: Meaningful progress demonstrated. Review diagnostic gaps and revise your submission.'
      };

    case 'WRONG_APPROACH':
      return {
        nextAttemptCount: currentAttemptCount + 1,
        nextCurrentTier: Math.min(5, currentTier + 1),
        freezeState: false,
        isTerminalMastery: false,
        inputsEditable: true,
        alertType: 'diagnostic',
        alertMessage: 'Wrong Approach: Conceptual divergence detected. Review structural milestones and revise your formulation.'
      };

    case 'NEEDS_CLARIFICATION':
    default:
      return {
        nextAttemptCount: currentAttemptCount, // FREEZE: DO NOT INCREMENT
        nextCurrentTier: currentTier,          // FREEZE: DO NOT INCREMENT
        freezeState: true,                      // FREEZE HINT PROGRESSION
        isTerminalMastery: false,
        inputsEditable: true,                   // INPUTS REMAIN FULLY EDITABLE
        alertType: 'clarification_reprompt',
        alertMessage: 'Your submission could not be evaluated as a concrete attempt. Please provide an actionable rationale to receive targeted feedback.'
      };
  }
}
