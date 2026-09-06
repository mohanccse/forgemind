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
  MIN_CHARS: 5
};

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
