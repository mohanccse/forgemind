import {
  Concept,
  ExtractedConceptCandidate,
  NormalizedStudyContent,
  Domain
} from '../types';
import { getOrCreateLearnerId } from './attemptService';

const STORAGE_KEY = 'forgemind_user_concepts';

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
 * Loads all user-generated concepts isolated for the active learner
 */
export function getUserGeneratedConcepts(specificLearnerId?: string): Concept[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: (Concept & { owner_id?: string })[] = JSON.parse(raw);
    const activeLearnerId = specificLearnerId || getOrCreateLearnerId();
    // Database Isolation: Only return user-generated concepts belonging to this learner
    return all.filter((c) => !c.owner_id || c.owner_id === activeLearnerId);
  } catch (err) {
    console.error('Failed to load user concepts:', err);
    return [];
  }
}

/**
 * Finds a user concept by id
 */
export function getUserConceptById(id: string): Concept | undefined {
  const all = getUserGeneratedConcepts();
  return all.find((c) => c.id === id);
}

/**
 * Step 7: Stores the confirmed user concept as user-owned
 * - marks source_type = USER_GENERATED
 * - stores its capability model
 * - associates with active learner for database isolation
 * - prepares for routing into existing Challenge Engine
 */
export function saveConfirmedUserConcept(
  candidate: ExtractedConceptCandidate,
  normalizedContent: NormalizedStudyContent
): Concept {
  const timestamp = Date.now();
  const slug = slugify(candidate.concept_name) || 'custom-concept';
  const conceptId = `ug_${slug}_${timestamp.toString(36)}`;
  const learnerId = getOrCreateLearnerId();

  const newConcept: Concept & { owner_id?: string } = {
    id: conceptId,
    name: candidate.concept_name,
    domain: candidate.domain || 'AI / Technology',
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
      const existing = getUserGeneratedConcepts();
      // Prepend so the newest user concept appears first
      const updated = [newConcept, ...existing.filter((c) => c.id !== conceptId)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist user concept:', err);
    }
  }

  return newConcept;
}

/**
 * Deletes a user concept by id
 */
export function deleteUserConcept(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getUserGeneratedConcepts();
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete user concept:', err);
  }
}
