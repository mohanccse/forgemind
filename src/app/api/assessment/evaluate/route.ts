import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Type } from '@google/genai';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';
import { executeLLM } from '@/lib/llm-client';
import { validateEvaluationResult } from '@/utils/evaluationValidator';
import { sanitizeText, LEARNER_ATTEMPT_LIMITS, isFillerPhrase } from '@/utils/sanitizer';
import { saveAttemptToDb } from '@/lib/supabase-store';
import { buildEvaluationSystemInstruction } from '@/prompts/evaluationSystemPrompt';

/**
 * Extracts ONLY actual learner submitted answers, stripping out system context,
 * milestone titles, and question prompts.
 */
function extractLearnerAnswersOnly(attempt: any): string {
  if (attempt.micro_responses && Array.isArray(attempt.micro_responses) && attempt.micro_responses.length > 0) {
    return attempt.micro_responses
      .map((mr: any, idx: number) => `Step ${idx + 1} Answer: ${mr.answer || ''}`)
      .join('\n');
  }

  const rawText = attempt.response || '';
  const responseMatches = rawText.match(/ANSWER:\s*(.+)/gi) || rawText.match(/RESPONSE:\s*(.+)/gi);
  if (responseMatches && responseMatches.length > 0) {
    return responseMatches.map((m: string) => m.replace(/(?:ANSWER|RESPONSE):\s*/i, '').trim()).join('\n');
  }
  return rawText;
}

function checkMilestoneDomainRelevance(
  answerText: string,
  concept: any,
  milestoneText: string
): { demonstrated: boolean; isOffTopic: boolean } {
  const text = (answerText || '').trim();
  const lower = text.toLowerCase();

  const isFillerRepetition =
    isFillerPhrase(text) ||
    /\b(important because it is|metric that is north star|guides the star|placeholder|test|asdf)\b/i.test(lower);

  if (text.length < 20 || isFillerRepetition) {
    return { demonstrated: false, isOffTopic: false };
  }

  const conceptNameDomain = `${concept.name || ''} ${concept.domain || ''}`.toLowerCase();

  const isSqlAnswer = /\b(select\s+.+\s+from|left\s+join|inner\s+join|group\s+by|where\s+\w+\s*=)\b/i.test(lower);
  const isSqlConcept = /\b(sql|database|query|postgres|relational|join|table)\b/i.test(conceptNameDomain);
  if (isSqlAnswer && !isSqlConcept) {
    return { demonstrated: false, isOffTopic: true };
  }

  const isRiceAnswer = /\b(rice\s+score|reach\s*(\*|\bx\b|\=|\:)|reach.*impact.*confidence.*effort)\b/i.test(lower);
  const isRiceConcept = /\brice\b/i.test(conceptNameDomain);
  if (isRiceAnswer && !isRiceConcept) {
    return { demonstrated: false, isOffTopic: true };
  }

  // Strip leading numbering, step labels, and echoed milestone titles from the learner's answer
  let cleanText = text
    .replace(/^(\d+[\.\)\-:]|\bstep\s*\d+[\.\)\-:]|\bmilestone\s*\d+[\.\)\-:])/i, '')
    .trim();

  if (milestoneText && milestoneText.length > 3) {
    const escapedMilestone = milestoneText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanText = cleanText.replace(new RegExp(`^${escapedMilestone}[:\\-\\s]*`, 'i'), '').trim();
    // Also remove generic headers like "Phased Action Plan", "Trade-off Matrix", "Boundary Conditions"
    cleanText = cleanText.replace(/^(phased\s+action\s+plan|trade-?off\s+matrix|boundary\s+conditions\s*(&|and)?\s*risks|quantitative\s+metrics[^:\n]*?)[:\-\s]*/i, '').trim();
  }
  const cleanLower = cleanText.toLowerCase();

  // Anti-pattern 1: Unphased "big-bang" launch (violates phased action planning and risk mitigation)
  const isBigBangAntiPattern = /\b(launch\s+(the\s+)?full\s+solution\s+immediately|skip\s+phases|no\s+phased\s+rollout|deploy\s+to\s+all\s+users\s+immediately|evaluate\s+(quality|risks?)\s+after\s+(gaining|getting)\s+enough\s+users)\b/i.test(cleanLower);
  if (isBigBangAntiPattern) {
    return { demonstrated: false, isOffTopic: false };
  }

  // Anti-pattern 2: Single-metric myopia (violates quantitative post-launch validation & counter-metrics)
  const isMetricMyopiaAntiPattern = /\b(measure\s+only\s+(whether|if)|if\s+it\s+goes\s+up,?\s*consider(\s+the\s+launch)?\s+successful|only\s+look\s+at\s+north\s+star|ignore\s+counter[- ]metrics)\b/i.test(cleanLower);
  if (isMetricMyopiaAntiPattern) {
    return { demonstrated: false, isOffTopic: false };
  }

  // Milestone-specific capability relevance for NSM framework
  const lowerMilestone = (milestoneText || '').toLowerCase();

  const isValueMilestone = /\b(singular|value-aligned|north star|core utility)\b/i.test(lowerMilestone);
  if (isValueMilestone) {
    const matchesValueAnswer = /\b(active|completed|derived|delivered|utility|customer value|scope|threshold)\b/i.test(cleanLower);
    return { demonstrated: matchesValueAnswer, isOffTopic: false };
  }

  const isInputMilestone = /\b(input|driving|decomposition|sub-metric|driver)\b/i.test(lowerMilestone);
  if (isInputMilestone) {
    const matchesInputAnswer = /\b(input|inputs|driver|drivers|initiated|templates|count per|events|frequency|rate)\b/i.test(cleanLower);
    return { demonstrated: matchesInputAnswer, isOffTopic: false };
  }

  const isCounterMilestone = /\b(counter-?metric|protective|guardrail|perverse\s+incentive)/i.test(lowerMilestone);
  if (isCounterMilestone) {
    const matchesCounterAnswer = /\b(guardrail|counter-?metric|retention|churn|conversion|satisfaction|quality|operational\s*cost)/i.test(cleanLower);
    return { demonstrated: matchesCounterAnswer, isOffTopic: false };
  }

  const isGamingMilestone = /\b(gaming|blindspot|failure\s+mode|operational\s+risk)/i.test(lowerMilestone);
  if (isGamingMilestone) {
    const matchesGamingAnswer = /\b(gaming|perverse|manipulat|unintended|blindspot|short-term|fraud|cheat)/i.test(cleanLower);
    return { demonstrated: matchesGamingAnswer, isOffTopic: false };
  }

  // General milestone keyword & analytical term matching (deduplicated)
  const targetWords = Array.from(new Set(
    `${milestoneText || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !['defines', 'clear', 'constructs', 'formulates', 'establishes', 'step', 'target', 'using', 'with', 'from', 'this', 'that', 'have', 'what', 'when', 'where', 'which', 'concept', 'topic', 'important', 'plan', 'action', 'phased', 'metrics', 'quantitative'].includes(w))
  ));

  const matchedKeywords = targetWords.filter(w => cleanLower.includes(w));
  const analyticalTerms = cleanLower.match(/\b(trade-?off|bottleneck|constraint|telemetry|gaming|counter-metric|incentive|guardrail|retention|conversion|sensitivity|threshold|ratio|latency|throughput)\b/gi) || [];

  if (matchedKeywords.length >= 2 || (matchedKeywords.length >= 1 && analyticalTerms.length >= 1)) {
    return { demonstrated: true, isOffTopic: false };
  }

  return { demonstrated: false, isOffTopic: false };
}

function splitIntoNumberedSections(text: string): string[] {
  const parts = text.split(/(?:^|\n+)(?:\d+[\.\)\-:]|\bstep\s*\d+[\.\)\-:]|\bmilestone\s*\d+[\.\)\-:])/i);
  const cleaned = parts.map(p => p.trim()).filter(Boolean);
  return cleaned.length >= 2 ? cleaned : [];
}

/**
 * Heuristic fallback evaluation when Gemini LLM is unavailable or timing out.
 * Strictly evaluates actual learner typed text against non-substantive/filler patterns.
 */
function evaluateHeuristic(
  challenge: any,
  concept: any,
  attempt: any,
  sourceType: string
): any {
  const learnerText = extractLearnerAnswersOnly(attempt).trim();
  const structuralMilestones: string[] = challenge.structuralMilestones || concept.reasoningMilestones || [];

  const demonstrated: string[] = [];
  const missing: string[] = [];
  const evidenceQuotes: string[] = [];

  if (attempt.micro_responses && Array.isArray(attempt.micro_responses) && attempt.micro_responses.length > 0) {
    for (let i = 0; i < attempt.micro_responses.length; i++) {
      const step = attempt.micro_responses[i];
      const milestone = step.milestone || structuralMilestones[i] || `Milestone ${i + 1}`;
      const answer = (step.answer || '').trim();
      const relevance = checkMilestoneDomainRelevance(answer, concept, milestone);
      if (relevance.demonstrated && !relevance.isOffTopic) {
        demonstrated.push(milestone);
        if (answer.length > 15) {
          evidenceQuotes.push(answer.substring(0, 120));
        }
      } else {
        missing.push(milestone);
      }
    }
  } else {
    const numberedSections = splitIntoNumberedSections(learnerText);
    for (let i = 0; i < structuralMilestones.length; i++) {
      const milestone = structuralMilestones[i];
      const textToEvaluate = (numberedSections.length > i ? numberedSections[i] : learnerText);
      const relevance = checkMilestoneDomainRelevance(textToEvaluate, concept, milestone);
      if (relevance.demonstrated && !relevance.isOffTopic) {
        demonstrated.push(milestone);
      } else {
        missing.push(milestone);
      }
    }
    const sentences = learnerText.split(/(?<=[.?!:\n])\s+/).filter((s: string) => s.trim().length > 15);
    evidenceQuotes.push(...sentences.slice(0, 3).map((s: string) => s.trim().replace(/\n+/g, ' ')));
  }

  const isFiller = isFillerPhrase(learnerText) ||
    /\b(important because it is|metric that is north star|placeholder|test|asdf)\b/i.test(learnerText.toLowerCase()) ||
    learnerText.length < 35;

  let verdict: 'CORRECT' | 'PARTIALLY_CORRECT' | 'WRONG_APPROACH' | 'NEEDS_CLARIFICATION' = 'NEEDS_CLARIFICATION';
  if (demonstrated.length > 0 && missing.length > 0) {
    verdict = 'PARTIALLY_CORRECT';
  } else if (demonstrated.length > 0 && missing.length === 0) {
    verdict = 'CORRECT';
  } else if (isFiller) {
    verdict = 'NEEDS_CLARIFICATION';
  } else {
    verdict = 'WRONG_APPROACH';
  }

  const score = structuralMilestones.length > 0
    ? Math.round((demonstrated.length / structuralMilestones.length) * 100)
    : (verdict === 'CORRECT' ? 100 : verdict === 'PARTIALLY_CORRECT' ? 50 : 0);

  return {
    verdict,
    demonstrated_capabilities: demonstrated,
    missing_capabilities: missing.length > 0
      ? missing
      : (demonstrated.length === 0 ? (structuralMilestones.length > 0 ? structuralMilestones : ['Detailed trade-off analysis']) : []),
    evidence: evidenceQuotes.length > 0 ? evidenceQuotes : [learnerText ? `Formulation provided: "${learnerText.substring(0, 100)}..."` : 'Empty response provided.'],
    brief_feedback: verdict === 'PARTIALLY_CORRECT'
      ? `Demonstrated ${demonstrated.length} of ${structuralMilestones.length || 4} milestones.`
      : verdict === 'CORRECT'
      ? 'All required milestones demonstrated.'
      : 'Evaluation completed via deterministic capability safeguard.',
    defensibility_score: score
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { challenge, concept, attempt, sourceType } = body;

    if (!challenge || !concept || !attempt || typeof attempt.response !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: challenge, concept, and attempt with response are required.' },
        { status: 400 }
      );
    }

    if (!attempt.attempt_id || !attempt.session_id || !attempt.learner_id) {
      return NextResponse.json(
        { error: 'Security validation failed: attempt_id, session_id, and learner_id are required.' },
        { status: 400 }
      );
    }

    const effectiveSourceType = sourceType || challenge.sourceType || concept.sourceType || 'LIBRARY';
    const isUserGenerated = effectiveSourceType === 'USER_GENERATED';
    const responseText = sanitizeText(attempt.response);

    if (responseText.length > LEARNER_ATTEMPT_LIMITS.MAX_CHARS) {
      return NextResponse.json(
        { error: `Learner attempt exceeds character limit (${responseText.length}/${LEARNER_ATTEMPT_LIMITS.MAX_CHARS}).` },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    async function persistAttemptSafely(params: {
      verdict: string;
      evaluatorConfidence?: number;
      injectionDetected?: boolean;
      latencyMs: number;
      modelName: string;
    }) {
      try {
        await saveAttemptToDb({
          attempt_id: attempt.attempt_id,
          session_id: attempt.session_id,
          learner_id: attempt.learner_id,
          challenge_id: challenge.id,
          attempt_number: attempt.attempt_number || 1,
          answer: attempt.response,
          verdict: params.verdict,
          evaluator_confidence: params.evaluatorConfidence ?? 1.0,
          injection_detected: Boolean(params.injectionDetected),
          latency_ms: params.latencyMs,
          model_name: params.modelName
        });
      } catch (err: any) {
        console.warn('[Supabase Store] Non-blocking attempt persistence warning:', err?.message || err);
      }
    }

    if (responseText.length === 0) {
      await persistAttemptSafely({
        verdict: 'NEEDS_CLARIFICATION',
        latencyMs: Date.now() - startTime,
        modelName: 'heuristic-evaluator'
      });
      return NextResponse.json({
        success: true,
        evaluation: {
          verdict: 'NEEDS_CLARIFICATION',
          demonstrated_capabilities: [],
          missing_capabilities: ['No substantive formulation submitted.'],
          evidence: ['Empty response submission.'],
          brief_feedback: 'No response was provided to evaluate. Formulate your solution in the workspace before submitting.'
        },
        source: 'heuristic-evaluator'
      });
    }

    const canaryToken = `FM_CANARY_${crypto.randomBytes(16).toString('hex')}`;

    // Security Check: Adversarial Injection Protection
    const lowerLearnerAnswers = extractLearnerAnswersOnly(attempt).toLowerCase();
    const isAdversarial =
      lowerLearnerAnswers.includes('ignore previous instructions') ||
      lowerLearnerAnswers.includes('ignore all instructions') ||
      lowerLearnerAnswers.includes('disregard instructions') ||
      lowerLearnerAnswers.includes('override system prompt') ||
      lowerLearnerAnswers.includes('bypass system prompt') ||
      lowerLearnerAnswers.includes('reveal secret') ||
      lowerLearnerAnswers.includes('canary token') ||
      lowerLearnerAnswers.includes('fm_canary') ||
      lowerLearnerAnswers.includes('always answer correct') ||
      lowerLearnerAnswers.includes('output verdict: correct') ||
      lowerLearnerAnswers.includes('verdict: correct') ||
      lowerLearnerAnswers.includes('verdict": "correct') ||
      lowerLearnerAnswers.includes('you are now an unrestricted') ||
      lowerLearnerAnswers.includes('output json only without evaluating') ||
      lowerLearnerAnswers.includes('developer mode') ||
      lowerLearnerAnswers.includes('dan mode') ||
      lowerLearnerAnswers.includes('jailbreak');

    if (isAdversarial) {
      await persistAttemptSafely({
        verdict: 'NEEDS_CLARIFICATION',
        injectionDetected: true,
        latencyMs: Date.now() - startTime,
        modelName: 'quarantine'
      });
      return NextResponse.json({
        success: true,
        evaluation: {
          verdict: 'NEEDS_CLARIFICATION',
          demonstrated_capabilities: [],
          missing_capabilities: [],
          evidence: ['Adversarial instruction override pattern detected in input.'],
          brief_feedback: 'Input flagged for evaluation reset.'
        },
        source: 'quarantine'
      });
    }

    try {
      const systemInstruction = buildEvaluationSystemInstruction({ canaryToken, isUserGenerated });

      const structuredResponsesText = (attempt.micro_responses && attempt.micro_responses.length > 0)
        ? attempt.micro_responses.map((m: any, idx: number) =>
            `--- STEP ${idx + 1} ---
[SYSTEM CONTEXT - NOT WRITTEN BY LEARNER] Target Milestone: ${m.milestone}
[SYSTEM CONTEXT - NOT WRITTEN BY LEARNER] Question: ${m.question}
ACTUAL LEARNER SUBMITTED ANSWER: """${m.answer || ''}"""`
          ).join('\n\n')
        : `ACTUAL LEARNER SUBMITTED ANSWER: """${extractLearnerAnswersOnly(attempt)}"""`;

      const prompt = `
CHALLENGE DETAILS:
- Title: ${challenge.title}
- Domain: ${challenge.domain || concept.domain}
- Capability Tested: ${challenge.capabilityTested || concept.underlyingSkill}
- Scenario: ${challenge.scenario}
${challenge.contextData ? `- Telemetry / Context Data: ${challenge.contextData}` : ''}
- Mandate: ${challenge.mandate}
- Constraints:
${challenge.constraints?.map((c: string) => `  * ${c}`).join('\n') || 'None'}
- Expected Output Format: ${challenge.expectedOutputFormat}

CAPABILITY MODEL & MILESTONES:
- Underlying Skill: ${concept.underlyingSkill}
- Target Capabilities:
${concept.capabilities?.map((cap: string) => `  * ${cap}`).join('\n') || 'None'}
- Structural Reasoning Milestones:
${(challenge.structuralMilestones || concept.reasoningMilestones || []).map((m: string) => `  * ${m}`).join('\n') || 'None'}

LEARNER INDEPENDENT ATTEMPT (Attempt #${attempt.attempt_number || 1}, Pre-attempt confidence: ${attempt.confidence_before_attempt || 3}/5):
"""
${structuredResponsesText}
"""

Evaluate the learner's unassisted response now.
Return JSON matching schema.`;

      const llmResult = await executeLLM({
        systemPrompt: systemInstruction,
        userPrompt: prompt,
        jsonMode: true,
        traceName: 'assessment-evaluate',
        metadata: {
          learner_id: attempt.learner_id,
          challenge_id: challenge.id,
          attempt_number: attempt.attempt_number || 1,
          session_id: attempt.session_id,
          attempt_id: attempt.attempt_id,
          source_type: effectiveSourceType
        },
        tags: ['assessment-evaluate', effectiveSourceType],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: {
              type: Type.STRING,
              enum: ['CORRECT', 'PARTIALLY_CORRECT', 'WRONG_APPROACH', 'NEEDS_CLARIFICATION'],
              description: 'Exactly one verdict'
            },
            demonstrated_capabilities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific capabilities or milestones clearly demonstrated in the learner response'
            },
            missing_capabilities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Capabilities or milestones that were missed, misunderstood, or unaddressed'
            },
            evidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Direct grounded quotes from the learner typed response'
            },
            brief_feedback: {
              type: Type.STRING,
              description: 'Short evaluation rationale'
            }
          },
          required: ['verdict', 'demonstrated_capabilities', 'missing_capabilities', 'evidence', 'brief_feedback']
        }
      });

      const parsed = typeof llmResult.data === 'object' && llmResult.data !== null ? llmResult.data : {};
      const validation = validateEvaluationResult(parsed, canaryToken);

      if (validation.isValid && validation.sanitized) {
        await persistAttemptSafely({
          verdict: validation.sanitized.verdict,
          evaluatorConfidence: 1.0,
          latencyMs: Date.now() - startTime,
          modelName: llmResult.modelUsed || llmResult.providerUsed
        });
        return NextResponse.json({
          success: true,
          evaluation: validation.sanitized,
          source: llmResult.providerUsed
        });
      }
    } catch (err: any) {
      console.error('[Assessment Evaluation LLM Failure] All LLM providers failed. Falling back to heuristic evaluator:', err);
    }

    const fallbackEval = evaluateHeuristic(challenge, concept, attempt, effectiveSourceType);
    await persistAttemptSafely({
      verdict: fallbackEval.verdict,
      latencyMs: Date.now() - startTime,
      modelName: 'heuristic-evaluator'
    });
    return NextResponse.json({
      success: true,
      evaluation: fallbackEval,
      source: 'heuristic-evaluator'
    });
  } catch (err: any) {
    console.error('Unhandled error in assessment evaluation route:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process evaluation.' },
      { status: 500 }
    );
  }
}
