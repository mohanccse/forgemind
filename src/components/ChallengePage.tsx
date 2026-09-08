'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Lock,
  Sparkles,
  CheckCircle2,
  Code2,
  FileText,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Save,
  Send,
  Bold,
  Italic,
  List,
  ListOrdered,
  Terminal,
  ShieldCheck,
  Clock,
  UserCheck,
  Eye,
  Edit3,
  Award,
  HelpCircle,
  AlertOctagon,
  Quote,
  Check,
  ChevronRight,
  ChevronLeft,
  Layers,
  ListChecks
} from 'lucide-react';
import { isSubstantiveInput } from '../utils/sanitizer';
import {
  Concept,
  ViewTab,
  GeneratedChallenge,
  LearnerAttempt,
  ChallengeSourceType,
  EvaluationResult,
  EvaluationVerdict,
  ChallengeHintState
} from '../types';
import { generateNovelChallenge } from '../services/challengeService';
import { getCuratedNovelChallenge } from '../data/curatedNovelChallenges';
import { evaluateLearnerAttempt } from '../services/evaluationService';
import {
  getOrCreateLearnerId,
  getOrCreateSessionId,
  getNextAttemptNumber,
  recordAttempt,
  updateAttemptEvaluation,
  updateAttemptHintInfo,
  persistActiveChallenge,
  getPersistedActiveChallenge,
  clearPersistedActiveChallenge,
  saveAttemptDraft,
  getAttemptDraft,
  clearAttemptDraft,
  getAllAttempts,
  getAttemptsForChallenge
} from '../services/attemptService';
import {
  getHintState,
  resetHintState,
  resetHintStateForConcept,
  requestHintTier,
  recordAttemptEvaluationInHintState,
  flagEvaluationOverride
} from '../services/hintService';
import { HintLadder } from './HintLadder';
import { ActiveHintsDrawer } from './ActiveHintsDrawer';
import { HintLadderRail } from './HintLadderRail';
import { AssessmentView } from './assessment/AssessmentView';

interface ChallengePageProps {
  concept: Concept;
  onBackToProve: () => void;
  onNavigate: (tab: ViewTab) => void;
}

const MAX_RESPONSE_LENGTH = 2000;

export const ChallengePage: React.FC<ChallengePageProps> = ({
  concept,
  onBackToProve,
  onNavigate
}) => {
  // Challenge State
  const [challenge, setChallenge] = useState<GeneratedChallenge | null>(() => {
    return getPersistedActiveChallenge(concept.id);
  });
  const [isLoading, setIsLoading] = useState<boolean>(!getPersistedActiveChallenge(concept.id));
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<string | null>(null);

  // Workflow Stage: 'confidence' -> 'attempt' -> 'submitted'
  const [stage, setStage] = useState<'confidence' | 'attempt' | 'submitted'>('confidence');

  // Attempt States
  const [confidenceBeforeAttempt, setConfidenceBeforeAttempt] = useState<number>(3);
  const [response, setResponse] = useState<string>('');
  const [microAnswers, setMicroAnswers] = useState<Record<number, string>>({});
  const [activeMilestoneStep, setActiveMilestoneStep] = useState<number>(0);
  const [viewAllMilestones, setViewAllMilestones] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftSavedTimestamp, setDraftSavedTimestamp] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<LearnerAttempt | null>(null);
  const [editorMode, setEditorMode] = useState<'text' | 'code'>(
    concept.domain === 'SQL / Data' ? 'code' : 'text'
  );
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write');

  // Evaluation States (Step 4: Evidence Evaluation Engine)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Progressive Hint Ladder States (Step 5)
  const [hintState, setHintState] = useState<ChallengeHintState>(() => {
    const existing = challenge ? getHintState(challenge.id, concept.id) : null;
    return (
      existing || {
        challenge_id: challenge?.id || '',
        concept_id: concept.id,
        current_tier: 0,
        unlocked_tiers: [],
        last_unlocked_at_attempt: 0,
        attempts_since_last_hint: 0,
        progression_frozen: false,
        solution_revealed: false,
        evaluation_flagged: false
      }
    );
  });
  const [isRequestingHint, setIsRequestingHint] = useState<boolean>(false);
  const [isOverrideRevealed, setIsOverrideRevealed] = useState<boolean>(false);

  // Textarea ref for rich formatting insertion
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleBackToProve = () => {
    if (concept) {
      clearPersistedActiveChallenge(concept.id);
      resetHintStateForConcept(concept.id);
      clearAttemptDraft(concept.id);
    }
    onBackToProve();
  };

  // Load or restore challenge and attempt state on mount or concept change
  useEffect(() => {
    let isMounted = true;

    // Reset step index and transient attempt/evaluation state on concept change
    setActiveMilestoneStep(0);
    setMicroAnswers({});
    setResponse('');
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setValidationError(null);
    setViewAllMilestones(false);
    setIsOverrideRevealed(false);

    async function initChallenge() {
      // 1. Check if we already have an active challenge stored in session for this concept
      const existingChallenge = getPersistedActiveChallenge(concept.id);

      if (existingChallenge) {
        if (!isMounted) return;
        setChallenge(existingChallenge);
        const attempts = getAttemptsForChallenge(existingChallenge.id);
        const initialHintState = attempts.length === 0
          ? resetHintState(existingChallenge.id, concept.id)
          : getHintState(existingChallenge.id, concept.id);
        setHintState(initialHintState);
        setGenerationSource(
          existingChallenge.sourceType === 'USER_GENERATED'
            ? 'user-generated'
            : 'persisted-session'
        );
        setIsLoading(false);

        // Check if there is an existing draft for this challenge
        const draft = getAttemptDraft(existingChallenge.id);
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
        } else {
          setStage('confidence');
          setResponse('');
          setMicroAnswers({});
        }
        return;
      }

      // 2. Otherwise generate novel challenge
      setIsLoading(true);
      setGenerationError(null);

      const effectiveSource = concept.sourceType || 'LIBRARY';
      const result = await generateNovelChallenge(concept, concept.approximateDifficulty, effectiveSource);

      if (!isMounted) return;

      if (result.success && result.challenge) {
        const loadedChallenge = result.challenge;
        setChallenge(loadedChallenge);
        const attempts = getAttemptsForChallenge(loadedChallenge.id);
        const initialHintState = attempts.length === 0
          ? resetHintState(loadedChallenge.id, concept.id)
          : getHintState(loadedChallenge.id, concept.id);
        setHintState(initialHintState);
        setGenerationSource(result.source || 'gemini');
        persistActiveChallenge(concept.id, loadedChallenge);

        // Check draft
        const draft = getAttemptDraft(loadedChallenge.id);
        if (draft) {
          setConfidenceBeforeAttempt(draft.confidence_before_attempt || 3);
          setResponse(draft.response || '');
          setStage(draft.stage || 'confidence');
          if (draft.microAnswers) {
            setMicroAnswers(draft.microAnswers);
          }
        } else {
          setStage('confidence');
          setResponse('');
          setMicroAnswers({});
        }

        setIsLoading(false);
      } else {
        setGenerationError(result.error || 'Failed to generate a novel challenge.');
        setIsLoading(false);
      }
    }

    initChallenge();

    return () => {
      isMounted = false;
    };
  }, [concept.id]);

  // Handle manual re-generation
  const handleRegenerateChallenge = async () => {
    setIsLoading(true);
    setGenerationError(null);
    setStage('confidence');
    setResponse('');
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setIsEvaluating(false);

    const effectiveSource = concept.sourceType || 'LIBRARY';
    const result = await generateNovelChallenge(concept, concept.approximateDifficulty, effectiveSource);
    if (result.success && result.challenge) {
      setChallenge(result.challenge);
      setHintState(getHintState(result.challenge.id, concept.id));
      setGenerationSource(result.source || 'gemini');
      persistActiveChallenge(concept.id, result.challenge);
      clearAttemptDraft(result.challenge.id);
      setIsLoading(false);
    } else {
      setGenerationError(result.error || 'Failed to generate a novel challenge.');
      setIsLoading(false);
    }
  };

  const handleLoadCuratedBaseline = () => {
    const curated = getCuratedNovelChallenge(concept.id);
    if (curated) {
      const challengeWithSource: GeneratedChallenge = {
        ...curated,
        sourceType: 'LIBRARY'
      };
      setChallenge(challengeWithSource);
      setHintState(getHintState(challengeWithSource.id, concept.id));
      setGenerationSource('curated-baseline');
      persistActiveChallenge(concept.id, challengeWithSource);
      setGenerationError(null);
      setStage('confidence');
      setResponse('');
      setSubmittedAttempt(null);
      setEvaluationResult(null);
      setEvaluationError(null);
      setIsEvaluating(false);
      setIsLoading(false);
    }
  };

  // Transition from Confidence Gate to Independent Attempt
  const handleStartIndependentAttempt = () => {
    setStage('attempt');
    if (challenge) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      saveAttemptDraft(challenge.id, {
        confidence_before_attempt: confidenceBeforeAttempt,
        response,
        stage: 'attempt',
        lastSaved: now
      });
      setDraftSavedTimestamp(now);
    }
  };

  // Response change with 2,000 char limit enforcement
  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_RESPONSE_LENGTH) {
      setResponse(text);
      if (challenge) {
        saveAttemptDraft(challenge.id, {
          confidence_before_attempt: confidenceBeforeAttempt,
          response: text,
          stage: 'attempt',
          lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }
  };

  // Micro-response change handler per milestone
  const handleMicroAnswerChange = (index: number, val: string) => {
    const updated = { ...microAnswers, [index]: val };
    setMicroAnswers(updated);
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
  };

  // Explicit Save Draft Button
  const handleSaveDraft = () => {
    if (!challenge) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    saveAttemptDraft(challenge.id, {
      confidence_before_attempt: confidenceBeforeAttempt,
      response,
      stage: 'attempt',
      microAnswers,
      lastSaved: now
    });
    setDraftSavedTimestamp(now);
  };

  // Submit Attempt with Duplicate Protection and Validation Checks
  const handleSubmitAttempt = () => {
    if (!challenge || isSubmitting) return;

    const milestones = challenge.structuralMilestones || concept.reasoningMilestones || [];
    const questions = challenge.microQuestions || milestones.map((m) => `Target Step: ${m}`);

    // Check if any milestone steps have non-substantive answers (too short, repeated single chars, or keyboard mash)
    const invalidStepDetails: { stepNum: number; reason: string }[] = [];
    milestones.forEach((_, idx) => {
      const text = (microAnswers[idx] || '').trim();
      const check = isSubstantiveInput(text);
      if (!check.valid) {
        invalidStepDetails.push({
          stepNum: idx + 1,
          reason: check.reason || 'Please provide a substantive answer (at least 4 characters, not repetitive letters).'
        });
      }
    });

    if (invalidStepDetails.length > 0) {
      const stepList = invalidStepDetails.map((s) => `Step ${s.stepNum}`).join(', ');
      setValidationError(
        `Please provide a substantive answer (at least 4 characters, not repetitive letters) for all steps (${stepList}).`
      );
      return;
    }

    setValidationError(null);

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

    if (finalResponseText.trim().length === 0 || finalResponseText.length > MAX_RESPONSE_LENGTH) {
      setValidationError('Your response is empty or exceeds the character limit.');
      return;
    }

    // Duplicate Protection: immediately disable and lock
    setIsSubmitting(true);

    try {
      const learnerId = getOrCreateLearnerId();
      const sessionId = getOrCreateSessionId();
      const attemptNumber = getNextAttemptNumber(concept.id, challenge.id);
      const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = new Date().toISOString();

      const newAttempt: LearnerAttempt = {
        attempt_id: attemptId,
        session_id: sessionId,
        learner_id: learnerId,
        concept_id: concept.id,
        capability_model_id: concept.underlyingSkill || concept.id,
        challenge_id: challenge.id,
        source_type: challenge.sourceType || 'LIBRARY',
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
        evaluation_flagged: hintState.evaluation_flagged,
        flagged_review_reason: hintState.flagged_review_reason,
        flagged_at: hintState.flagged_at
      };

      const recorded = recordAttempt(newAttempt);
      if (recorded) {
        // Clear active draft after successful submission
        clearAttemptDraft(challenge.id);
        setSubmittedAttempt(newAttempt);
        setStage('submitted');
        setEvaluationResult(null);
        setEvaluationError(null);
        setIsEvaluating(true);

        // Fresh evaluation: Every submitted attempt receives an independent fresh evaluation
        evaluateLearnerAttempt({
          challenge,
          concept,
          attempt: newAttempt,
          sourceType: challenge.sourceType
        })
          .then((res) => {
            if (res.success && res.evaluation) {
              setEvaluationResult(res.evaluation);
              setSubmittedAttempt((prev) =>
                prev
                  ? {
                      ...prev,
                      verdict: res.evaluation!.verdict,
                      evaluation: res.evaluation
                    }
                  : prev
              );
              updateAttemptEvaluation(newAttempt.attempt_id, res.evaluation);

              // Update hint progression state based on verdict
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
          })
          .catch((err) => {
            setEvaluationError(err.message || 'Evaluation service error.');
          })
          .finally(() => {
            setIsEvaluating(false);
          });
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setValidationError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-run a fresh evaluation for the submitted attempt if desired
  const handleRerunEvaluation = async () => {
    if (!challenge || !submittedAttempt || isEvaluating) return;
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      const res = await evaluateLearnerAttempt({
        challenge,
        concept,
        attempt: submittedAttempt,
        sourceType: challenge.sourceType
      });
      if (res.success && res.evaluation) {
        setEvaluationResult(res.evaluation);
        setSubmittedAttempt((prev) =>
          prev
            ? {
                ...prev,
                verdict: res.evaluation!.verdict,
                evaluation: res.evaluation
              }
            : prev
        );
        updateAttemptEvaluation(submittedAttempt.attempt_id, res.evaluation);

        // Update hint progression state based on fresh verdict
        const updatedState = recordAttemptEvaluationInHintState(
          challenge.id,
          concept.id,
          submittedAttempt.attempt_number,
          res.evaluation.verdict
        );
        setHintState(updatedState);
      } else {
        setEvaluationError(res.error || 'Evaluation could not be completed.');
      }
    } catch (err: any) {
      setEvaluationError(err.message || 'Evaluation service error.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Progressive Hint Ladder: Request Next Hint Tier
  const handleRequestHint = async (targetTier: number) => {
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
  };

  // Progressive Hint Ladder: Retry Challenge with Current Unlocked Hints
  const handleRetryWithHints = () => {
    setActiveMilestoneStep(0);
    setStage('attempt');
    if (!response && submittedAttempt) {
      setResponse(submittedAttempt.response);
    }
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setValidationError(null);
    setIsEvaluating(false);
    setIsSubmitting(false);
    if (challenge) {
      setHintState(getHintState(challenge.id, concept.id));
    }
  };

  // Evaluation Override: Flag Evaluation / Request Review (After Tier 4)
  const handleFlagReview = async (reason: string) => {
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
  };

  // Reset to attempt again while PRESERVING unlocked hint state
  const handleMakeAnotherAttempt = () => {
    setActiveMilestoneStep(0);
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
  };

  const confidenceOptions = [
    { value: 1, label: '1 — Not confident', desc: 'Little to no certainty on independent derivation' },
    { value: 2, label: '2', desc: 'Vague recall of general mechanics' },
    { value: 3, label: '3', desc: 'Moderate confidence; understand principles' },
    { value: 4, label: '4', desc: 'High confidence; can navigate constraints' },
    { value: 5, label: '5 — Very confident', desc: 'Mastery certainty; ready for edge cases' }
  ];

  return (
    <div id="challenge-page" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Navigation & Status Bar (shown during loading or error before AssessmentView mounts) */}
      {(isLoading || (generationError && !challenge)) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <button
              id="back-to-prove-btn"
              onClick={handleBackToProve}
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

            <span className="text-xs text-zinc-500 hidden md:inline">
              Domain: <strong className="text-zinc-400 font-normal">{concept.domain}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#0e0f14]/80 p-12 text-center shadow-xl">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-400" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-4 w-4 text-amber-300 animate-pulse" />
          </div>

          <h2 className="text-xl font-serif font-medium text-zinc-100">
            Synthesizing Novel Challenge
          </h2>

          <p className="mt-2 max-w-md text-sm text-zinc-400 leading-relaxed">
            Generating an unfamiliar workplace scenario for <strong className="text-amber-300 font-medium">{concept.name}</strong> to measure independent application.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-mono text-zinc-500">
            <span className="flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Applying trade-off constraints</span>
            </span>
            <span className="hidden sm:inline text-zinc-700">•</span>
            <span>Tagging source type</span>
            <span className="hidden sm:inline text-zinc-700">•</span>
            <span>Configuring zero-reference sandbox</span>
          </div>
        </div>
      )}

      {/* Error / Recoverable State */}
      {!isLoading && generationError && !challenge && (
        <div className="mt-12 rounded-2xl border border-rose-900/40 bg-[#160b0d]/70 p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-serif font-medium text-zinc-100">
            Challenge Generation Interrupted
          </h2>

          <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
            {generationError}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRegenerateChallenge}
              className="inline-flex items-center space-x-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-medium text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Generation</span>
            </button>

            {getCuratedNovelChallenge(concept.id) && (
              <button
                onClick={handleLoadCuratedBaseline}
                className="inline-flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                <span>Load Verified Baseline Scenario</span>
              </button>
            )}

            <button
              onClick={handleBackToProve}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Back to Concept Preview
            </button>
          </div>
        </div>
      )}

      {/* Main Challenge Content */}
      {!isLoading && challenge && (
        <AssessmentView
          concept={concept}
          challenge={challenge}
          onBackToProve={handleBackToProve}
          onNavigate={onNavigate}
          onRegenerateChallenge={handleRegenerateChallenge}
        />
      )}
    </div>
  );
};
