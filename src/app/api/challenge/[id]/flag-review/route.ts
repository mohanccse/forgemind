import { NextResponse } from 'next/server';
import { serverHintStateStore } from '@/lib/serverStore';
import { sanitizeText, stripHtml } from '@/utils/sanitizer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;
    const body = await request.json();
    const { attemptId, conceptId, reason, learner_id, learnerId: altLearnerId } = body;

    const learnerId = learner_id || altLearnerId || 'default_learner';
    const stateKey = `${learnerId}:${challengeId}`;

    let hintState = serverHintStateStore.get(stateKey);
    if (!hintState) {
      hintState = {
        challenge_id: challengeId,
        concept_id: conceptId || 'unknown',
        learner_id: learnerId,
        current_tier: 4,
        unlocked_tiers: [1, 2, 3, 4],
        last_unlocked_at_attempt: 1,
        attempts_since_last_hint: 1,
        progression_frozen: false,
        solution_revealed: false,
        evaluation_flagged: false
      };
    }

    if (hintState.current_tier < 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evaluation override is only available after reaching Tier 4.'
        },
        { status: 403 }
      );
    }

    const rationale = stripHtml(
      sanitizeText(reason || 'Learner flagged evaluation for instructor review (valid technical alternative).')
    );
    const nowIso = new Date().toISOString();

    hintState.evaluation_flagged = true;
    hintState.flagged_review_reason = rationale;
    hintState.flagged_at = nowIso;
    hintState.flagged_attempt_id = attemptId;
    serverHintStateStore.set(stateKey, hintState);

    return NextResponse.json({
      success: true,
      flagged: true,
      flagged_at: nowIso,
      state: hintState
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process flag-review request.' },
      { status: 500 }
    );
  }
}
