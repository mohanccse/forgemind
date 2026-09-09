import {
  Concept,
  ExtractedConceptCandidate,
  NormalizedStudyContent,
  Domain
} from '../types';
import { getOrCreateLearnerId } from './attemptService';

const STORAGE_KEY = 'forgemind_user_concepts';
const SESSION_ACTIVE_KEY = 'forgemind_active_user_concept';

/**
 * Normalizes a slug ID from concept name
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Purges any dynamically injected user concepts from localStorage to keep the Predefined Content Library pristine
 */
export function purgeUserGeneratedConceptsFromLibrary(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear user concepts from storage:', err);
  }
}

/**
 * Loads user-generated concepts (returns empty as predefined library must not be polluted)
 */
export function getUserGeneratedConcepts(): Concept[] {
  // Purge any previously added user concepts from localStorage
  purgeUserGeneratedConceptsFromLibrary();
  return [];
}

/**
 * Finds a user concept by id from the active session
 */
export function getUserConceptById(id: string): Concept | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (raw) {
      const active: Concept = JSON.parse(raw);
      if (active.id === id) return active;
    }
  } catch (err) {
    // ignore
  }
  return undefined;
}

/**
 * Step 7: Constructs the confirmed user concept for the active Door 2 session.
 * - Stores in sessionStorage so Door 2 can evaluate it in the active session
 * - DOES NOT inject into the Predefined Content Library (Door 1 remains pristine)
 */
export function saveConfirmedUserConcept(
  candidate: ExtractedConceptCandidate,
  normalizedContent: NormalizedStudyContent
): Concept {
  // Purge any previously stored user concepts from localStorage
  purgeUserGeneratedConceptsFromLibrary();

  const timestamp = Date.now();
  const slug = slugify(candidate.concept_name) || 'custom-concept';
  const conceptId = `ug_${slug}_${timestamp.toString(36)}`;
  const learnerId = getOrCreateLearnerId();

  const newConcept: Concept & { owner_id?: string } = {
    id: conceptId,
    name: candidate.concept_name,
    domain: 'AI Product Management',
    description: candidate.description,
    underlyingSkill: candidate.underlying_skill,
    capabilities: candidate.capabilities,
    reasoningMilestones: candidate.reasoning_milestones || [],
    decisionPoints: candidate.decision_points || [],
    acceptableAlternatives: [
      'Empirically validated alternative operational tradeoffs matching industry benchmarks'
    ],
    commonFailureModes: candidate.common_failure_modes || [
      'Conflating theoretical definitions with real-world operational trade-offs',
      'Overlooking boundary constraints under resource pressure'
    ],
    difficultyLevels: candidate.difficulty_levels || ['Applied', 'Advanced'],
    approximateDifficulty: candidate.approximate_difficulty || 'Applied',
    sourceType: 'USER_GENERATED',
    isUserOwned: true,
    owner_id: learnerId,
    sourceMaterialName: normalizedContent.source_name,
    normalizedContent: normalizedContent,

    // Default challenge preview scaffold for UI preview (the live challenge engine generates novel challenges)
    challengePreview: {
      title: `Applied Operational Dilemma: ${candidate.concept_name}`,
      scenario: `An unfamiliar production dilemma applying ${candidate.concept_name} in an unreferenced workplace context.`,
      task: `Independently evaluate the dilemma, demonstrate ${candidate.underlying_skill}, and defend your trade-off with zero reference notes.`,
      constraints: [
        'Do not define textbook terms or formulas.',
        'Address realistic operational constraints and edge cases.',
        'Produce an unassisted concrete recommendation.'
      ],
      expectedOutputFormat: 'Executive Operational Memo'
    },

    hints: [
      {
        tier: 1,
        title: 'Nudge',
        hint: `Inspect the primary trade-off governing ${candidate.concept_name}.`,
        penaltyDescription: '-5% on Raw Independence'
      }
    ]
  };

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify(newConcept));
    } catch (err) {
      console.error('Failed to persist active session concept:', err);
    }
  }

  return newConcept;
}

/**
 * Deletes a user concept
 */
export function deleteUserConcept(id: string): void {
  purgeUserGeneratedConceptsFromLibrary();
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  } catch (err) {
    console.error('Failed to delete user concept:', err);
  }
}
