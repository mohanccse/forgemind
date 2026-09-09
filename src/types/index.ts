export type Domain = 'AI Product Management';

export type DifficultyLevel = 'Foundational' | 'Applied' | 'Advanced' | 'Expert';

export interface ChallengeScenario {
  title: string;
  scenario: string;
  contextData?: string;
  task: string;
  constraints: string[];
  expectedOutputFormat: string;
}

export interface Concept {
  id: string;
  name: string;
  domain: Domain;
  description: string;
  underlyingSkill: string;
  capabilities: string[];
  reasoningMilestones: string[];
  decisionPoints: string[];
  acceptableAlternatives: string[];
  commonFailureModes: string[];
  difficultyLevels: DifficultyLevel[];
  approximateDifficulty?: string;
  
  // Scenarios and hints stored for the challenge phase
  challengePreview: ChallengeScenario;
  hints: {
    tier: number;
    title: string;
    hint: string;
    penaltyDescription: string;
  }[];

  // Step 7: User-Owned / BYO Material extensions
  sourceType?: ChallengeSourceType; // 'LIBRARY' | 'USER_GENERATED'
  isUserOwned?: boolean;
  sourceMaterialName?: string;
  normalizedContent?: NormalizedStudyContent;
}

// Step 7: BYO Study Material & Normalized Content Architecture
export type StudyMaterialSourceType = 'paste_text' | 'pdf' | 'docx' | 'audio' | 'video' | 'youtube';

export type ContentProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface NormalizedStudyContent {
  source_type: StudyMaterialSourceType;
  source_name: string;
  normalized_text: string;
  language: string;
  metadata: {
    word_count?: number;
    character_count?: number;
    created_at?: string;
    original_filename?: string;
    original_url?: string;
    [key: string]: any;
  };
  processing_status: ContentProcessingStatus;
  error_message?: string;
}

export interface ExtractedConceptCandidate {
  concept_name: string;
  domain: Domain;
  description: string;
  underlying_skill: string;
  capabilities: string[];
  reasoning_milestones: string[];
  decision_points: string[];
  common_failure_modes?: string[];
  difficulty_levels?: DifficultyLevel[];
  approximate_difficulty?: string;
  confidence_score: number; // 0.0 to 1.0
  confidence_reasoning: string;
  is_confident: boolean; // true if confidence >= 0.65 and text contains substantive operational principles
  insufficient_reason?: string;
  was_truncated?: boolean;
  truncation_notice?: string;
  original_length?: number;
  truncated_length?: number;
}

export type ChallengeSourceType = 'LIBRARY' | 'USER_GENERATED';

export type HintTier = 1 | 2 | 3 | 4 | 5;
export type HintType = 'Nudge' | 'Direction' | 'Concept reminder' | 'Structural guidance' | 'Solution reveal';

export interface ProgressiveHint {
  tier: HintTier;
  type: HintType;
  title: string;
  hint: string;
  penaltyDescription: string;
}

export interface GeneratedChallenge {
  id: string;
  conceptId: string;
  conceptName: string;
  domain: Domain;
  difficulty: DifficultyLevel | string;
  sourceType: ChallengeSourceType;
  title: string;
  scenario: string;
  contextData?: string;
  mandate: string;
  constraints: string[];
  expectedOutputFormat: string;
  microQuestions?: string[];
  
  // Hidden Evaluation Metadata (not shown during independent attempt)
  capabilityTested: string;
  structuralMilestones: string[];
  acceptableAlternativeReasoning: string[];
  referenceSolution: string;
  hints: ProgressiveHint[];
}

export type EvaluationVerdict = 'CORRECT' | 'PARTIALLY_CORRECT' | 'WRONG_APPROACH' | 'NEEDS_CLARIFICATION';

export interface EvaluationResult {
  verdict: EvaluationVerdict;
  demonstrated_capabilities: string[];
  missing_capabilities: string[];
  evidence: string[];
  brief_feedback: string;
  evaluator_confidence: number;
  evaluated_at?: string;
  attempt_id?: string;
}

/**
 * Step 6: CAPABILITY EVIDENCE STORE
 * ForgeMind does not reduce learner performance to a generic numerical score.
 * Every attempt becomes immutable evidence.
 */
export interface LearnerAttempt {
  // Identification & Context
  learner_id: string;
  concept_id: string;
  capability_model_id: string;
  challenge_id: string;
  attempt_id: string;
  session_id?: string;
  source_type?: ChallengeSourceType;

  // Pre-challenge state
  confidence_before_attempt: number; // 1 to 5

  // Learner input
  response: string;
  micro_responses?: { milestone: string; question: string; answer: string }[];
  attempt_number: number;
  retry_count: number; // 0 for initial attempt, 1+ for retries
  created_at: string;
  status: 'draft' | 'submitted';

  // Capability Evaluation Evidence (Flat STORE properties)
  verdict?: EvaluationVerdict;
  demonstrated_capabilities?: string[];
  missing_capabilities?: string[];
  evidence?: string[];
  hint_tier_reached: number; // 0 for autonomous, 1-5
  hint_tier_used?: number; // alias for backwards compatibility
  solution_revealed: boolean;
  evaluator_confidence?: number;
  evaluation_flag: boolean;
  evaluation_flagged?: boolean; // alias for backwards compatibility
  flagged_review_reason?: string;
  flagged_at?: string;

  // Nested object for backward compatibility
  evaluation?: EvaluationResult;
}

/**
 * Accumulated Capability Item
 */
export interface CapabilityEvidenceItem {
  capability: string;
  status: 'Demonstrated' | 'Developing' | 'Insufficient evidence';
  demonstratedCount: number;
  missingCount: number;
  autonomousCount: number; // demonstrated without hints or solution reveal
  notes: string;
  evidenceQuotes: string[];
}

/**
 * Accumulated Concept Evidence Profile
 * Multiple attempts for the same concept accumulate evidence.
 * Different concepts remain strictly separate.
 */
export interface ConceptCapabilityEvidence {
  concept_id: string;
  concept_name: string;
  domain: Domain;
  underlying_skill: string;
  challenges_attempted: number; // count of attempts/challenges
  total_attempts: number;
  autonomous_attempts: number;

  // Categorized capability lists using evidence-based language
  demonstrated: CapabilityEvidenceItem[];
  developing: CapabilityEvidenceItem[];
  insufficient_evidence: CapabilityEvidenceItem[];

  // Observed metrics
  confidence_before_challenge: number; // latest
  observed_outcome: EvaluationVerdict | null; // latest verdict
  hints_used: number; // latest hint tier reached
  retry_count: number; // latest retry count
  solution_revealed: boolean; // whether solution was revealed
  evaluator_confidence?: number;

  // All attempts serving as evidence
  attempts: LearnerAttempt[];
}

export interface ChallengeHintState {
  challenge_id: string;
  concept_id: string;
  current_tier: number; // 0, 1, 2, 3, 4, 5
  unlocked_tiers: number[];
  last_unlocked_at_attempt: number;
  attempts_since_last_hint: number;
  progression_frozen: boolean;
  frozen_reason?: string;
  solution_revealed: boolean;
  solution_revealed_at?: string;
  evaluation_flagged: boolean;
  flagged_review_reason?: string;
  flagged_at?: string;
  last_verdict?: EvaluationVerdict | null;
}

export type ViewTab = 'home' | 'prove' | 'concept-preview' | 'material' | 'challenge' | 'evidence';
