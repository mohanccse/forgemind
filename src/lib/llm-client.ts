import { getGenAI, executeWithTimeoutAndRetry } from './gemini';

export type LLMProvider = 'gemini' | 'openrouter' | 'nvidia-nim';

export interface LLMOptions {
  systemPrompt?: string;
  userPrompt: string;
  jsonMode?: boolean;
  responseSchema?: any;
  preferredProvider?: LLMProvider;
}

export interface LLMResult {
  data: any;
  rawText: string;
  providerUsed: LLMProvider;
  modelUsed?: string;
}

function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return cleaned;
}

async function callGemini(
  systemPrompt: string | undefined,
  userPrompt: string,
  jsonMode: boolean,
  responseSchema: any
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = getGenAI();
  if (!ai) {
    throw new Error('Failed to initialize GoogleGenAI client');
  }

  const config: any = {
    temperature: 0.1
  };

  if (systemPrompt) {
    config.systemInstruction = systemPrompt;
  }

  if (jsonMode) {
    config.responseMimeType = 'application/json';
    if (responseSchema) {
      config.responseSchema = responseSchema;
    }
  }

  // Model name: 'gemini-3.5-flash'
  const response: any = await executeWithTimeoutAndRetry(async () => {
    return await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config
    });
  }, 25000, 2);

  const text = response.text || '';
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}

async function callOpenRouter(
  systemPrompt: string | undefined,
  userPrompt: string,
  jsonMode: boolean
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const payload: any = {
    model: 'google/gemma-4-31b-it:free',
    messages,
    temperature: 0.1
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://forgemind.ai',
      'X-Title': 'ForgeMind Evaluator'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text().catch(() => '');
    }
    throw new Error(`OpenRouter HTTP ${res.status}: ${errorDetail || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error('OpenRouter returned an empty message content');
  }
  return text;
}

async function callNvidiaNim(
  systemPrompt: string | undefined,
  userPrompt: string,
  jsonMode: boolean
): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY is not configured');
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const payload: any = {
    model: 'moonshotai/kimi-k3',
    messages,
    temperature: 0.1
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000)
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text().catch(() => '');
    }
    throw new Error(`NVIDIA NIM HTTP ${res.status}: ${errorDetail || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) {
    throw new Error('NVIDIA NIM returned an empty message content');
  }
  return text;
}

/**
 * Executes an LLM request with an automatic multi-provider fallback chain:
 * Gemini ('gemini-3.5-flash') -> OpenRouter ('google/gemma-4-31b-it:free') -> NVIDIA NIM ('moonshotai/kimi-k3')
 */
export async function executeLLM(options: LLMOptions): Promise<LLMResult> {
  const {
    systemPrompt,
    userPrompt,
    jsonMode = true,
    responseSchema,
    preferredProvider
  } = options;

  const defaultProviders: LLMProvider[] = ['gemini', 'openrouter', 'nvidia-nim'];
  let providersToTry: LLMProvider[];

  if (preferredProvider && defaultProviders.includes(preferredProvider)) {
    providersToTry = [
      preferredProvider,
      ...defaultProviders.filter(p => p !== preferredProvider)
    ];
  } else {
    providersToTry = defaultProviders;
  }

  let lastError: Error | null = null;

  for (let i = 0; i < providersToTry.length; i++) {
    const provider = providersToTry[i];
    try {
      let rawText = '';
      if (provider === 'gemini') {
        rawText = await callGemini(systemPrompt, userPrompt, jsonMode, responseSchema);
      } else if (provider === 'openrouter') {
        rawText = await callOpenRouter(systemPrompt, userPrompt, jsonMode);
      } else if (provider === 'nvidia-nim') {
        rawText = await callNvidiaNim(systemPrompt, userPrompt, jsonMode);
      }

      let parsedData: any = rawText;
      if (jsonMode) {
        const cleaned = cleanJsonText(rawText);
        parsedData = JSON.parse(cleaned);
      }

      const modelName = provider === 'gemini' ? 'gemini-3.5-flash' : provider === 'openrouter' ? 'google/gemma-4-31b-it:free' : 'moonshotai/kimi-k3';

      return {
        data: parsedData,
        rawText,
        providerUsed: provider,
        modelUsed: modelName
      };
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(
        `[LLM Fallback] Provider "${provider}" failed: ${errorMsg}. ${
          i < providersToTry.length - 1
            ? `Advancing to fallback provider "${providersToTry[i + 1]}"...`
            : 'All LLM providers exhausted.'
        }`
      );
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
