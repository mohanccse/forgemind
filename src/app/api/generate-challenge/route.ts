import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGenAI } from '@/lib/gemini';
import { serverChallengeStore } from '@/lib/serverStore';
import { CURATED_NOVEL_CHALLENGES } from '@/data/curatedNovelChallenges';
import { validateGeneratedChallenge } from '@/utils/challengeValidator';

export async function POST(request: Request) {
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
    const sourceType = (body.sourceType || concept.sourceType) === 'USER_GENERATED' ? 'USER_GENERATED' : 'LIBRARY';

    // Door 1 (Content Library): Zero live LLM calls for challenge generation.
    if (sourceType === 'LIBRARY' || CURATED_NOVEL_CHALLENGES[conceptId]) {
      const curated = CURATED_NOVEL_CHALLENGES[conceptId] || serverChallengeStore.get(conceptId);
      if (curated && curated.sourceType !== 'USER_GENERATED') {
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
        serverChallengeStore.set(adapted.id, adapted);
        return NextResponse.json({
          success: true,
          challenge: adapted,
          source: 'curated-fallback',
          notice: 'GEMINI_API_KEY is not configured in .env.local. Served domain-matched challenge baseline so execution is not blocked.'
        });
      }

      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to .env.local to enable custom AI challenge generation.', code: 'MISSING_API_KEY' },
        { status: 503 }
      );
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
      id: `gen-${conceptId}-${Date.now()}`,
      conceptId,
      conceptName: concept.name,
      domain: concept.domain,
      difficulty: targetDifficulty,
      sourceType,
      ...parsedData
    };

    const validation = validateGeneratedChallenge(challenge);
    if (!validation.isValid) {
      if (CURATED_NOVEL_CHALLENGES[conceptId]) {
        return NextResponse.json({
          challenge: {
            ...CURATED_NOVEL_CHALLENGES[conceptId],
            sourceType
          },
          source: 'curated-fallback',
          validationWarning: validation.errors
        });
      }
      return NextResponse.json(
        { error: 'Generated challenge did not pass structural validation.', details: validation.errors },
        { status: 422 }
      );
    }

    serverChallengeStore.set(challenge.id, challenge);

    return NextResponse.json({
      challenge,
      source: 'gemini'
    });
  } catch (error: any) {
    console.error('Error in /api/generate-challenge:', error);

    const curatedFallback = CURATED_NOVEL_CHALLENGES['rice-prioritization'];
    if (curatedFallback) {
      return NextResponse.json({
        challenge: curatedFallback,
        source: 'curated-recovery',
        originalError: error.message
      });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate novel challenge.' },
      { status: 500 }
    );
  }
}
