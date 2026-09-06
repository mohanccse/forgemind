import { NextResponse } from 'next/server';
import { serverChallengeStore, serverHintStateStore } from '@/lib/serverStore';
import { CURATED_NOVEL_CHALLENGES } from '@/data/curatedNovelChallenges';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      challengeId: bodyChallengeId,
      requestedTier,
      lastVerdict,
      attemptNumber = 1,
      conceptId,
      learner_id,
      learnerId: altLearnerId,
      challenge: clientChallenge
    } = body;

    const challengeId = bodyChallengeId || body.id;
    const learnerId = learner_id || altLearnerId || 'default_learner';
    const stateKey = `${learnerId}:${challengeId}`;

    let challenge =
      serverChallengeStore.get(challengeId) ||
      CURATED_NOVEL_CHALLENGES[conceptId] ||
      CURATED_NOVEL_CHALLENGES[challengeId] ||
      clientChallenge;

    if (!challenge) {
      const found = Object.values(CURATED_NOVEL_CHALLENGES).find(
        (c: any) => c.id === challengeId || c.conceptId === conceptId
      );
      if (found) challenge = found;
    }

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge definition not found in server registry.' },
        { status: 404 }
      );
    }

    serverChallengeStore.set(challenge.id, challenge);

    let hintState = serverHintStateStore.get(stateKey);
    if (!hintState) {
      hintState = {
        challenge_id: challengeId,
        concept_id: conceptId || challenge.conceptId,
        learner_id: learnerId,
        current_tier: 0,
        unlocked_tiers: [],
        last_unlocked_at_attempt: 0,
        attempts_since_last_hint: 0,
        progression_frozen: false,
        solution_revealed: false,
        evaluation_flagged: false
      };
      serverHintStateStore.set(stateKey, hintState);
    }

    if (lastVerdict === 'NEEDS_CLARIFICATION' || hintState.progression_frozen) {
      hintState.progression_frozen = true;
      hintState.frozen_reason =
        'Evaluation returned NEEDS_CLARIFICATION. Progression is frozen until a clarified attempt is submitted.';
      serverHintStateStore.set(stateKey, hintState);
      return NextResponse.json(
        {
          success: false,
          error: 'Hint progression is frozen. The evaluator requested clarification. Clarify or retry your submission before advancing hints.',
          frozen: true,
          state: hintState
        },
        { status: 400 }
      );
    }

    if (lastVerdict === 'CORRECT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Capability already demonstrated (CORRECT). No hints are required.',
          state: hintState
        },
        { status: 400 }
      );
    }

    const targetTier = parseInt(requestedTier, 10);
    if (isNaN(targetTier) || targetTier < 1 || targetTier > 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid hint tier. Must be an integer from 1 to 5.' },
        { status: 400 }
      );
    }

    if (targetTier !== hintState.current_tier + 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot skip tiers. You must unlock Tier ${hintState.current_tier + 1} next.`,
          state: hintState
        },
        { status: 400 }
      );
    }

    if (hintState.current_tier >= 1 && attemptNumber <= hintState.last_unlocked_at_attempt) {
      return NextResponse.json(
        {
          success: false,
          error: `Submit a retry attempt after viewing Tier ${hintState.current_tier} before requesting Tier ${targetTier}.`,
          state: hintState
        },
        { status: 400 }
      );
    }

    if (targetTier === 5 && (hintState.current_tier < 4 || attemptNumber <= hintState.last_unlocked_at_attempt)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tier 5 (Solution Reveal) is not available before completing progression through Tier 4 and submitting a retry attempt.',
          state: hintState
        },
        { status: 400 }
      );
    }

    const storedHint = challenge.hints?.find((h: any) => h.tier === targetTier);

    hintState.current_tier = targetTier;
    if (!hintState.unlocked_tiers.includes(targetTier)) {
      hintState.unlocked_tiers.push(targetTier);
    }
    hintState.last_unlocked_at_attempt = attemptNumber;
    hintState.attempts_since_last_hint = 0;

    if (targetTier === 5) {
      hintState.solution_revealed = true;
      hintState.solution_revealed_at = new Date().toISOString();
    }

    serverHintStateStore.set(stateKey, hintState);

    return NextResponse.json({
      success: true,
      tier: targetTier,
      hint: storedHint || {
        tier: targetTier,
        type: targetTier === 1 ? 'Nudge' : targetTier === 2 ? 'Direction' : targetTier === 3 ? 'Concept reminder' : targetTier === 4 ? 'Structural guidance' : 'Solution reveal',
        title: `Tier ${targetTier} Guidance`,
        hint: targetTier === 5 ? challenge.referenceSolution : 'Guidance unlocked.',
        penaltyDescription: targetTier === 1 ? '-5%' : targetTier === 2 ? '-12%' : targetTier === 3 ? '-20%' : targetTier === 4 ? '-35%' : '-60%'
      },
      solution: targetTier === 5 ? challenge.referenceSolution : undefined,
      solution_revealed: targetTier === 5,
      state: hintState
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process hint request.' },
      { status: 500 }
    );
  }
}
