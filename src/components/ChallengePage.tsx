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
  Check
} from 'lucide-react';
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
  saveAttemptDraft,
  getAttemptDraft,
  clearAttemptDraft,
  getAllAttempts
} from '../services/attemptService';
import {
  getHintState,
  requestHintTier,
  recordAttemptEvaluationInHintState,
  flagEvaluationOverride
} from '../services/hintService';
import { HintLadder } from './HintLadder';
import { ActiveHintsDrawer } from './ActiveHintsDrawer';

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

  // Textarea ref for rich formatting insertion
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load or restore challenge and attempt state on mount or concept change
  useEffect(() => {
    let isMounted = true;

    async function initChallenge() {
      // 1. Check if we already have an active challenge stored in session for this concept
      const existingChallenge = getPersistedActiveChallenge(concept.id);

      if (existingChallenge) {
        if (!isMounted) return;
        setChallenge(existingChallenge);
        setHintState(getHintState(existingChallenge.id, concept.id));
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
          if (draft.lastSaved) {
            setDraftSavedTimestamp(draft.lastSaved);
          }
        }
        return;
      }

      // 2. Otherwise generate novel challenge
      setIsLoading(true);
      setGenerationError(null);

      const result = await generateNovelChallenge(concept, concept.approximateDifficulty, 'LIBRARY');

      if (!isMounted) return;

      if (result.success && result.challenge) {
        const loadedChallenge = result.challenge;
        setChallenge(loadedChallenge);
        setHintState(getHintState(loadedChallenge.id, concept.id));
        setGenerationSource(result.source || 'gemini');
        persistActiveChallenge(concept.id, loadedChallenge);

        // Check draft
        const draft = getAttemptDraft(loadedChallenge.id);
        if (draft) {
          setConfidenceBeforeAttempt(draft.confidence_before_attempt || 3);
          setResponse(draft.response || '');
          setStage(draft.stage || 'confidence');
        } else {
          setStage('confidence');
          setResponse('');
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

    const result = await generateNovelChallenge(concept, concept.approximateDifficulty, 'LIBRARY');
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

  // Explicit Save Draft Button
  const handleSaveDraft = () => {
    if (!challenge) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    saveAttemptDraft(challenge.id, {
      confidence_before_attempt: confidenceBeforeAttempt,
      response,
      stage: 'attempt',
      lastSaved: now
    });
    setDraftSavedTimestamp(now);
  };

  // Formatting Toolbar helpers for Rich Text Experience
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = response.substring(start, end);
    const beforeText = response.substring(0, start);
    const afterText = response.substring(end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newText = `${beforeText}${replacement}${afterText}`;

    if (newText.length <= MAX_RESPONSE_LENGTH) {
      setResponse(newText);
      if (challenge) {
        saveAttemptDraft(challenge.id, {
          confidence_before_attempt: confidenceBeforeAttempt,
          response: newText,
          stage: 'attempt',
          lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + (selectedText.length || 4)
        );
      }, 0);
    }
  };

  // Submit Attempt with Duplicate Protection
  const handleSubmitAttempt = () => {
    if (!challenge || isSubmitting) return;

    const trimmed = response.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_RESPONSE_LENGTH) {
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
        response: trimmed,
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
    } catch (err) {
      console.error('Submission failed:', err);
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
    setStage('attempt');
    if (!response && submittedAttempt) {
      setResponse(submittedAttempt.response);
    }
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setIsEvaluating(false);
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

  // Reset to attempt again
  const handleMakeAnotherAttempt = () => {
    setResponse('');
    setStage('confidence');
    setSubmittedAttempt(null);
    setEvaluationResult(null);
    setEvaluationError(null);
    setIsEvaluating(false);
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
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <button
          id="back-to-prove-btn"
          onClick={onBackToProve}
          className="inline-flex items-center space-x-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Concept Preview</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-mono text-emerald-300">
            <Lock className="h-3 w-3" />
            <span>Zero-Reference Execution Active</span>
          </div>

          {challenge && (
            <span className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              Source: <strong className="text-zinc-300 font-semibold">{challenge.sourceType}</strong>
            </span>
          )}

          <span className="text-xs text-zinc-500 hidden md:inline">
            Domain: <strong className="text-zinc-400 font-normal">{concept.domain}</strong>
          </span>
        </div>
      </div>

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
              onClick={onBackToProve}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Back to Concept Preview
            </button>
          </div>
        </div>
      )}

      {/* Main Challenge Content */}
      {!isLoading && challenge && (
        <div className="mt-6">
          {/* STAGE 1: BEFORE THE CHALLENGE — CONFIDENCE ASSESSMENT */}
          {stage === 'confidence' && (
            <div className="space-y-6">
              {/* Challenge Overview Card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-300 uppercase">
                      {concept.name}
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
                      {challenge.difficulty}
                    </span>
                    <span className="rounded bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                      Source: {challenge.sourceType}
                    </span>
                  </div>

                  <button
                    onClick={handleRegenerateChallenge}
                    className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Regenerate Scenario</span>
                  </button>
                </div>

                <h1 className="mt-4 font-serif text-2xl font-normal text-zinc-100 sm:text-3xl">
                  {challenge.title}
                </h1>

                {/* Capability Tested */}
                <div className="mt-4 rounded-lg border border-zinc-800 bg-[#0c0d12] p-3 text-xs text-zinc-300">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5">
                    Target Capability
                  </span>
                  {challenge.capabilityTested || concept.underlyingSkill}
                </div>

                {/* Scenario Description */}
                <div className="mt-6">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Scenario & Problem Context
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200 whitespace-pre-line">
                    {challenge.scenario}
                  </p>
                </div>

                {/* Telemetry / Context Data */}
                {challenge.contextData && (
                  <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                        Operational Telemetry & Parameters
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">Immutable Context</span>
                    </div>
                    <pre className="overflow-x-auto text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {challenge.contextData}
                    </pre>
                  </div>
                )}

                {/* Mandate */}
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center space-x-2 text-xs font-mono font-medium uppercase tracking-wider text-amber-400 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Your Mandate</span>
                  </div>
                  <p className="text-sm text-zinc-100 leading-relaxed font-medium">
                    {challenge.mandate}
                  </p>
                </div>

                {/* Evaluation Constraints */}
                <div className="mt-6">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Evaluation Constraints
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {challenge.constraints.map((c, i) => (
                      <li key={i} className="flex items-start space-x-2.5 text-xs text-zinc-300">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expected Output Format */}
                <div className="mt-6 border-t border-zinc-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-zinc-500 uppercase tracking-wider text-[11px]">
                    Expected Deliverable:
                  </span>
                  <span className="text-zinc-200 font-medium">
                    {challenge.expectedOutputFormat}
                  </span>
                </div>
              </div>

              {/* BEFORE THE CHALLENGE: CONFIDENCE GATE */}
              <div
                id="confidence-gate-card"
                className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#161208] to-[#0f0e13] p-6 sm:p-8 shadow-xl"
              >
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Pre-Challenge Calibration</span>
                </div>

                <h2 className="mt-2 text-lg sm:text-xl font-serif text-zinc-100">
                  How confident are you that you can solve this?
                </h2>

                <p className="mt-1 text-xs text-zinc-400 max-w-2xl">
                  ForgeMind measures what you can independently produce. Your pre-attempt rating establishes your calibration index against your final autonomous solution.
                </p>

                {/* 1 to 5 Confidence Buttons */}
                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
                  {confidenceOptions.map((opt) => {
                    const isSelected = confidenceBeforeAttempt === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        id={`confidence-opt-${opt.value}`}
                        onClick={() => setConfidenceBeforeAttempt(opt.value)}
                        className={`group relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-950/40 text-amber-200 ring-1 ring-amber-400/50'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-mono text-sm font-semibold">
                            {opt.label}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isSelected ? 'bg-amber-400' : 'bg-zinc-700'
                            }`}
                          />
                        </div>
                        <span className="mt-2 text-[11px] leading-tight text-zinc-400 group-hover:text-zinc-300">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Zero Reference Notice & Launch Button */}
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800/80 pt-5">
                  <div className="flex items-center space-x-2 text-xs text-zinc-400">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Independent attempt starts immediately. No reference solutions or scaffolding will be shown.</span>
                  </div>

                  <button
                    id="begin-attempt-btn"
                    onClick={handleStartIndependentAttempt}
                    className="flex items-center justify-center space-x-2 rounded-lg bg-amber-400 px-6 py-3 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-all shadow-lg hover:shadow-amber-500/20 active:scale-[0.99]"
                  >
                    <span>Begin Independent Attempt</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: INDEPENDENT ATTEMPT (ZERO REFERENCE ENFORCED) */}
          {stage === 'attempt' && (
            <div className="space-y-6">
              {/* Active Hints Guidance Drawer (if hints are unlocked) */}
              <ActiveHintsDrawer challenge={challenge} hintState={hintState} />

              {/* Mode Banner: No Scaffolding */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Independent Attempt Active:</span> Zero-reference mode enforced. Original examples, reference solutions, evaluation rubrics, and hint ladders are concealed.
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-zinc-400 font-mono text-[11px]">
                  <span>Confidence: <strong className="text-amber-300">{confidenceBeforeAttempt}/5</strong></span>
                  {draftSavedTimestamp && (
                    <span className="text-zinc-500">Draft: {draftSavedTimestamp}</span>
                  )}
                </div>
              </div>

              {/* Grid: Left Column = Problem Brief; Right Column = Independent Attempt Editor */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Column (5 cols): Challenge Mandate & Constraints Reference */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                        {concept.name} • {challenge.difficulty}
                      </span>
                      <h2 className="mt-1 font-serif text-lg text-zinc-100">
                        {challenge.title}
                      </h2>
                    </div>

                    {/* Mandate */}
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-amber-400 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mandate</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                        {challenge.mandate}
                      </p>
                    </div>

                    {/* Scenario Shortened */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Scenario Context
                      </h3>
                      <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed max-h-48 overflow-y-auto pr-1">
                        {challenge.scenario}
                      </p>
                    </div>

                    {/* Telemetry if available */}
                    {challenge.contextData && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                          Parameters / Telemetry
                        </span>
                        <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap max-h-40 overflow-y-auto pr-1">
                          {challenge.contextData}
                        </pre>
                      </div>
                    )}

                    {/* Constraints */}
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Constraints
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {challenge.constraints.map((c, i) => (
                          <li key={i} className="flex items-start space-x-2 text-xs text-zinc-300">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Expected Output */}
                    <div className="border-t border-zinc-800 pt-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                        Expected Output Format
                      </span>
                      <p className="text-xs text-zinc-300 mt-1 font-medium">
                        {challenge.expectedOutputFormat}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column (7 cols): The Independent Workspace */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col h-full">
                    {/* Editor Header & Rich Text Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-medium">
                          Your Formulation
                        </span>
                        <span className="text-zinc-600">|</span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('write')}
                            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                              previewTab === 'write'
                                ? 'bg-zinc-800 text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className="flex items-center space-x-1">
                              <Edit3 className="h-3 w-3" />
                              <span>Write</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('preview')}
                            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                              previewTab === 'preview'
                                ? 'bg-zinc-800 text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>Preview</span>
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Formatting Shortcuts */}
                      {previewTab === 'write' && (
                        <div className="flex items-center space-x-1 bg-zinc-950/60 border border-zinc-800/80 rounded-md p-1 text-zinc-400">
                          <button
                            type="button"
                            onClick={() => insertFormatting('**', '**')}
                            title="Bold (**text**)"
                            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Bold className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormatting('*', '*')}
                            title="Italic (*text*)"
                            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Italic className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormatting('- ')}
                            title="Bullet list (- item)"
                            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <List className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormatting('1. ')}
                            title="Numbered list (1. item)"
                            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <ListOrdered className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormatting('```\n', '\n```')}
                            title="Code block (```code```)"
                            className="p-1 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Terminal className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Workspace Body */}
                    <div className="mt-3 flex-1">
                      {previewTab === 'write' ? (
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            id="independent-attempt-textarea"
                            value={response}
                            onChange={handleResponseChange}
                            rows={16}
                            placeholder={`Type your unassisted solution here...\n\nDeliverable format:\n${challenge.expectedOutputFormat}\n\nNote: Rely purely on your own reasoning without looking at reference materials.`}
                            className={`w-full rounded-lg border bg-[#090a0e] p-4 text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all ${
                              response.length >= MAX_RESPONSE_LENGTH
                                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20'
                                : 'border-zinc-800 focus:border-amber-400 focus:ring-amber-400/20'
                            } ${editorMode === 'code' ? 'font-mono' : 'font-sans'}`}
                          />
                        </div>
                      ) : (
                        <div className="min-h-[380px] rounded-lg border border-zinc-800 bg-[#090a0e] p-4 text-xs text-zinc-200 whitespace-pre-wrap overflow-y-auto">
                          {response.trim().length > 0 ? (
                            response
                          ) : (
                            <span className="italic text-zinc-600">
                              Your formatted response preview will appear here as you type.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Character Counter & Limits */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          id="character-counter"
                          className={`font-mono ${
                            response.length > 1850
                              ? response.length >= MAX_RESPONSE_LENGTH
                                ? 'text-rose-400 font-semibold'
                                : 'text-amber-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {response.length.toLocaleString()} / {MAX_RESPONSE_LENGTH.toLocaleString()} characters
                        </span>
                        {response.length >= MAX_RESPONSE_LENGTH && (
                          <span className="text-[10px] text-rose-400 font-mono">
                            (Max limit reached)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-zinc-500">
                          {response.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                    </div>

                    {/* Action Bar: Save Draft & Submit Attempt */}
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          id="save-draft-btn"
                          onClick={handleSaveDraft}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Draft</span>
                        </button>

                        {draftSavedTimestamp && (
                          <span className="text-[11px] text-zinc-500 font-mono">
                            Saved {draftSavedTimestamp}
                          </span>
                        )}
                      </div>

                      {/* Submit Attempt Button with Duplicate Protection */}
                      <button
                        type="button"
                        id="submit-attempt-btn"
                        disabled={response.trim().length === 0 || response.length > MAX_RESPONSE_LENGTH || isSubmitting}
                        onClick={handleSubmitAttempt}
                        className={`inline-flex items-center justify-center space-x-2 rounded-lg px-6 py-2.5 text-xs font-semibold transition-all shadow-md ${
                          response.trim().length === 0 || isSubmitting
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                            : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 hover:shadow-amber-400/20 active:scale-[0.99]'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Processing Submission...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Attempt</span>
                            <Send className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: ATTEMPT SUBMITTED — CONFIRMATION & AUDIT LOG */}
          {stage === 'submitted' && submittedAttempt && (
            <div className="space-y-6">
              {/* Primary Confirmation Card */}
              <div
                id="submission-success-card"
                className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#0e1014] p-6 sm:p-8"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Independent Attempt Recorded
                    </span>
                    <h1 className="font-serif text-2xl text-zinc-100 sm:text-3xl">
                      Attempt #{submittedAttempt.attempt_number} Logged Successfully
                    </h1>
                  </div>
                </div>

                <p className="mt-4 text-xs text-zinc-300 sm:text-sm leading-relaxed max-w-2xl">
                  Your unassisted formulation was permanently saved to your capability ledger under zero-reference conditions.
                </p>

                {/* Attempt Metadata Grid */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase block">Attempt ID</span>
                    <span className="font-semibold text-zinc-200 truncate block">{submittedAttempt.attempt_id}</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase block">Pre-Attempt Confidence</span>
                    <span className="font-semibold text-amber-300 block">{submittedAttempt.confidence_before_attempt} / 5</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase block">Response Length</span>
                    <span className="font-semibold text-zinc-200 block">{submittedAttempt.response.length.toLocaleString()} chars</span>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase block">Source Type</span>
                    <span className="font-semibold text-zinc-200 block">{submittedAttempt.source_type}</span>
                  </div>
                </div>

                {/* Unedited Response Review */}
                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Unedited Recorded Formulation
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(submittedAttempt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72">
                    {submittedAttempt.response}
                  </pre>
                </div>

                {/* STEP 4: FORGEMIND EVIDENCE EVALUATION ENGINE CARD */}
                <div id="evaluation-engine-card" className="mt-6 space-y-4">
                  {/* Evaluating Loading State */}
                  {isEvaluating && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                      <div className="flex justify-center">
                        <RefreshCw className="h-6 w-6 text-amber-400 animate-spin" />
                      </div>
                      <h3 className="mt-3 font-serif text-lg text-zinc-100">
                        Evaluating Unassisted Demonstration...
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                        Observing what you demonstrated against underlying capability milestones and verifying grounded evidence under zero-reference conditions.
                      </p>
                    </div>
                  )}

                  {/* Evaluation Error State */}
                  {!isEvaluating && evaluationError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-rose-200">Evaluation Interrupted</h4>
                          <p className="text-xs text-zinc-400 mt-1">{evaluationError}</p>
                          <button
                            type="button"
                            onClick={handleRerunEvaluation}
                            className="mt-3 inline-flex items-center space-x-1.5 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Retry Fresh Evaluation</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Complete Evaluation Output */}
                  {!isEvaluating && evaluationResult && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6 space-y-6">
                      {/* Verdict Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center space-x-3">
                          {evaluationResult.verdict === 'CORRECT' && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          )}
                          {evaluationResult.verdict === 'PARTIALLY_CORRECT' && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                              <AlertCircle className="h-5 w-5" />
                            </div>
                          )}
                          {evaluationResult.verdict === 'WRONG_APPROACH' && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
                              <AlertOctagon className="h-5 w-5" />
                            </div>
                          )}
                          {evaluationResult.verdict === 'NEEDS_CLARIFICATION' && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400">
                              <HelpCircle className="h-5 w-5" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider font-semibold border ${
                                  evaluationResult.verdict === 'CORRECT'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : evaluationResult.verdict === 'PARTIALLY_CORRECT'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : evaluationResult.verdict === 'WRONG_APPROACH'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                    : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                                }`}
                              >
                                Verdict: {evaluationResult.verdict.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-mono text-zinc-500">
                                Fresh Evaluation
                              </span>
                            </div>
                            <h3 className="font-serif text-lg text-zinc-100 mt-1">
                              {evaluationResult.verdict === 'CORRECT' &&
                                'Capability Demonstrated: Autonomous Execution Verified'}
                              {evaluationResult.verdict === 'PARTIALLY_CORRECT' &&
                                'Partial Execution: Core Reasoning Present with Gaps'}
                              {evaluationResult.verdict === 'WRONG_APPROACH' &&
                                'Structural Divergence: Incompatible Approach'}
                              {evaluationResult.verdict === 'NEEDS_CLARIFICATION' &&
                                'Needs Clarification: Insufficient Grounded Evidence'}
                            </h3>
                          </div>
                        </div>

                        {/* Refresh Fresh Evaluation Button */}
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={handleRerunEvaluation}
                            title="Re-run fresh evaluation"
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Re-Evaluate Attempt</span>
                          </button>
                        </div>
                      </div>

                      {/* Brief Feedback */}
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                          Evaluator Assessment
                        </span>
                        <p className="text-xs leading-relaxed text-zinc-200">
                          {evaluationResult.brief_feedback}
                        </p>
                      </div>

                      {/* Capabilities Matrix: Demonstrated vs Missing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Demonstrated Capabilities */}
                        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
                          <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                            <CheckCircle2 className="h-4 w-4" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
                              Demonstrated Capabilities ({evaluationResult.demonstrated_capabilities.length})
                            </h4>
                          </div>
                          {evaluationResult.demonstrated_capabilities.length > 0 ? (
                            <ul className="space-y-2">
                              {evaluationResult.demonstrated_capabilities.map((cap, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start space-x-2 text-xs text-zinc-300"
                                >
                                  <span className="text-emerald-400 mt-0.5">•</span>
                                  <span>{cap}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs italic text-zinc-500">
                              No explicit capability milestones were verified in the submission.
                            </p>
                          )}
                        </div>

                        {/* Missing Capabilities */}
                        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
                          <div className="flex items-center space-x-2 text-amber-400 mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
                              Missing / Unaddressed ({evaluationResult.missing_capabilities.length})
                            </h4>
                          </div>
                          {evaluationResult.missing_capabilities.length > 0 ? (
                            <ul className="space-y-2">
                              {evaluationResult.missing_capabilities.map((cap, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start space-x-2 text-xs text-zinc-400"
                                >
                                  <span className="text-amber-400 mt-0.5">•</span>
                                  <span>{cap}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs italic text-emerald-400/80">
                              All target structural capability milestones were addressed.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Grounded Evidence Audit */}
                      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 text-amber-300">
                            <Quote className="h-3.5 w-3.5" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono">
                              Grounded Evidence Audit ({evaluationResult.evidence.length})
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Cited from your actual text
                          </span>
                        </div>

                        {evaluationResult.evidence.length > 0 ? (
                          <div className="space-y-2">
                            {evaluationResult.evidence.map((ev, idx) => (
                              <div
                                key={idx}
                                className="rounded border border-zinc-800/60 bg-zinc-950/60 p-2.5 text-xs font-mono text-zinc-300 leading-relaxed"
                              >
                                {ev}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs italic text-zinc-500">
                            No grounded evidence citations recorded.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 5: PROGRESSIVE HINT LADDER & EVALUATION OVERRIDE */}
                <HintLadder
                  challenge={challenge}
                  concept={concept}
                  hintState={hintState}
                  latestAttempt={submittedAttempt}
                  onRequestHint={handleRequestHint}
                  onRetry={handleRetryWithHints}
                  onFlagReview={handleFlagReview}
                  isRequestingHint={isRequestingHint}
                />

                {/* Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    id="view-evidence-btn"
                    onClick={() => onNavigate('evidence')}
                    className="inline-flex items-center space-x-2 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors"
                  >
                    <span>View in My Evidence</span>
                  </button>

                  <button
                    id="make-another-attempt-btn"
                    onClick={handleMakeAnotherAttempt}
                    className="inline-flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Make Another Attempt</span>
                  </button>

                  <button
                    onClick={handleRegenerateChallenge}
                    className="inline-flex items-center space-x-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Try Another Novel Challenge</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
