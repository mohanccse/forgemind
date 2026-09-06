import {
  LearnerAttempt,
  ConceptCapabilityEvidence,
  CapabilityEvidenceItem,
  Concept,
  EvaluationVerdict
} from '../types';
import { getAllAttempts } from './attemptService';
import { INITIAL_CONCEPTS, getConceptById } from '../data/concepts';

/**
 * Normalizes capability text for matching across attempts
 */
function normalizeCapabilityKey(cap: string): string {
  return cap.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
}

/**
 * Capitalizes first letter for professional display
 */
function formatCapabilityLabel(cap: string): string {
  const trimmed = cap.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Step 6: Accumulate evidence for a specific concept.
 *
 * Rules:
 * 1. Does not reduce performance to a generic 0-100 score.
 * 2. Uses evidence-based language: Demonstrated, Developing, Observed, Insufficient evidence.
 * 3. Does not claim mastery from one attempt.
 * 4. Multiple attempts accumulate evidence over time.
 * 5. Conceals hidden rubrics and reference solutions.
 */
export function buildConceptEvidenceProfile(
  concept: Concept,
  attempts: LearnerAttempt[]
): ConceptCapabilityEvidence {
  const conceptAttempts = attempts.filter((a) => a.concept_id === concept.id);

  // Sort chronological (oldest to newest)
  const sortedAttempts = [...conceptAttempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const totalAttempts = sortedAttempts.length;

  // Distinct challenges attempted for this concept
  const distinctChallenges = new Set(sortedAttempts.map((a) => a.challenge_id));
  const challengesAttempted = Math.max(distinctChallenges.size, totalAttempts);

  // Autonomous attempts (0 hints and no solution revealed)
  const autonomousAttempts = sortedAttempts.filter(
    (a) => (a.hint_tier_reached === 0 || a.hint_tier_used === 0) && !a.solution_revealed
  ).length;

  // Most recent attempt metrics
  const latestAttempt = sortedAttempts[sortedAttempts.length - 1];
  const confidenceBeforeChallenge = latestAttempt?.confidence_before_attempt ?? 5;
  const observedOutcome: EvaluationVerdict | null =
    latestAttempt?.verdict || latestAttempt?.evaluation?.verdict || null;
  const hintsUsed =
    latestAttempt?.hint_tier_reached ?? latestAttempt?.hint_tier_used ?? 0;
  const retryCount = latestAttempt?.retry_count ?? Math.max(0, totalAttempts - 1);
  const solutionRevealed = sortedAttempts.some((a) => a.solution_revealed);
  const evaluatorConfidence =
    latestAttempt?.evaluator_confidence ?? latestAttempt?.evaluation?.evaluator_confidence;

  // Canonical concept capabilities
  const canonicalCaps = concept.capabilities.map(formatCapabilityLabel);

  // Tracking maps for aggregation
  const demonstratedMap = new Map<string, { count: number; autonomous: number; quotes: string[] }>();
  const missingMap = new Map<string, { count: number; quotes: string[] }>();

  // Aggregate demonstrated & missing across all evaluated attempts
  sortedAttempts.forEach((att) => {
    const demonstratedList = att.demonstrated_capabilities || att.evaluation?.demonstrated_capabilities || [];
    const missingList = att.missing_capabilities || att.evaluation?.missing_capabilities || [];
    const evidenceList = att.evidence || att.evaluation?.evidence || [];
    const isAutonomous = (att.hint_tier_reached === 0 || att.hint_tier_used === 0) && !att.solution_revealed;

    demonstratedList.forEach((cap) => {
      const formatted = formatCapabilityLabel(cap);
      const existing = demonstratedMap.get(formatted) || { count: 0, autonomous: 0, quotes: [] };
      existing.count += 1;
      if (isAutonomous) existing.autonomous += 1;
      if (evidenceList.length > 0) {
        existing.quotes.push(...evidenceList.slice(0, 2));
      }
      demonstratedMap.set(formatted, existing);
    });

    missingList.forEach((cap) => {
      const formatted = formatCapabilityLabel(cap);
      const existing = missingMap.get(formatted) || { count: 0, quotes: [] };
      existing.count += 1;
      missingMap.set(formatted, existing);
    });
  });

  // Categorize capabilities into: Demonstrated, Developing, Insufficient evidence
  const demonstratedItems: CapabilityEvidenceItem[] = [];
  const developingItems: CapabilityEvidenceItem[] = [];
  const insufficientItems: CapabilityEvidenceItem[] = [];

  // Union of all known capabilities (canonical + evaluated extras)
  const allKnownCaps = Array.from(
    new Set([
      ...canonicalCaps,
      ...Array.from(demonstratedMap.keys()),
      ...Array.from(missingMap.keys())
    ])
  );

  allKnownCaps.forEach((cap) => {
    // Fuzzy matching against demonstrated / missing keys
    const demKey = Array.from(demonstratedMap.keys()).find(
      (k) => normalizeCapabilityKey(k) === normalizeCapabilityKey(cap)
    );
    const missKey = Array.from(missingMap.keys()).find(
      (k) => normalizeCapabilityKey(k) === normalizeCapabilityKey(cap)
    );

    const demStats = demKey ? demonstratedMap.get(demKey) : undefined;
    const missStats = missKey ? missingMap.get(missKey) : undefined;

    const demCount = demStats?.count || 0;
    const autoCount = demStats?.autonomous || 0;
    const missCount = missStats?.count || 0;
    const quotes = Array.from(new Set(demStats?.quotes || []));

    if (demCount > 0 && missCount === 0) {
      // Demonstrated cleanly
      const note =
        demCount === 1
          ? 'Demonstrated in 1 attempt (provisional evidence; additional non-overlapping challenges recommended for consistency)'
          : `Demonstrated across ${demCount} attempts (${autoCount} autonomous unassisted)`;

      demonstratedItems.push({
        capability: cap,
        status: 'Demonstrated',
        demonstratedCount: demCount,
        missingCount: 0,
        autonomousCount: autoCount,
        notes: note,
        evidenceQuotes: quotes
      });
    } else if (demCount > 0 && missCount > 0) {
      // Mixed evidence across attempts
      if (demCount > missCount && autoCount > 0) {
        demonstratedItems.push({
          capability: cap,
          status: 'Demonstrated',
          demonstratedCount: demCount,
          missingCount: missCount,
          autonomousCount: autoCount,
          notes: `Demonstrated in recent attempts; previously flagged as developing (${missCount} missing observations)`,
          evidenceQuotes: quotes
        });
      } else {
        developingItems.push({
          capability: cap,
          status: 'Developing',
          demonstratedCount: demCount,
          missingCount: missCount,
          autonomousCount: autoCount,
          notes: `Emerging demonstration (${demCount} observed vs ${missCount} missing across attempts)`,
          evidenceQuotes: quotes
        });
      }
    } else if (missCount > 0 && demCount === 0) {
      // Strictly missing / developing
      developingItems.push({
        capability: cap,
        status: 'Developing',
        demonstratedCount: 0,
        missingCount: missCount,
        autonomousCount: 0,
        notes: `Identified as missing in ${missCount} evaluated attempt${missCount > 1 ? 's' : ''}`,
        evidenceQuotes: []
      });
    } else {
      // Unobserved in current attempts
      insufficientItems.push({
        capability: cap,
        status: 'Insufficient evidence',
        demonstratedCount: 0,
        missingCount: 0,
        autonomousCount: 0,
        notes: 'Not directly tested in completed challenges yet',
        evidenceQuotes: []
      });
    }
  });

  return {
    concept_id: concept.id,
    concept_name: concept.name,
    domain: concept.domain,
    underlying_skill: concept.underlyingSkill,
    challenges_attempted: challengesAttempted,
    total_attempts: totalAttempts,
    autonomous_attempts: autonomousAttempts,
    demonstrated: demonstratedItems,
    developing: developingItems,
    insufficient_evidence: insufficientItems,
    confidence_before_challenge: confidenceBeforeChallenge,
    observed_outcome: observedOutcome,
    hints_used: hintsUsed,
    retry_count: retryCount,
    solution_revealed: solutionRevealed,
    evaluator_confidence: evaluatorConfidence,
    attempts: sortedAttempts.reverse() // Most recent first for display
  };
}

/**
 * Returns evidence profiles for all concepts that have at least 1 attempt,
 * keeping different concepts strictly separated.
 */
export function getAllConceptEvidenceProfiles(): ConceptCapabilityEvidence[] {
  const allAttempts = getAllAttempts();

  // Find all concepts that have attempts
  const conceptIdsWithAttempts = Array.from(
    new Set(allAttempts.map((a) => a.concept_id))
  );

  const profiles: ConceptCapabilityEvidence[] = [];

  // First process concepts with active attempts
  conceptIdsWithAttempts.forEach((cid) => {
    const concept = getConceptById(cid);
    if (concept) {
      profiles.push(buildConceptEvidenceProfile(concept, allAttempts));
    }
  });

  return profiles;
}

/**
 * Returns evidence profile for a specific concept id (or unattempted profile)
 */
export function getConceptEvidenceProfileById(conceptId: string): ConceptCapabilityEvidence | null {
  const concept = getConceptById(conceptId);
  if (!concept) return null;
  const allAttempts = getAllAttempts();
  return buildConceptEvidenceProfile(concept, allAttempts);
}
