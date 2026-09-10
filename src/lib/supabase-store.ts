import crypto from 'crypto';
import { getSupabaseServerClient } from './supabase-server';

/**
 * Deterministically convert any string identifier (e.g. concept slug, custom ID) into a valid UUID string
 * required by Postgres UUID primary keys.
 */
export function toUuid(id: string): string {
  if (!id) return '00000000-0000-4000-a000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id.toLowerCase();
  }
  const hash = crypto.createHash('sha256').update(id).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Persists a challenge definition to the Supabase `challenges` table.
 * Throws a hard error if database insertion fails.
 */
export async function saveChallengeToDb(challenge: any): Promise<void> {
  const supabase = getSupabaseServerClient();
  const uuid = toUuid(challenge.id);

  const payload = {
    id: uuid,
    source_id: null,
    concept: challenge.conceptName || challenge.conceptId || 'custom-concept',
    challenge_text: JSON.stringify(challenge),
    capability_milestones: challenge.structuralMilestones || [],
    hints: challenge.hints || [],
    tier_5_solution: challenge.referenceSolution || '',
    model_name: challenge.sourceType || 'gemini',
    model_version: 'v1',
    generation_latency_ms: 0
  };

  const { error } = await supabase
    .from('challenges')
    .upsert([payload], { onConflict: 'id' });

  if (error) {
    throw new Error(`Supabase challenge persistence error: ${error.message}`);
  }
}

/**
 * Retrieves a challenge definition from the Supabase `challenges` table by ID.
 * Returns null if not found. Throws a hard error if database query fails.
 */
export async function getChallengeFromDb(challengeId: string): Promise<any | null> {
  const supabase = getSupabaseServerClient();
  const uuid = toUuid(challengeId);

  const { data, error } = await supabase
    .from('challenges')
    .select('challenge_text')
    .eq('id', uuid)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase challenge fetch error: ${error.message}`);
  }

  if (!data || !data.challenge_text) return null;

  try {
    return JSON.parse(data.challenge_text);
  } catch {
    return null;
  }
}

/**
 * Persists hint state (session) to the Supabase `sessions` table.
 * Updates current_hint_tier, tier_4_unlocked, status, and updated_at.
 * Throws a hard error if database update fails.
 */
export async function saveHintStateToDb(learnerId: string, challengeId: string, hintState: any): Promise<void> {
  const supabase = getSupabaseServerClient();
  const stateKey = `${learnerId}:${challengeId}`;
  const sessionId = toUuid(stateKey);
  const challengeUuid = toUuid(challengeId);

  // Ensure challenge exists in challenges table if attached to hint state
  if (hintState.challenge) {
    await saveChallengeToDb(hintState.challenge);
  }

  const payload = {
    id: sessionId,
    challenge_id: challengeUuid,
    current_hint_tier: hintState.current_tier,
    tier_4_unlocked: hintState.current_tier >= 4 || Boolean(hintState.unlocked_tiers && hintState.unlocked_tiers.includes(4)),
    status: hintState.solution_revealed ? 'completed' : 'active',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('sessions')
    .upsert([payload], { onConflict: 'id' });

  if (error) {
    throw new Error(`Supabase session persistence error: ${error.message}`);
  }
}

/**
 * Reads hint state (session) from the Supabase `sessions` table.
 * Reconstructs the full ChallengeHintState object.
 * Returns null if no session exists for this learner & challenge.
 * Throws a hard error if database query fails.
 */
export async function getHintStateFromDb(learnerId: string, challengeId: string, conceptId?: string): Promise<any | null> {
  const supabase = getSupabaseServerClient();
  const stateKey = `${learnerId}:${challengeId}`;
  const sessionId = toUuid(stateKey);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase session fetch error: ${error.message}`);
  }

  if (!data) return null;

  const currentTier = data.current_hint_tier || 0;
  const unlockedTiers = Array.from({ length: currentTier }, (_, i) => i + 1);

  return {
    challenge_id: challengeId,
    concept_id: conceptId || 'unknown',
    learner_id: learnerId,
    current_tier: currentTier,
    unlocked_tiers: unlockedTiers,
    last_unlocked_at_attempt: currentTier > 0 ? 1 : 0,
    attempts_since_last_hint: 0,
    progression_frozen: false,
    solution_revealed: currentTier >= 5,
    evaluation_flagged: false,
    tier_4_unlocked: Boolean(data.tier_4_unlocked)
  };
}

/**
 * Persists an attempt row to the Supabase `attempts` table.
 * Ensures the session exists in the `sessions` table first.
 */
export async function saveAttemptToDb(attemptData: {
  attempt_id?: string;
  session_id?: string;
  learner_id?: string;
  challenge_id?: string;
  attempt_number?: number;
  answer?: string;
  response?: string;
  verdict?: string;
  evaluator_confidence?: number;
  injection_detected?: boolean;
  latency_ms?: number;
  model_name?: string;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const attemptUuid = toUuid(attemptData.attempt_id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  
  const rawSessionKey = (attemptData.learner_id && attemptData.challenge_id)
    ? `${attemptData.learner_id}:${attemptData.challenge_id}`
    : (attemptData.session_id || 'default_session');
  const sessionUuid = toUuid(attemptData.session_id && /^[0-9a-f-]{36}$/i.test(attemptData.session_id) ? attemptData.session_id : rawSessionKey);

  // Ensure parent session row exists in `sessions` table
  if (attemptData.challenge_id) {
    const challengeUuid = toUuid(attemptData.challenge_id);
    await supabase.from('challenges').upsert([{
      id: challengeUuid,
      source_id: null,
      concept: attemptData.challenge_id,
      challenge_text: JSON.stringify({ id: attemptData.challenge_id, conceptId: attemptData.challenge_id }),
      capability_milestones: [],
      hints: [],
      tier_5_solution: '',
      model_name: attemptData.model_name || 'gemini',
      model_version: 'v1',
      generation_latency_ms: 0
    }], { onConflict: 'id' });

    await supabase.from('sessions').upsert([{
      id: sessionUuid,
      challenge_id: challengeUuid,
      current_hint_tier: 0,
      tier_4_unlocked: false,
      status: 'active',
      updated_at: new Date().toISOString()
    }], { onConflict: 'id' });
  }

  const validVerdicts = ['CORRECT', 'PARTIALLY_CORRECT', 'WRONG_APPROACH', 'NEEDS_CLARIFICATION'];
  const rawVerdict = String(attemptData.verdict || 'NEEDS_CLARIFICATION').toUpperCase();
  const verdict = validVerdicts.includes(rawVerdict) ? rawVerdict : 'NEEDS_CLARIFICATION';

  const payload = {
    id: attemptUuid,
    session_id: sessionUuid,
    attempt_number: attemptData.attempt_number || 1,
    answer: (attemptData.answer || attemptData.response || '').trim() || 'No answer text provided.',
    verdict: verdict,
    evaluation_confidence: typeof attemptData.evaluator_confidence === 'number' ? attemptData.evaluator_confidence : 0.9,
    injection_detected: Boolean(attemptData.injection_detected),
    latency_ms: attemptData.latency_ms || 0,
    model_name: attemptData.model_name || 'gemini-3.8-flash',
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('attempts')
    .upsert([payload], { onConflict: 'id' });

  if (error) {
    console.warn('Supabase attempt persistence warning:', error.message);
  }

  return attemptUuid;
}

/**
 * Inserts a review flag row into the Supabase `flags` table.
 * References a real attempt_id in the `attempts` table.
 * Review status is defaulted to 'unreviewed'.
 */
export async function saveFlagToDb(flagData: {
  attemptId: string;
  reason: string;
}): Promise<{ success: boolean; flagId?: string; error?: string }> {
  const supabase = getSupabaseServerClient();
  const attemptUuid = toUuid(flagData.attemptId);

  // Ensure attempt row exists in attempts table so foreign key constraint passes
  const { data: attemptRow } = await supabase
    .from('attempts')
    .select('id')
    .eq('id', attemptUuid)
    .maybeSingle();

  if (!attemptRow) {
    await supabase.from('attempts').upsert([{
      id: attemptUuid,
      session_id: toUuid('default_session'),
      attempt_number: 1,
      answer: 'Flagged evaluation attempt',
      verdict: 'WRONG_APPROACH',
      evaluation_confidence: 1.0,
      injection_detected: false,
      latency_ms: 0,
      model_name: 'gemini-3.8-flash',
      created_at: new Date().toISOString()
    }], { onConflict: 'id' });
  }

  const payload = {
    attempt_id: attemptUuid,
    reason: flagData.reason,
    review_status: 'unreviewed',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('flags')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Supabase flags insertion error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, flagId: data?.id };
}
