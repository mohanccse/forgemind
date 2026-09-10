import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGenAI } from '@/lib/gemini';
import { saveChallengeToDb, getChallengeFromDb } from '@/lib/supabase-store';
import { CURATED_NOVEL_CHALLENGES } from '@/data/curatedNovelChallenges';
import { validateGeneratedChallenge } from '@/utils/challengeValidator';

export async function POST(request: Request) {
  let sourceType: 'LIBRARY' | 'USER_GENERATED' = 'LIBRARY';
  try {
    const body = await request.json();
    const { concept, difficulty } = body;

    if (!concept || !concept.name || !concept.underlyingSkill) {
      return NextResponse.json(
        { error: 'Invalid request: concept object with name and underlyingSkill is required.' },
        { status: 400 }
      );
    }

    const conceptId = concept.id || 'custom-concept';
    const targetDifficulty = difficulty || concept.approximateDifficulty || 'Applied';
    sourceType = (body.sourceType || concept.sourceType) === 'USER_GENERATED' ? 'USER_GENERATED' : 'LIBRARY';

    // Door 1 (Content Library): Zero live LLM calls for challenge generation.
    if (sourceType === 'LIBRARY' || CURATED_NOVEL_CHALLENGES[conceptId]) {
      const dbCurated = await getChallengeFromDb(conceptId);
      const curated = CURATED_NOVEL_CHALLENGES[conceptId] || dbCurated;
      if (curated && curated.sourceType !== 'USER_GENERATED') {
        await saveChallengeToDb(curated);
        return NextResponse.json({
          success: true,
          challenge: curated,
          source: 'curated-baseline'
        });
      }
    }

    const systemInstruction = `You are ForgeMind's Challenge Engine.
ForgeMind's tagline is: "You learned it. Now prove you can use it."
Its core purpose is to remove the learner's reference material and observe whether they can independently apply what they studied to an unfamiliar, real-world situation.

CRITICAL RULES:
1. TEST APPLICATION, NOT RECOGNITION:
   - NEVER ask the user to define, explain, or regurgitate a concept or formula.
   - NEVER ask "What is X?" or "Explain the components of Y."
   - Build a realistic workplace/technical dilemma where the user MUST apply the concept's principles to make a concrete decision, perform a calculation, write code/queries, or resolve a conflict.
2. NOVEL CONTEXT:
   - Use a completely different context/domain from the concept's sample learning material.
   - Give realistic roles, constraints, numbers, trade-offs, and stakes.
3. CONSTRAINTS & TRADE-OFFS:
   - Include realistic constraints (e.g., budget, capacity, time, conflicting stakeholder motives, missing data, noise).
   - Require the learner to produce an answer (e.g. decision memo, architecture specification, SQL query, audit plan).
4. AVOID REVEALING THE SOLUTION:
   - Do not give away the answer or optimal choice in the prompt text.
5. HIDDEN EVALUATION METADATA & TARGETED MICRO-QUESTIONS:
   - capabilityTested: Clear summary of the specific capability evaluated.
   - structuralMilestones: Array of 3-5 sequential reasoning milestones needed to solve this.
   - microQuestions: Array of 3-5 short, targeted 1-line questions corresponding 1-to-1 to each structuralMilestone (e.g. "Unit Normalization: Does your Reach metric represent contractor accounts or sensors — and why, in one line?").
   - acceptableAlternativeReasoning: Array of 1-3 valid alternative perspectives or trade-off approaches.
   - referenceSolution: A rigorous, complete model answer and trade-off justification for internal evaluation.
6. 5-TIER PROGRESSIVE HINT LADDER:
   - Tier 1: Nudge (A subtle observation prompt about what to inspect)
   - Tier 2: Direction (Points the learner toward the right mathematical or conceptual relationship)
   - Tier 3: Concept reminder (Recalls the core principle or mechanism without applying it)
   - Tier 4: Structural guidance (Provides an analytical framework, step-by-step methodology, or structural blueprint to apply — MUST NOT contain explicit final numbers or copy-pasteable submission text)
   - Tier 5: Reference explanation (Provides a conceptual explanation of the correct underlying reasoning and trade-off defense for internal understanding — MUST NOT be formatted as a copy-pasteable final submission)
   Each hint must have: tier (1-5), type ('Nudge' | 'Direction' | 'Concept reminder' | 'Structural guidance' | 'Solution reveal'), title, hint, penaltyDescription (e.g. '-5% on Raw Independence', '-12%', '-20%', '-35%', '-60%').`;

    const promptContent = `CONCEPT TO EVALUATE:
Name: ${concept.name}
Domain: ${concept.domain}
Description: ${concept.description}
Underlying Skill to Test: ${concept.underlyingSkill}
Key Capabilities: ${JSON.stringify(concept.capabilities || [])}
Common Pitfalls / Failure Modes to Test Against: ${JSON.stringify(concept.commonFailureModes || [])}
Target Difficulty: ${targetDifficulty}

Generate a GENUINELY NOVEL scenario where a professional in an unfamiliar situation must independently apply this concept to solve an authentic dilemma. Make sure the scenario is novel, realistic, contains trade-offs, and produces the required 5-tier hint ladder, microQuestions, and hidden metadata.`;

    const ai = getGenAI();
    if (!ai) {
      // Fallback to domain-matched curated challenge if GEMINI_API_KEY is not configured
      let fallbackKey = 'rice-prioritization';
      if (concept.domain === 'SQL / Data') fallbackKey = 'sql-joins';
      if (concept.domain === 'AI / Technology') fallbackKey = 'rag-triad-evaluation';

      const curatedFallback = CURATED_NOVEL_CHALLENGES[fallbackKey] || CURATED_NOVEL_CHALLENGES['rice-prioritization'];
      if (curatedFallback) {
        const adapted = {
          ...curatedFallback,
          id: `fallback-${conceptId}-${Date.now()}`,
          conceptId,
          conceptName: concept.name,
          domain: concept.domain || curatedFallback.domain
        };
        await saveChallengeToDb(adapted);
        return NextResponse.json({
          success: true,
          challenge: adapted,
          source: 'curated-fallback',
          notice: 'GEMINI_API_KEY is not configured in .env.local. Served domain-matched challenge baseline so execution is not blocked.'
        });
      }

      const syntheticFallback = createSyntheticChallengeFromConcept(concept, targetDifficulty, sourceType);
      await saveChallengeToDb(syntheticFallback);
      return NextResponse.json({
        success: true,
        challenge: syntheticFallback,
        source: 'synthetic-recovery',
        notice: 'Served resilient synthetic challenge baseline matching extracted concept capability model.'
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContent,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Engaging, professional title for the novel challenge' },
            scenario: { type: Type.STRING, description: 'Detailed unfamiliar workplace scenario setting the stage' },
            contextData: { type: Type.STRING, description: 'Telemetry, figures, metrics, schemas, or constraints data' },
            mandate: { type: Type.STRING, description: 'Explicit specific instructions on what the learner must produce' },
            constraints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Hard boundaries, constraints, or guardrails for the solution'
            },
            expectedOutputFormat: { type: Type.STRING, description: 'Expected deliverable structure (e.g. Decision Memo)' },
            capabilityTested: { type: Type.STRING, description: 'Underlying operational capability evaluated' },
            structuralMilestones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key sequential reasoning milestones needed to solve this'
            },
            microQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of 3-5 short 1-line targeted prompts, corresponding 1-to-1 with structuralMilestones'
            },
            acceptableAlternativeReasoning: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Valid alternative paths or trade-off resolutions'
            },
            referenceSolution: { type: Type.STRING, description: 'Complete model answer and trade-off defense' },
            hints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tier: { type: Type.INTEGER, description: '1 to 5' },
                  type: { type: Type.STRING, description: 'Nudge | Direction | Concept reminder | Structural guidance | Solution reveal' },
                  title: { type: Type.STRING, description: 'Short hint title' },
                  hint: { type: Type.STRING, description: 'The progressive hint text' },
                  penaltyDescription: { type: Type.STRING, description: 'e.g. -5% on Raw Independence' }
                },
                required: ['tier', 'type', 'title', 'hint', 'penaltyDescription']
              },
              description: 'Exactly 5 progressive hints matching the hint ladder'
            }
          },
          required: [
            'title',
            'scenario',
            'mandate',
            'constraints',
            'expectedOutputFormat',
            'capabilityTested',
            'structuralMilestones',
            'microQuestions',
            'acceptableAlternativeReasoning',
            'referenceSolution',
            'hints'
          ]
        }
      }
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty response received from Gemini model.');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      throw new Error('Malformed JSON output received from AI model.');
    }

    const challenge = {
      ...parsedData,
      id: `gen-${conceptId}-${Date.now()}`,
      conceptId,
      conceptName: concept.name,
      domain: concept.domain || 'AI Product Management',
      difficulty: targetDifficulty,
      sourceType
    };

    const validation = validateGeneratedChallenge(challenge);
    if (!validation.isValid) {
      if (CURATED_NOVEL_CHALLENGES[conceptId]) {
        const fallback = { ...CURATED_NOVEL_CHALLENGES[conceptId], sourceType };
        await saveChallengeToDb(fallback);
        return NextResponse.json({
          challenge: fallback,
          source: 'curated-fallback',
          validationWarning: validation.errors
        });
      }
      return NextResponse.json(
        { error: 'Generated challenge did not pass structural validation.', details: validation.errors },
        { status: 422 }
      );
    }

    await saveChallengeToDb(challenge);

    return NextResponse.json({
      challenge,
      source: 'gemini'
    });
  } catch (error: any) {
    console.warn('AI challenge generation failed or rate limited in Next.js route, switching to synthetic recovery:', error.message || error);

    // Dynamic synthetic challenge generator for Door 2 (User-uploaded study materials)
    const bodyData = await request.clone().json().catch(() => ({}));
    const concept = bodyData.concept || { id: 'custom', name: 'Study Material Benchmark' };
    const difficulty = bodyData.difficulty || 'Applied';

    if (CURATED_NOVEL_CHALLENGES[concept.id]) {
      const curated = CURATED_NOVEL_CHALLENGES[concept.id];
      await saveChallengeToDb(curated);
      return NextResponse.json({
        challenge: curated,
        source: 'curated-recovery',
        originalError: error.message
      });
    }

    const syntheticChallenge = createSyntheticChallengeFromConcept(concept, difficulty, sourceType);
    await saveChallengeToDb(syntheticChallenge);

    return NextResponse.json({
      challenge: syntheticChallenge,
      source: 'synthetic-recovery',
      notice: 'Gemini API quota exceeded or unavailable. Served a resilient synthetic challenge based on your study material capability model.'
    });
  }
}

function createSyntheticChallengeFromConcept(
  concept: any,
  targetDifficulty: string = 'Applied',
  sourceType: 'LIBRARY' | 'USER_GENERATED' = 'USER_GENERATED'
): any {
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
    difficulty: targetDifficulty,
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
