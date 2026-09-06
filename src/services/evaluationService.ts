import {
  EvaluationResult,
  GeneratedChallenge,
  Concept,
  LearnerAttempt,
  ChallengeSourceType
} from '../types';
import { validateEvaluationResult } from '../utils/evaluationValidator';

export interface EvaluateAttemptRequest {
  challenge: GeneratedChallenge;
  concept: Concept;
  attempt: LearnerAttempt;
  sourceType?: ChallengeSourceType;
}

export interface EvaluateAttemptResponse {
  success: boolean;
  evaluation?: EvaluationResult;
  error?: string;
  source?: 'gemini' | 'heuristic-evaluator' | 'quarantine';
}

/**
 * Sends a learner attempt to the ForgeMind Evidence Evaluation Engine.
 * Every attempt receives a fresh evaluation.
 */
export async function evaluateLearnerAttempt(
  reqData: EvaluateAttemptRequest
): Promise<EvaluateAttemptResponse> {
  try {
    const response = await fetch('/api/evaluate-attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        challenge: reqData.challenge,
        concept: reqData.concept,
        attempt: reqData.attempt,
        sourceType: reqData.sourceType || reqData.challenge.sourceType || 'LIBRARY'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Evaluation service responded with status ${response.status}`
      };
    }

    const data = await response.json();
    const evaluation = data.evaluation;

    // Client-side schema validation check before displaying to UI
    const validation = validateEvaluationResult(evaluation);
    if (!validation.isValid || !validation.sanitized) {
      console.error('Received evaluation failed schema validation:', validation.errors);
      return {
        success: false,
        error: `Evaluation validation failed: ${validation.errors.join(', ')}`
      };
    }

    return {
      success: true,
      evaluation: validation.sanitized,
      source: data.source || 'gemini'
    };
  } catch (err: any) {
    console.error('Error invoking evaluation engine:', err);
    return {
      success: false,
      error: err.message || 'Failed to connect to the evaluation service.'
    };
  }
}
