import { EvaluationResult, EvaluationVerdict } from '../types';
import { stripHtml, sanitizeText } from './sanitizer';

export interface EvaluationValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: EvaluationResult;
}

export const VALID_VERDICTS: EvaluationVerdict[] = [
  'CORRECT',
  'PARTIALLY_CORRECT',
  'WRONG_APPROACH',
  'NEEDS_CLARIFICATION'
];

/**
 * Robust JSON parser that handles codeblocks, extra text, and extraction
 */
export function safeParseJson<T = any>(raw: string): { success: boolean; data?: T; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { success: false, error: 'Empty or invalid JSON input.' };
  }

  let cleaned = raw.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Attempt direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed };
  } catch {
    // If direct parse fails, attempt regex extraction of the outermost JSON object
    const match = cleaned.match(/(\{[\s\S]*\})/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        return { success: true, data: parsed };
      } catch (err: any) {
        return { success: false, error: `Malformed JSON structure: ${err.message}` };
      }
    }
    return { success: false, error: 'No valid JSON object found in response.' };
  }
}

/**
 * Validates and sanitizes the LLM evaluation output before it is persisted or displayed.
 */
export function validateEvaluationResult(
  data: any,
  canaryToken?: string
): EvaluationValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Evaluation output is not a valid object.'] };
  }

  // Security Check: V2 canary token leak detection
  if (canaryToken && canaryToken.length > 5) {
    const rawString = JSON.stringify(data);
    if (rawString.includes(canaryToken)) {
      return {
        isValid: false,
        errors: ['Security Violation: Canary token leakage detected in output.'],
        sanitized: {
          verdict: 'NEEDS_CLARIFICATION',
          demonstrated_capabilities: [],
          missing_capabilities: [],
          evidence: ['Evaluation quarantined due to prompt security anomaly.'],
          brief_feedback: 'Input flagged for evaluation reset.',
          evaluator_confidence: 1.0
        }
      };
    }
  }

  // Support schema aliases from PRD prompt vs internal types
  const rawDemonstrated = data.demonstrated_capabilities || data.demonstrated_milestones || [];
  const rawMissing = data.missing_capabilities || data.missing_milestones || [];
  const rawFeedback = data.brief_feedback || data.reasoning || data.summary || '';
  const rawEvidence = data.evidence || data.evidence_audit || [];

  // Normalize and validate verdict enum
  let rawVerdict = String(data.verdict || '').trim().toUpperCase();
  // Map common misnomers
  if (rawVerdict === 'PARTIAL' || rawVerdict === 'PARTIALLY') rawVerdict = 'PARTIALLY_CORRECT';
  if (rawVerdict === 'WRONG' || rawVerdict === 'INCORRECT') rawVerdict = 'WRONG_APPROACH';
  if (rawVerdict === 'CLARIFICATION' || rawVerdict === 'UNCLEAR') rawVerdict = 'NEEDS_CLARIFICATION';

  let verdict = rawVerdict as EvaluationVerdict;
  if (!VALID_VERDICTS.includes(verdict)) {
    errors.push(`Invalid verdict "${data.verdict}". Must strictly be one of: ${VALID_VERDICTS.join(', ')}.`);
  }

  // Demonstrated capabilities validation
  if (!Array.isArray(rawDemonstrated)) {
    errors.push('demonstrated_capabilities must be an array of strings.');
  }

  // Missing capabilities validation
  if (!Array.isArray(rawMissing)) {
    errors.push('missing_capabilities must be an array of strings.');
  }

  // Evidence validation
  if (!Array.isArray(rawEvidence)) {
    errors.push('evidence must be an array of strings.');
  }

  // Brief feedback validation
  if (typeof rawFeedback !== 'string' || rawFeedback.trim().length === 0) {
    errors.push('brief_feedback must be a non-empty string.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const sanitizedDemonstrated = (rawDemonstrated || [])
    .map((s: any) => stripHtml(sanitizeText(String(s))))
    .filter(Boolean);

  const sanitizedMissing = (rawMissing || [])
    .map((s: any) => stripHtml(sanitizeText(String(s))))
    .filter(Boolean);

  const sanitizedEvidence = (rawEvidence || [])
    .map((s: any) => stripHtml(sanitizeText(String(s))))
    .filter(Boolean);

  // DETERMINISTIC SAFEGUARDS:
  // 1. Verdict must NEVER be CORRECT if demonstrated capabilities are empty or missing capabilities are substantive.
  const hasSubstantiveMissing = sanitizedMissing.some((item: string) => {
    const clean = item.trim().toLowerCase();
    return (
      clean.length > 0 &&
      clean !== 'none' &&
      clean !== 'none identified' &&
      clean !== 'none identified.' &&
      clean !== 'none.' &&
      clean !== 'n/a'
    );
  });

  if (verdict === 'CORRECT') {
    if (sanitizedDemonstrated.length === 0 || hasSubstantiveMissing) {
      verdict = 'PARTIALLY_CORRECT';
    }
  }

  // 2. Verdict must NEVER be NEEDS_CLARIFICATION if learner demonstrated substantive capability milestones.
  // According to PRD Section 6.3.3:
  // - PARTIALLY_CORRECT: The learner demonstrates a meaningful subset of milestones (e.g. 2/3 or 3/4) but leaves essential bounds or milestones unaddressed.
  // - NEEDS_CLARIFICATION: Strictly reserved for unclassifiable, off-topic, or degenerate submissions where demonstrated_capabilities is [].
  if (verdict === 'NEEDS_CLARIFICATION' && sanitizedDemonstrated.length > 0) {
    verdict = hasSubstantiveMissing ? 'PARTIALLY_CORRECT' : 'CORRECT';
  }

  // 3. If verdict is NEEDS_CLARIFICATION, demonstrated_capabilities must strictly be empty []
  if (verdict === 'NEEDS_CLARIFICATION') {
    sanitizedDemonstrated.length = 0;
  }

  let confidence = typeof data.evaluator_confidence === 'number' ? data.evaluator_confidence : 1.0;
  if (confidence > 1.0 && confidence <= 100) {
    confidence = confidence / 100;
  }
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  const sanitized: EvaluationResult = {
    verdict: VALID_VERDICTS.includes(verdict) ? verdict : 'NEEDS_CLARIFICATION',
    demonstrated_capabilities: sanitizedDemonstrated,
    missing_capabilities: sanitizedMissing,
    evidence: sanitizedEvidence,
    brief_feedback: stripHtml(sanitizeText(String(rawFeedback))),
    evaluator_confidence: Math.round(confidence * 100) / 100
  };

  return {
    isValid: true,
    errors: [],
    sanitized
  };
}

