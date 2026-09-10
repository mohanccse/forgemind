/**
 * Input Sanitation and Safe Rendering Utilities
 * Enforces Production Hardening (Step 8)
 */

/**
 * Strips HTML tags, malicious script injection vectors, and event handler attributes.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Removes dangerous invisible control characters, zero-width spaces, and null bytes
 * while preserving standard whitespace, tabs, and newlines.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Sanitizes and truncates input to a maximum character limit.
 */
export function sanitizeInputLength(input: string, maxLength: number): string {
  const sanitized = sanitizeText(input);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength);
}

/**
 * Supported study-material file types and size limits
 */
export const STUDY_MATERIAL_LIMITS = {
  MIN_CHARS: 30,
  MAX_CHARS: 250000,
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15MB
  ALLOWED_EXTENSIONS: ['.txt', '.md', '.markdown', '.json', '.csv', '.log', '.text', '.pdf', '.docx']
};

export const LEARNER_ATTEMPT_LIMITS = {
  MAX_CHARS: 2000,
  MIN_CHARS: 4
};

export const COMMON_FILLER_PHRASES = [
  'this is it', 'this is what', 'this is a test', 'this is test',
  'this is the answer', 'this is my answer', 'here it is', "i don't know", 'idk',
  'not sure', 'test test', 'hello world', 'sample text', 'placeholder',
  'fill this in', 'nothing to say', 'some text', 'random text', 'default answer',
  'asdf', 'qwerty', 'zxcv', '1234', 'abcd', 'fdsa', 'ytrewq', 'vcxz',
  'aaaa', 'ssss', 'dddd', 'ffff', 'xxxx', 'zzzz', 'qqqq', 'n/a', 'na',
  'none', 'nothing', 'no idea', 'skip', 'pass', 'whatever', 'foo', 'bar',
  'baz', 'abc', 'xyz', 'testing', 'done', 'finished'
];

/**
 * Checks if a string matches a generic filler phrase using strict word boundaries or exact equality.
 */
export function isFillerPhrase(text: string): boolean {
  const lower = (text || '').trim().toLowerCase();
  if (!lower) return true;
  // Substantive text over 35 characters is strictly NEVER a generic filler phrase
  if (lower.length > 35) return false;
  return COMMON_FILLER_PHRASES.some((pattern) => {
    if (lower === pattern) return true;
    if (pattern.length >= 4) {
      const escaped = pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lower) && lower.length < pattern.length + 15;
    }
    return false;
  });
}

/**
 * Validates whether a micro-response input is substantive.
 * Rejects empty text, brief responses under 12 characters, repetitive strings,
 * generic filler phrases (e.g. "this is it", "i don't know"), keyboard mash patterns, and pure whitespace.
 */
export function isSubstantiveInput(text: string): { valid: boolean; reason?: string } {
  const trimmed = (text || '').trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: 'Field cannot be empty.' };
  }

  // Minimum length check (minimum 12 characters for substantive reasoning)
  if (trimmed.length < 12) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (at least 12 characters detailing your reasoning).'
    };
  }

  // Check if text has very low character diversity (e.g. "aaaaa", "s s s s s", "12121212")
  const cleanedAlpha = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  const uniqueChars = new Set(cleanedAlpha);
  if (uniqueChars.size < 4 && cleanedAlpha.length > 5) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (avoid repetitive characters or keyboard mashing).'
    };
  }

  // Check for exact non-substantive filler phrases using strict word boundaries or full equality
  if (isFillerPhrase(trimmed)) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (generic filler phrases like "this is it" or "placeholder" are not allowed).'
    };
  }

  // Check for repeating short phrase loop (e.g. "this is it this is it")
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);
  if (words.length >= 4) {
    const firstTwo = words.slice(0, 2).join(' ');
    const rest = words.slice(2).join(' ');
    if (rest.includes(firstTwo) && words.length <= 8 && new Set(words).size <= 3) {
      return {
        valid: false,
        reason: 'Please provide a substantive answer (avoid repeating short phrases).'
      };
    }
  }

  return { valid: true };
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Validates an uploaded study material file for extension and size limits.
 */
export function validateStudyMaterialFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // File size validation (5MB max)
  if (file.size > STUDY_MATERIAL_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 5MB (selected file: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  const name = file.name.trim();
  const lowerName = name.toLowerCase();
  const hasAllowedExt = STUDY_MATERIAL_LIMITS.ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );

  if (!hasAllowedExt) {
    const ext = name.includes('.') ? `.${name.split('.').pop()}` : 'unknown';
    return {
      valid: false,
      error: `Unsupported file type (${ext}). Supported formats: ${STUDY_MATERIAL_LIMITS.ALLOWED_EXTENSIONS.join(', ')}. Binary or executable files are rejected.`
    };
  }

  // Sanitize file name for display
  const sanitizedName = stripHtml(name).replace(/[^a-zA-Z0-9._\- ]/g, '_');

  return { valid: true, sanitizedName };
}

/**
 * Resolves the 1-based step number of a capability milestone string against a challenge's structural milestones array.
 */
export function resolveMilestoneStepNumber(
  capabilityText: string,
  milestones?: string[]
): number | null {
  if (!capabilityText || !milestones || !Array.isArray(milestones) || milestones.length === 0) {
    return null;
  }
  const target = capabilityText.trim().toLowerCase();

  // 1. Direct index check if string starts with "Step X:"
  const stepMatch = target.match(/^step\s*(\d+)/i);
  if (stepMatch && stepMatch[1]) {
    const num = parseInt(stepMatch[1], 10);
    if (num >= 1 && num <= milestones.length) return num;
  }

  // 2. Exact match against milestones array
  for (let idx = 0; idx < milestones.length; idx++) {
    const m = (milestones[idx] || '').trim().toLowerCase();
    if (m === target) return idx + 1;
  }

  // 3. Substring / Keyword overlap matching
  for (let idx = 0; idx < milestones.length; idx++) {
    const m = (milestones[idx] || '').trim().toLowerCase();
    const cleanM = m.replace(/^step\s*\d+:?\s*/i, '').trim();
    const cleanTarget = target.replace(/^step\s*\d+:?\s*/i, '').trim();

    if (cleanM.length > 5 && (cleanTarget.includes(cleanM) || cleanM.includes(cleanTarget))) {
      return idx + 1;
    }
  }

  return null;
}
