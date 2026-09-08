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

/**
 * Validates whether a micro-response input is substantive.
 * Rejects empty text, single-character placeholders, repetitive single-character strings (e.g., "s", "ss", "aaaa"),
 * generic filler phrases (e.g. "this is what", "i don't know"), keyboard mash patterns (e.g. "asdf", "qwerty"), and pure whitespace.
 */
export function isSubstantiveInput(text: string): { valid: boolean; reason?: string } {
  const trimmed = (text || '').trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: 'Field cannot be empty.' };
  }

  // Minimum length check (minimum 4 characters)
  if (trimmed.length < 4) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (at least 4 characters, not repetitive letters).'
    };
  }

  // Check if text is just a single character repeated (e.g. "aaaa", "ssss", "1111", "....")
  const cleanedAlpha = trimmed.toLowerCase().replace(/\s/g, '');
  const uniqueChars = new Set(cleanedAlpha);
  if (uniqueChars.size <= 1) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (not repetitive single characters).'
    };
  }

  // Check for common non-substantive filler phrases and keyboard mash patterns
  const lower = trimmed.toLowerCase();
  const fillerPhrases = [
    'this is what', 'this is a test', 'this is test', "i don't know", 'idk',
    'not sure', 'test test', 'hello world', 'sample text', 'placeholder',
    'fill this in', 'nothing to say', 'some text', 'random text', 'default answer',
    'asdf', 'qwerty', 'zxcv', '1234', 'abcd', 'fdsa', 'ytrewq', 'vcxz',
    'aaaa', 'ssss', 'dddd', 'ffff', 'xxxx', 'zzzz', 'qqqq'
  ];

  if (fillerPhrases.some((pattern) => lower.includes(pattern))) {
    return {
      valid: false,
      reason: 'Please provide a substantive answer (generic filler phrases like "this is what" or keyboard mashing are not allowed).'
    };
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
