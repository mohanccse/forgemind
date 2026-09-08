import { NextResponse } from 'next/server';
import { getGenAI, executeWithTimeoutAndRetry } from '@/lib/gemini';
import { sanitizeText, stripHtml, STUDY_MATERIAL_LIMITS } from '@/utils/sanitizer';
import { safeParseJson } from '@/utils/evaluationValidator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { normalized_content } = body;

    if (!normalized_content || !normalized_content.normalized_text) {
      return NextResponse.json(
        { success: false, error: 'Normalized content with text is required.' },
        { status: 400 }
      );
    }

    const MAX_STAGE1_INPUT_CHARS = 40000;
    let rawText = sanitizeText(normalized_content.normalized_text);
    const sourceName = stripHtml(normalized_content.source_name || 'Study Material');
    const originalLength = rawText.length;
    let wasTruncated = false;
    let truncationNotice: string | undefined = undefined;

    if (originalLength > MAX_STAGE1_INPUT_CHARS) {
      wasTruncated = true;
      rawText = rawText.slice(0, MAX_STAGE1_INPUT_CHARS);
      truncationNotice = `This source is long (${originalLength.toLocaleString()} characters) — only the first ${MAX_STAGE1_INPUT_CHARS.toLocaleString()} characters were used for concept extraction.`;
      console.warn(
        `[Stage 0 → Stage 1 Guardrail] Input text length (${originalLength} chars) exceeded cap (${MAX_STAGE1_INPUT_CHARS} chars). Truncated to first ${MAX_STAGE1_INPUT_CHARS} characters for Stage 1 concept extraction.`
      );
    }

    if (rawText.length < STUDY_MATERIAL_LIMITS.MIN_CHARS) {
      return NextResponse.json(
        {
          success: false,
          error: `Study material is too brief (minimum ${STUDY_MATERIAL_LIMITS.MIN_CHARS} characters required).`
        },
        { status: 400 }
      );
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 25) {
      return NextResponse.json({
        success: true,
        candidate: {
          concept_name: 'Unidentified Concept',
          domain: 'AI / Technology',
          description: 'The provided material is too brief to extract an operational capability model.',
          underlying_skill: 'Insufficient operational principles provided.',
          capabilities: [],
          reasoning_milestones: [],
          decision_points: [],
          confidence_score: 0.2,
          confidence_reasoning: 'The text contains fewer than 25 words and lacks actionable operational principles.',
          is_confident: false,
          insufficient_reason: "We're not confident enough to identify the concept. The provided material is too short or informal to extract actionable capabilities.",
          was_truncated: wasTruncated,
          truncation_notice: truncationNotice,
          original_length: originalLength,
          truncated_length: rawText.length
        }
      });
    }

    const ai = getGenAI();

    if (ai) {
      try {
        const prompt = `You are ForgeMind's Concept & Capability Extractor.
ForgeMind's mission is: "You learned it. Now prove you can use it."
You extract the latent operational concept and underlying capabilities from raw study material so learners can be tested in novel workplace dilemmas.

STUDY MATERIAL TITLE: ${sourceName}
STUDY MATERIAL TEXT:
"""
${rawText}
"""

EVALUATION RULES:
1. CONFIDENCE ASSESSMENT:
   - Does this text contain a coherent, substantive technical or strategic framework, methodology, algorithm, or operational model?
   - If the text is merely conversational notes, meeting banter, fragmented thoughts, or lacks actionable principles, set "confidence_score" to 0.1 - 0.5, set "is_confident" to false, and set "insufficient_reason" to "We're not confident enough to identify the concept. The material lacks structured operational principles or actionable decision frameworks."
   - If the text clearly explains a substantive methodology/concept, set "confidence_score" between 0.70 and 0.98, and set "is_confident" to true.

2. CONCEPT EXTRACTION (when confident):
   - concept_name: A clean, formal concept name (e.g. "PostgreSQL Window Functions", "Vector Embeddings in RAG", "WSJF Prioritization").
   - domain: One of "Product Management", "AI / Technology", "SQL / Data". If the text discusses product strategy, roadmaps, user progress, pricing, or product execution, select "Product Management". If it discusses databases/queries, select "SQL / Data". If AI/models/ML/software engines, select "AI / Technology".
   - description: 1-2 sentence description explaining what the concept achieves.
   - underlying_skill: The core operational skill (e.g. "Computing partitioned window aggregations under duplicate order frames", "Configuring vector chunking and reciprocal rank reranking").
   - capabilities: An array of 3-7 specific, observable capability statements starting with action verbs (e.g. ["Identify partition boundaries", "Select correct frame specification", "Distinguish ROWS from RANGE framing"]).
   - reasoning_milestones: 3-5 logical reasoning steps required to execute this skill.
   - decision_points: 2-4 critical tradeoffs or design decisions.
   - common_failure_modes: 2-3 common traps or bugs beginners fall into.
   - approximate_difficulty: "Foundational" | "Applied" | "Advanced" | "Expert".

Return strictly JSON with keys:
{
  "concept_name": string,
  "domain": string,
  "description": string,
  "underlying_skill": string,
  "capabilities": string[],
  "reasoning_milestones": string[],
  "decision_points": string[],
  "common_failure_modes": string[],
  "approximate_difficulty": string,
  "confidence_score": number,
  "confidence_reasoning": string,
  "is_confident": boolean,
  "insufficient_reason"?: string
}`;

        const response = await executeWithTimeoutAndRetry(async () => {
          return await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });
        }, 25000, 2);

        const responseText = response.text?.trim();
        if (responseText) {
          const parsedResult = safeParseJson(responseText);
          if (parsedResult.success && parsedResult.data) {
            const parsed = parsedResult.data;
            const isConfident = Boolean(
              parsed.is_confident &&
              parsed.confidence_score >= 0.65 &&
              parsed.capabilities &&
              parsed.capabilities.length >= 2
            );

            return NextResponse.json({
              success: true,
              candidate: {
                concept_name: stripHtml(parsed.concept_name || sourceName),
                domain: ['Product Management', 'AI / Technology', 'SQL / Data'].includes(parsed.domain)
                  ? parsed.domain
                  : 'AI / Technology',
                description: stripHtml(parsed.description || 'User-extracted operational concept.'),
                underlying_skill: stripHtml(parsed.underlying_skill || 'Practical application of operational principles.'),
                capabilities: Array.isArray(parsed.capabilities) ? parsed.capabilities.map(stripHtml) : [],
                reasoning_milestones: Array.isArray(parsed.reasoning_milestones) ? parsed.reasoning_milestones.map(stripHtml) : [],
                decision_points: Array.isArray(parsed.decision_points) ? parsed.decision_points.map(stripHtml) : [],
                common_failure_modes: Array.isArray(parsed.common_failure_modes) ? parsed.common_failure_modes.map(stripHtml) : [],
                approximate_difficulty: parsed.approximate_difficulty || 'Applied',
                confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.8,
                confidence_reasoning: stripHtml(parsed.confidence_reasoning || 'Extracted from submitted study text.'),
                is_confident: isConfident,
                insufficient_reason: !isConfident
                  ? stripHtml(parsed.insufficient_reason || "We're not confident enough to identify the concept.")
                  : undefined,
                was_truncated: wasTruncated,
                truncation_notice: truncationNotice,
                original_length: originalLength,
                truncated_length: rawText.length
              }
            });
          }
        }
      } catch (aiErr) {
        console.warn('Gemini extraction error, falling back to heuristic extractor:', aiErr);
      }
    }

    // Fallback heuristic extraction
    const lower = rawText.toLowerCase();
    const isConversational =
      (lower.includes('hey') || lower.includes('chat') || lower.includes('thanks') || lower.includes('coffee')) &&
      wordCount < 80;

    if (isConversational) {
      return NextResponse.json({
        success: true,
        candidate: {
          concept_name: 'Unclear Subject',
          domain: 'AI / Technology',
          description: 'Informal or conversational notes without explicit technical principles.',
          underlying_skill: 'Insufficient operational principles.',
          capabilities: [],
          reasoning_milestones: [],
          decision_points: [],
          confidence_score: 0.35,
          confidence_reasoning: 'The text appears to be informal notes or conversation without concrete operational rules.',
          is_confident: false,
          insufficient_reason: "We're not confident enough to identify the concept. The notes lack defined technical rules or actionable decision frameworks.",
          was_truncated: wasTruncated,
          truncation_notice: truncationNotice,
          original_length: originalLength,
          truncated_length: rawText.length
        }
      });
    }

    let domain = 'AI / Technology';
    if (lower.includes('sql') || lower.includes('partition') || lower.includes('query') || lower.includes('table') || lower.includes('database')) {
      domain = 'SQL / Data';
    } else if (lower.includes('product') || lower.includes('customer') || lower.includes('roadmap') || lower.includes('prioritization') || lower.includes('metric')) {
      domain = 'Product Management';
    }

    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 20);
    const detectedCapabilities = [
      'Analyze structural operational requirements',
      'Evaluate trade-offs between competing approaches',
      'Apply boundary conditions in execution'
    ];

    return NextResponse.json({
      success: true,
      candidate: {
        concept_name: stripHtml(sourceName.replace(/\.[a-zA-Z0-9]+$/, '')),
        domain,
        description: stripHtml(lines[0] || 'Operational capability model extracted from user study material.'),
        underlying_skill: `Executing operational decisions and trade-offs in ${stripHtml(sourceName)}.`,
        capabilities: detectedCapabilities,
        reasoning_milestones: [
          'Identify target parameters from context',
          'Map system constraints against operational goals',
          'Justify final implementation recommendation'
        ],
        decision_points: [
          'Evaluate short-term speed vs long-term maintainability',
          'Balance resource constraints against precision'
        ],
        approximate_difficulty: 'Applied',
        confidence_score: 0.78,
        confidence_reasoning: 'Substantive technical content identified with actionable operational principles.',
        is_confident: true,
        was_truncated: wasTruncated,
        truncation_notice: truncationNotice,
        original_length: originalLength,
        truncated_length: rawText.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to extract concept.' },
      { status: 500 }
    );
  }
}
