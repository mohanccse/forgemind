import { GeneratedChallenge, ProgressiveHint, HintTier, HintType } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateGeneratedChallenge(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Response is not a valid object.'] };
  }

  if (typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.push('Challenge title is missing or too short.');
  }

  if (typeof data.scenario !== 'string' || data.scenario.trim().length < 30) {
    errors.push('Scenario description is missing or insufficient for an authentic problem.');
  }

  if (typeof data.mandate !== 'string' || data.mandate.trim().length < 10) {
    errors.push('Specific mandate/task is missing or too short.');
  }

  if (!Array.isArray(data.constraints) || data.constraints.length < 2) {
    errors.push('At least two concrete constraints are required.');
  } else {
    data.constraints.forEach((c: any, i: number) => {
      if (typeof c !== 'string' || c.trim().length === 0) {
        errors.push(`Constraint #${i + 1} is empty.`);
      }
    });
  }

  if (typeof data.expectedOutputFormat !== 'string' || data.expectedOutputFormat.trim().length < 3) {
    errors.push('Expected output format specification is required.');
  }

  // Source type validation: must be 'LIBRARY' or 'USER_GENERATED'
  if (data.sourceType && data.sourceType !== 'LIBRARY' && data.sourceType !== 'USER_GENERATED') {
    errors.push("sourceType must be either 'LIBRARY' or 'USER_GENERATED'.");
  }

  // Hidden metadata validation
  if (typeof data.capabilityTested !== 'string' || data.capabilityTested.trim().length < 5) {
    errors.push('Capability tested statement is required in hidden metadata.');
  }

  if (!Array.isArray(data.structuralMilestones) || data.structuralMilestones.length < 2) {
    errors.push('At least two structural milestones are required in hidden metadata.');
  }

  if (!Array.isArray(data.acceptableAlternativeReasoning) || data.acceptableAlternativeReasoning.length < 1) {
    errors.push('At least one acceptable alternative reasoning path is required in hidden metadata.');
  }

  if (typeof data.referenceSolution !== 'string' || data.referenceSolution.trim().length < 15) {
    errors.push('A complete reference solution is required in hidden metadata.');
  }

  // 5 progressive hints validation
  if (!Array.isArray(data.hints) || data.hints.length !== 5) {
    errors.push('Exactly 5 progressive hints are required (Tiers 1 to 5).');
  } else {
    const expectedTiers: { tier: HintTier; type: HintType }[] = [
      { tier: 1, type: 'Nudge' },
      { tier: 2, type: 'Direction' },
      { tier: 3, type: 'Concept reminder' },
      { tier: 4, type: 'Structural guidance' },
      { tier: 5, type: 'Solution reveal' }
    ];

    data.hints.forEach((h: any, index: number) => {
      const expected = expectedTiers[index];
      if (!h || typeof h !== 'object') {
        errors.push(`Hint tier ${index + 1} is invalid.`);
        return;
      }
      if (h.tier !== expected.tier) {
        errors.push(`Hint #${index + 1} tier mismatch (expected ${expected.tier}, got ${h.tier}).`);
      }
      if (typeof h.title !== 'string' || h.title.trim().length === 0) {
        errors.push(`Hint tier ${expected.tier} title is missing.`);
      }
      if (typeof h.hint !== 'string' || h.hint.trim().length < 5) {
        errors.push(`Hint tier ${expected.tier} content is missing or too brief.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
