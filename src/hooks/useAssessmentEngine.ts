'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GeneratedChallenge,
  Concept,
  EvaluationResult,
  LearnerAttempt,
  ChallengeHintState,
  ChallengeSourceType
} from '../types';
import { isSubstantiveInput } from '../utils/sanitizer';
import {
  getOrCreateLearnerId,
  getOrCreateSessionId,
  getNextAttemptNumber,
  recordAttempt,
  updateAttemptEvaluation,
  updateAttemptHintInfo,
  saveAttemptDraft,
  getAttemptDraft,
  clearAttemptDraft,
  getAttemptsForChallenge
} from '../services/attemptService';
import {
  getHintState,
  resetHintState,
  requestHintTier,
  recordAttemptEvaluationInHintState,
  flagEvaluationOverride
} from '../services/hintService';
import { evaluateLearnerAttempt } from '../services/evaluationService';

interface UseAssessmentEngineProps {
  concept: Concept;
  challenge: GeneratedChallenge | null;
  sourceType?: ChallengeSourceType;
}

export function useAssessmentEngine({
  concept,
  challenge,
  sourceType
}: UseAssessmentEngineProps) {
  // Workflow Stage: 'confidence' -> 'attempt' -> 'submitted'
  const [stage, setStage] = useState<'confidence' | 'attempt' | 'submitted'>('confidence');
  const [confidenceBeforeAttempt, setConfidenceBeforeAttempt] = useState<number>(3);
  
  // Step Deck Workspace States
  const [microAnswers, setMicroAnswers] = useState<Record<number, string>>({});
  const [activeStep, setActiveStep] = useState<number>(0);
  const [viewAllMilestones, setViewAllMilestones] = useState<boolean>(false);
  const [response, setResponse] = useState<string>('');
  const [draftSavedTimestamp, setDraftSavedTimestamp] = useState<string | null>(null);

  // Status & Validation Flags
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Evaluation Engine States
  const [submittedAttempt, setSubmittedAttempt] = useState<LearnerAttempt | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // Progressive Hint Ladder State (Scoped strictly to challenge.id)
  const [hintState, setHintState] = useState<ChallengeHintState>(() => {
    if (!challenge) {
      return {
        challenge_id: '',
        concept_id: concept.id,
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
    const attempts = getAttemptsForChallenge(challenge.id);
    return attempts.length === 0
      ? resetHintState(challenge.id, concept.id)
      : getHintState(challenge.id, concept.id);
  });

  const [isRequestingHint, setIsRequestingHint] = useState<boolean>(false);
  const [isOverrideRevealed, setIsOverrideRevealed] = useState<boolean>(false);

  // LIFECYCLE ISOLATION: Flush state completely whenever challenge.id or concept.id changes
  useEffect(() => {
    setActiveStep(0);
    setMicroAnswers({});
    setResponse('');
    setStage('confidence');
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setValidationError(null);
    setViewAllMilestones(false);
    setIsOverrideRevealed(false);

    if (!challenge) return;

    // Check existing attempts for this challenge in the current session
    const attempts = getAttemptsForChallenge(challenge.id);
    const initialHintState =
      attempts.length === 0
        ? resetHintState(challenge.id, concept.id)
        : getHintState(challenge.id, concept.id);

    setHintState(initialHintState);

    // Restore active draft if available
    const draft = getAttemptDraft(challenge.id);
    if (draft) {
      setConfidenceBeforeAttempt(draft.confidence_before_attempt || 3);
      setResponse(draft.response || '');
      setStage(draft.stage || 'confidence');
      if (draft.microAnswers) {
        setMicroAnswers(draft.microAnswers);
      }
      if (draft.lastSaved) {
        setDraftSavedTimestamp(draft.lastSaved);
      }
    }
  }, [challenge?.id, concept.id]);

  // Handle micro-answer changes per step
  const handleMicroAnswerChange = useCallback(
    (stepIndex: number, val: string) => {
      setMicroAnswers((prev) => {
        const updated = { ...prev, [stepIndex]: val };
        if (validationError) setValidationError(null);

        const milestones = challenge?.structuralMilestones || concept.reasoningMilestones || [];
        const questions = challenge?.microQuestions || milestones.map((m) => `Target Step: ${m}`);

        const combinedText = milestones
          .map((m, idx) => {
            const q = questions[idx] || m;
            const ans = (updated[idx] || '').trim();
            return `STEP ${idx + 1}: ${m}\nQUESTION: ${q}\nRESPONSE: ${ans}`;
          })
          .join('\n\n');

        setResponse(combinedText);

        if (challenge) {
          saveAttemptDraft(challenge.id, {
            confidence_before_attempt: confidenceBeforeAttempt,
            response: combinedText,
            stage: 'attempt',
            microAnswers: updated,
            lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }

        return updated;
      });
    },
    [challenge, concept, confidenceBeforeAttempt, validationError]
  );

  // Transition from Confidence Gate to Independent Attempt
  const handleStartIndependentAttempt = useCallback(() => {
    setStage('attempt');
    setActiveStep(0);
    if (challenge) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      saveAttemptDraft(challenge.id, {
        confidence_before_attempt: confidenceBeforeAttempt,
        response,
        stage: 'attempt',
        microAnswers,
        lastSaved: now
      });
      setDraftSavedTimestamp(now);
    }
  }, [challenge, confidenceBeforeAttempt, response, microAnswers]);

  // Submit attempt with strict client heuristics and duplicate protection
  const handleSubmitAttempt = useCallback(async () => {
    if (!challenge || isSubmitting) return;

    const milestones = challenge.structuralMilestones || concept.reasoningMilestones || [];
    const questions = challenge.microQuestions || milestones.map((m) => `Target Step: ${m}`);

    // Client-Side Input Quality Heuristic Check
    const invalidStepDetails: { stepNum: number; reason: string }[] = [];
    milestones.forEach((_, idx) => {
      const text = (microAnswers[idx] || '').trim();
      const check = isSubstantiveInput(text);
      if (!check.valid) {
        invalidStepDetails.push({
          stepNum: idx + 1,
          reason: check.reason || 'Please provide a substantive answer addressing the milestone.'
        });
      }
    });

    if (invalidStepDetails.length > 0) {
      const stepList = invalidStepDetails.map((s) => `Step ${s.stepNum}`).join(', ');
      setValidationError(
        `Please provide a substantive answer (at least 4 characters, not repetitive letters or filler text) for all steps (${stepList}).`
      );
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const learnerId = getOrCreateLearnerId();
      const sessionId = getOrCreateSessionId();
      const attemptNumber = getNextAttemptNumber(concept.id, challenge.id);
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = new Date().toISOString();

      const microResponsesPayload = milestones.map((m, idx) => ({
        milestone: m,
        question: questions[idx] || m,
        answer: (microAnswers[idx] || '').trim()
      }));

      const finalResponseText =
        response.trim() ||
        microResponsesPayload
          .map((mr, i) => `STEP ${i + 1}: ${mr.milestone}\nANSWER: ${mr.answer}`)
          .join('\n\n');

      const newAttempt: LearnerAttempt = {
        attempt_id: attemptId,
        session_id: sessionId,
        learner_id: learnerId,
        concept_id: concept.id,
        capability_model_id: concept.underlyingSkill || concept.id,
        challenge_id: challenge.id,
        source_type: challenge.sourceType || sourceType || 'LIBRARY',
        confidence_before_attempt: confidenceBeforeAttempt,
        response: finalResponseText,
        micro_responses: microResponsesPayload,
        attempt_number: attemptNumber,
        retry_count: Math.max(0, attemptNumber - 1),
        created_at: createdAt,
        status: 'submitted',
        hint_tier_reached: hintState.current_tier,
        hint_tier_used: hintState.current_tier,
        solution_revealed: hintState.solution_revealed,
        evaluation_flag: hintState.evaluation_flagged,
        evaluation_flagged: hintState.evaluation_flagged
      };

      const recorded = recordAttempt(newAttempt);
      if (recorded) {
        clearAttemptDraft(challenge.id);
        setSubmittedAttempt(newAttempt);
        setStage('submitted');
        setEvaluationResult(null);
        setEvaluationError(null);
        setIsEvaluating(true);

        const res = await evaluateLearnerAttempt({
          challenge,
          concept,
          attempt: newAttempt,
          sourceType: challenge.sourceType || sourceType
        });

        if (res.success && res.evaluation) {
          setEvaluationResult(res.evaluation);
          setSubmittedAttempt((prev) =>
            prev ? { ...prev, verdict: res.evaluation!.verdict, evaluation: res.evaluation } : prev
          );
          updateAttemptEvaluation(newAttempt.attempt_id, res.evaluation);

          // Update hint progression state machine
          const updatedState = recordAttemptEvaluationInHintState(
            challenge.id,
            concept.id,
            attemptNumber,
            res.evaluation.verdict
          );
          setHintState(updatedState);
        } else {
          setEvaluationError(res.error || 'Evaluation could not be completed.');
        }
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setValidationError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  }, [
    challenge,
    concept,
    isSubmitting,
    microAnswers,
    response,
    sourceType,
    confidenceBeforeAttempt,
    hintState
  ]);

  // Request next hint tier (pre-baked, zero LLM live calls)
  const handleRequestHint = useCallback(
    async (targetTier: number) => {
      if (!challenge || isRequestingHint) return;
      setIsRequestingHint(true);
      try {
        const result = await requestHintTier(
          challenge,
          targetTier,
          evaluationResult?.verdict || null,
          submittedAttempt?.attempt_number || 1,
          submittedAttempt?.attempt_id
        );
        if (result.success) {
          setHintState(result.state);
          if (submittedAttempt) {
            updateAttemptHintInfo(
              submittedAttempt.attempt_id,
              result.state.current_tier,
              result.state.solution_revealed
            );
          }
        } else {
          alert(result.error || 'Unable to unlock hint.');
        }
      } catch (err: any) {
        console.error('Error requesting hint:', err);
      } finally {
        setIsRequestingHint(false);
      }
    },
    [challenge, isRequestingHint, evaluationResult, submittedAttempt]
  );

  // Retry attempt on the same challenge while PRESERVING unlocked hints
  const handleRetryAttempt = useCallback(() => {
    setActiveStep(0);
    setResponse('');
    setMicroAnswers({});
    setStage('attempt');
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setValidationError(null);
    setIsEvaluating(false);
    setIsSubmitting(false);
    setIsOverrideRevealed(false);

    if (challenge) {
      setHintState(getHintState(challenge.id, concept.id));
    }
  }, [challenge, concept.id]);

  // Flag evaluation review (Tier-4 Override)
  const handleFlagReview = useCallback(
    async (reason: string) => {
      if (!challenge || !submittedAttempt) return;
      const result = await flagEvaluationOverride(
        challenge.id,
        concept.id,
        submittedAttempt.attempt_id,
        reason
      );
      if (result.success) {
        setHintState(result.state);
        setSubmittedAttempt({
          ...submittedAttempt,
          evaluation_flagged: true,
          flagged_review_reason: result.state.flagged_review_reason,
          flagged_at: result.state.flagged_at
        });
      }
    },
    [challenge, concept.id, submittedAttempt]
  );

  return {
    stage,
    setStage,
    confidenceBeforeAttempt,
    setConfidenceBeforeAttempt,
    microAnswers,
    activeStep,
    setActiveStep,
    viewAllMilestones,
    setViewAllMilestones,
    response,
    draftSavedTimestamp,
    isSubmitting,
    validationError,
    submittedAttempt,
    evaluationResult,
    isEvaluating,
    evaluationError,
    hintState,
    isRequestingHint,
    isOverrideRevealed,
    setIsOverrideRevealed,
    handleMicroAnswerChange,
    handleStartIndependentAttempt,
    handleSubmitAttempt,
    handleRequestHint,
    handleRetryAttempt,
    handleFlagReview
  };
}
