import { Concept, GeneratedChallenge, DifficultyLevel, ChallengeSourceType } from '../types';
import { validateGeneratedChallenge } from '../utils/challengeValidator';
import { getCuratedNovelChallenge } from '../data/curatedNovelChallenges';

export interface GenerateChallengeResult {
  success: boolean;
  challenge?: GeneratedChallenge;
  error?: string;
  source?: 'gemini' | 'curated-baseline' | 'curated-fallback' | 'curated-recovery' | 'client-fallback';
}

export async function generateNovelChallenge(
  concept: Concept,
  difficulty?: DifficultyLevel | string,
  sourceType: ChallengeSourceType = 'LIBRARY'
): Promise<GenerateChallengeResult> {
  try {
    const response = await fetch('/api/generate-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        concept,
        difficulty: difficulty || concept.approximateDifficulty || 'Applied',
        sourceType
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Server responded with status ${response.status}`;

      // Check if we have a curated backup before declaring failure
      const curated = getCuratedNovelChallenge(concept.id);
      if (curated) {
        return {
          success: true,
          challenge: { ...curated, sourceType },
          source: 'curated-recovery',
          error: errorMessage
        };
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    const data = await response.json();
    const effectiveSource: ChallengeSourceType =
      (concept.sourceType === 'USER_GENERATED' || sourceType === 'USER_GENERATED' || concept.isUserOwned)
        ? 'USER_GENERATED'
        : (data.challenge?.sourceType || sourceType);

    const challenge: GeneratedChallenge = {
      ...data.challenge,
      domain: 'AI Product Management',
      sourceType: effectiveSource
    };

    // Validate structured response
    const validation = validateGeneratedChallenge(challenge);
    if (!validation.isValid) {
      console.warn('Client validation warning for received challenge:', validation.errors);
      // If validation fails, try curated fallback
      const curated = getCuratedNovelChallenge(concept.id);
      if (curated) {
        return {
          success: true,
          challenge: { ...curated, sourceType },
          source: 'curated-fallback'
        };
      }
      return {
        success: false,
        error: `Generated challenge format was incomplete: ${validation.errors.join(', ')}`
      };
    }

    return {
      success: true,
      challenge,
      source: data.source || 'gemini'
    };
  } catch (err: any) {
    console.error('Network or execution error while generating challenge:', err);

    // If fetch failed completely (e.g. server booting or offline), use curated if available
    const curated = getCuratedNovelChallenge(concept.id);
    if (curated) {
      return {
        success: true,
        challenge: { ...curated, sourceType },
        source: 'client-fallback',
        error: err.message
      };
    }

    // Client-side synthetic fallback generator for custom/Door 2 concepts
    const synth = createClientSyntheticChallenge(concept, difficulty, sourceType);
    return {
      success: true,
      challenge: synth,
      source: 'client-fallback',
      error: err.message
    };
  }
}

function createClientSyntheticChallenge(
  concept: Concept,
  difficulty?: string,
  sourceType: ChallengeSourceType = 'USER_GENERATED'
): GeneratedChallenge {
  const conceptId = concept.id || `custom-${Date.now()}`;
  const conceptName = concept.name || 'Study Material Benchmark';
  const domain = concept.domain || 'Applied Engineering & PM';
  const skill = concept.underlyingSkill || conceptName;

  const caps = Array.isArray(concept.capabilities) && concept.capabilities.length >= 3
    ? concept.capabilities
    : [
        `Defines operational boundary conditions and risks for ${conceptName}.`,
        `Constructs a defensible trade-off matrix balancing speed, cost, and quality.`,
        `Formulates a phased action plan addressing primary constraints.`,
        `Establishes quantitative metrics for post-launch validation.`
      ];

  const milestones = caps.slice(0, 4);
  const microQuestions = milestones.map((m: string, i: number) => {
    return `Step ${i + 1}: ${m} — In 1-2 lines (~160 chars), state your specific reasoning and quantitative boundary.`;
  });

  return {
    id: `syn-${conceptId}-${Date.now()}`,
    conceptId,
    conceptName,
    domain,
    difficulty: (difficulty as DifficultyLevel) || 'Applied',
    sourceType,
    title: `Executive Decision Benchmark: ${conceptName} Scenario`,
    scenario: `You are acting as Principal Specialist evaluating an unfamiliar operational dilemma involving ${conceptName}. The team must determine how best to apply ${skill} under resource constraints and tight timelines.\n\nDescription: ${concept.description || 'Feed study material parameters into a structured decision framework.'}`,
    contextData: `Operational Telemetry:\n- Target Concept: ${conceptName}\n- Primary Bottleneck: ${concept.commonFailureModes?.[0] || 'Operational alignment & trade-off complexity'}\n- Domain: ${domain}\n- Execution Mode: Zero-Reference Applied Synthesis (Resilient Recovery Baseline)`,
    mandate: `Formulate a structured Executive Decision Memo that: 1. Evaluates the core dilemma using ${conceptName} principles, 2. Recommends a concrete sequence of action, 3. Outlines a risk mitigation strategy for cross-functional alignment.`,
    constraints: [
      `Must explicitly address trade-offs and operational boundary conditions for ${conceptName}.`,
      'Must provide a clear step-by-step rationale for all recommendations.',
      'Must state quantitative metrics or success indicators.'
    ],
    expectedOutputFormat: 'Structured Decision Memo',
    capabilityTested: skill,
    structuralMilestones: milestones,
    microQuestions,
    acceptableAlternativeReasoning: [
      'Prioritizing immediate execution velocity over comprehensive validation provided risk mitigation is documented.',
      'Phasing deployment into pilot segments to validate assumptions before full rollout.'
    ],
    referenceSolution: `Model Answer: The optimal approach establishes explicit operational boundaries for ${conceptName} first, quantifies trade-offs between speed and quality, and implements phased validation metrics.`,
    hints: [
      {
        tier: 1,
        type: 'Nudge',
        title: 'Identify Core Bottleneck',
        hint: `Inspect the scenario parameters to identify the primary bottleneck when applying ${conceptName}.`,
        penaltyDescription: '-5% on Raw Independence'
      },
      {
        tier: 2,
        type: 'Direction',
        title: 'Evaluate Trade-offs',
        hint: 'Compare speed vs quality or cost vs accuracy before selecting your recommended sequence of action.',
        penaltyDescription: '-12% on Raw Independence'
      },
      {
        tier: 3,
        type: 'Concept reminder',
        title: 'Concept Principle',
        hint: `Recall that ${conceptName} requires grounding decisions in measurable evidence rather than gut-feeling assumptions.`,
        penaltyDescription: '-20% on Raw Independence'
      },
      {
        tier: 4,
        type: 'Structural guidance',
        title: 'Structured Action Plan',
        hint: 'Structure your response into 4 distinct phases: 1. Boundary identification, 2. Trade-off matrix, 3. Phased steps, 4. Quantitative validation metrics.',
        penaltyDescription: '-35% on Raw Independence'
      },
      {
        tier: 5,
        type: 'Solution reveal',
        title: 'Reference Architecture',
        hint: `Reference Solution: Ground the trade-off defense in ${conceptName} principles by setting explicit thresholds for success and documenting risk boundaries.`,
        penaltyDescription: '-60% on Raw Independence'
      }
    ]
  };
}
