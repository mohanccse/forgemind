import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function executeWithTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs = 25000,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutHandle!);
      const isTransient =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('503') ||
        err?.message?.includes('timed out') ||
        err?.message?.includes('fetch failed');

      if (attempt <= maxRetries && isTransient) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`Transient error on attempt ${attempt}: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('All retries exhausted');
}
