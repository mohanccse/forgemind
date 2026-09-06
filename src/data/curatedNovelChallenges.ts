import { GeneratedChallenge } from '../types';

export const CURATED_NOVEL_CHALLENGES: Record<string, GeneratedChallenge> = {
  'rice-prioritization': {
    id: 'novel-rice-construction-saas',
    conceptId: 'rice-prioritization',
    conceptName: 'RICE Prioritization',
    domain: 'Product Management',
    difficulty: 'Applied (Senior PM)',
    sourceType: 'LIBRARY',
    title: 'The Q3 Heavy Equipment Dispatch Dilemma',
    scenario: 'You are the Lead Product Manager for BuildGrid, a B2B construction fleet telematics SaaS with 650 mid-sized contractor clients (average 40 telematics sensors per contractor) and 8 regional enterprise construction conglomerates (average 1,200 sensors per client). Your engineering sprint capacity for Q3 is capped at 6 engineer-months. The executive team is locked in conflict between three competing initiatives: Project Titan (Subcontractor Punch-List Mobile Sync), Project Bedrock (Predictive Hydraulic Telemetry Alerts), and Project Apex (Enterprise ERP Multi-Entity Billing).',
    contextData: `INITIATIVE 1: Project Titan (Punch-List Mobile Sync)
- Reach: 520 contractor accounts over the quarter
- Impact: 2 (High impact on daily supervisor workflow)
- Sales Confidence: 80% (validated with 35 contractor interviews)
- Engineering Effort: 4 engineer-months

INITIATIVE 2: Project Bedrock (Predictive Hydraulic Telemetry Alerts)
- Reach: All 8 enterprise conglomerates + 140 contractors (Total accounts: 148, but represents 62% of all active telematics sensors)
- Impact: 3 (Massive - prevents catastrophic $80k engine failures)
- Hardware Team Confidence: 50% (prototype bench-tested, field conditions untested)
- Engineering Effort: 3 engineer-months

INITIATIVE 3: Project Apex (Enterprise ERP Multi-Entity Billing)
- Reach: 5 enterprise conglomerates requesting RFP compliance
- Impact: 3 (Massive - required for $1.2M ARR renewal cycle)
- Sales Director Confidence: 100% (Sales Director claims deals are "100% guaranteed if delivered by Sept 30")
- Engineering Effort: 2 engineer-months`,
    mandate: 'Conduct a quantitative RICE evaluation that resolves the unit-of-analysis mismatch between accounts vs sensor volume, discount the Sales Director\'s claim using disciplined B2B pipeline confidence metrics, and deliver your prioritized recommendation with an explicit sensitivity threshold for where your decision would flip.',
    constraints: [
      'Do not explain what the RICE acronym stands for or write introductory textbook definitions.',
      'Explicitly state whether your Reach metric represents legal contractor accounts or deployed telematics sensors, and justify that choice mathematically.',
      'Discount Initiative 3\'s 100% confidence claim to reflect realistic B2B sales pipeline discount rates (provide your selected percentage and defense).',
      'Provide an executive trade-off justification showing which single initiative gets cut due to the 6 engineer-month capacity ceiling.'
    ],
    expectedOutputFormat: 'Executive Prioritization Brief: 1) Normalized RICE Table; 2) Confidence Discount & Unit Rationale; 3) Capacity Cut Recommendation; 4) Inversion Sensitivity Threshold.',
    capabilityTested: 'Prioritizing competing initiatives using structured trade-offs, normalizing divergent reach units, and correcting stakeholder confidence bias.',
    structuralMilestones: [
      'Recognize the unit mismatch: measuring accounts vs measuring sensors/revenue exposure across initiatives',
      'Penalize the Sales Director\'s 100% confidence claim down to an empirical B2B verbal commitment range (typically 20%-50%)',
      'Compute raw and adjusted RICE scores across all three initiatives under the 6 engineer-month capacity ceiling',
      'Identify that Project Titan (520×2×0.8)/4 = 208, Project Bedrock (148×3×0.5)/3 = 74 (or on sensor basis (62%×3×0.5)/3), Project Apex raw (5×3×1.0)/2 = 7.5 (or ARR-weighted)',
      'Formulate the capacity constraint packaging: Titan (4) + Apex (2) = 6, or Bedrock (3) + Apex (2) = 5'
    ],
    acceptableAlternativeReasoning: [
      'Weighting Reach by sensor volume or annualized contract value rather than pure legal account count, provided the exact normalization factor is mathematically stated.',
      'Accepting a higher confidence for Project Apex if paired with an explicit contractual penalty risk clause.'
    ],
    referenceSolution: `1. Unit Normalization:
Evaluating Reach by customer account severely punishes Enterprise projects (5 vs 520). If normalized by revenue reach or operational volume (sensors), Bedrock and Apex represent >60% of commercial exposure. Even under pure account scoring:
Titan: Reach 520 × Impact 2 × Conf 0.8 / Effort 4 = 208
Bedrock: Reach 148 × Impact 3 × Conf 0.5 / Effort 3 = 74
Apex (Uncorrected): Reach 5 × Impact 3 × Conf 1.0 / Effort 2 = 7.5

2. Confidence Correction:
Sales "100% verbal certainty" violates RICE empirical principles. In enterprise B2B SaaS, verbal intent without signed SOW/penalty clause warrants at most 30%-50% confidence. If Apex confidence is discounted to 40%, its account-based score drops to 3.0.
However, if evaluated on ARR Reach (units of $100k ARR):
Titan ARR Reach = 520 × $6k = $3.12M (31.2 units) -> RICE = (31.2 × 2 × 0.8)/4 = 12.48
Bedrock ARR Reach = $4.8M (48 units) -> RICE = (48 × 3 × 0.5)/3 = 24.0
Apex ARR Reach = $1.2M (12 units) -> RICE = (12 × 3 × 0.4)/2 = 7.2

3. Capacity Packaging (6 Eng-Months Max):
Deliver Titan (4 mo) + Apex (2 mo) = 6 mo, OR Bedrock (3 mo) + Apex (2 mo) = 5 mo.
Recommendation: Prioritize Titan + Apex if churn reduction among mid-market is critical, or Bedrock + Apex if enterprise churn risk threatens Series B metrics.
Inversion Threshold: Apex flips out of the roadmap if Enterprise renewal churn can be mitigated via a manual escrow agreement or if Titan effort expands past 5 months.`,
    hints: [
      {
        tier: 1,
        type: 'Nudge',
        title: 'Examine the Measuring Tape',
        hint: 'Look closely at the Reach numbers across the three projects. Is counting 5 enterprise conglomerates on the same scale as counting 520 small contractors a fair comparison?',
        penaltyDescription: '-5% on Raw Independence'
      },
      {
        tier: 2,
        type: 'Direction',
        title: 'Check the Confidence Multiplier',
        hint: 'Sales claims 100% confidence for Project Apex. In RICE, 100% is reserved for airtight quantitative telemetry. What happens to the math when you apply an empirical B2B pipeline discount (e.g. 30%-50%)?',
        penaltyDescription: '-12% on Raw Independence'
      },
      {
        tier: 3,
        type: 'Concept reminder',
        title: 'The Core RICE Formula and Capacity Ceiling',
        hint: 'RICE Score = (Reach × Impact × Confidence) / Effort. You have a hard capacity ceiling of 6 engineer-months. Calculate the individual scores and test which combination (Titan + Apex = 6, or Bedrock + Apex = 5) maximizes collective return.',
        penaltyDescription: '-20% on Raw Independence'
      },
      {
        tier: 4,
        type: 'Structural guidance',
        title: 'Step-by-Step Calculation Breakdown',
        hint: '1) Calculate raw account RICE: Titan = (520×2×0.8)/4 = 208; Bedrock = (148×3×0.5)/3 = 74; Apex = (5×3×1.0)/2 = 7.5. 2) Show how measuring by revenue/sensors shifts Bedrock. 3) Select the winning pair within the 6-month budget.',
        penaltyDescription: '-35% on Raw Independence'
      },
      {
        tier: 5,
        type: 'Solution reveal',
        title: 'Full Model Resolution and Trade-off Defense',
        hint: 'Recommend shipping Titan (4 months) and Apex (2 months), meeting the 6-month capacity cap. Bedrock must be deferred to Q4 because prototype field variance (50% confidence) introduces delivery risk. Apex is included despite low raw account score because its 2-month effort allows pairing with Titan to secure the $1.2M renewal.',
        penaltyDescription: '-60% on Raw Independence'
      }
    ]
  },
  'sql-joins': {
    id: 'novel-sql-joins-fintech-ledger',
    conceptId: 'sql-joins',
    conceptName: 'SQL JOINs',
    domain: 'SQL / Data',
    difficulty: 'Applied (Data / Analytics Engineer)',
    sourceType: 'LIBRARY',
    title: 'The Phantom Multi-Currency Merchant Ledger Explosion',
    scenario: 'You are the lead data engineer for a global payments gateway. The financial reconciliation pipeline is reporting an alarming $4.2M discrepancy between daily settlement batches and bank payout logs. The junior analyst wrote a query joining the `merchants` table to `transactions`, `refunds`, and `fee_surcharges`. Because high-volume merchants frequently have multiple transactions, multiple refunds, and multiple fee adjustments on the same business day, the query produced a Cartesian fan-out that multiplied ledger totals by up to 12x.',
    contextData: `TABLE SCHEMAS:
merchants (merchant_id PK, business_name, settlement_currency, status)
transactions (transaction_id PK, merchant_id FK, created_at, gross_amount, net_amount)
refunds (refund_id PK, merchant_id FK, created_at, refunded_amount, reason)
fee_surcharges (surcharge_id PK, merchant_id FK, created_at, fee_type, fee_amount)

SAMPLE CORRUPTED QUERY:
SELECT m.merchant_id, m.business_name,
       SUM(t.gross_amount) AS total_gross,
       SUM(r.refunded_amount) AS total_refunded,
       SUM(f.fee_amount) AS total_fees
FROM merchants m
LEFT JOIN transactions t ON m.merchant_id = t.merchant_id AND DATE(t.created_at) = '2026-09-01'
LEFT JOIN refunds r ON m.merchant_id = r.merchant_id AND DATE(r.created_at) = '2026-09-01'
LEFT JOIN fee_surcharges f ON m.merchant_id = f.merchant_id AND DATE(f.created_at) = '2026-09-01'
WHERE m.status = 'ACTIVE'
GROUP BY m.merchant_id, m.business_name;`,
    mandate: 'Deconstruct why the current join topology triggers row duplication, write a robust production-grade SQL query that preserves absolute transactional cardinality and monetary precision, and explain why naive fixes like SELECT DISTINCT or multiple independent queries fail at scale.',
    constraints: [
      'Do not use SELECT DISTINCT inside aggregate functions (e.g. SUM(DISTINCT ...)), as identical legitimate dollar values will be silently discarded.',
      'Must produce all three metrics (total_gross, total_refunded, total_fees) in a single consolidated result set.',
      'Must handle merchants with transactions but zero refunds or zero surcharges without dropping them (proper NULL coalescing).',
      'Explain the computational difference between pre-aggregating in Common Table Expressions (CTEs) vs correlated subqueries.'
    ],
    expectedOutputFormat: '1) Diagnostic of Fan-out Mechanics; 2) Validated Production SQL Query; 3) Performance & Edge-case Defense.',
    capabilityTested: 'Preserving relational cardinality and monetary precision across multiple one-to-many joins using pre-aggregation patterns.',
    structuralMilestones: [
      'Identify that joining two or more independent 1-to-many child tables causes an M × N Cartesian product for each parent row',
      'Reject `SUM(DISTINCT amount)` because multiple transactions with the exact same dollar amount (e.g. two $50 orders) would be incorrectly deduped into one $50',
      'Isolate child aggregations into separate CTEs or derived tables grouped by merchant_id before joining to merchants',
      'Use COALESCE(..., 0) on aggregated metrics to handle merchants with NULL left join matches'
    ],
    acceptableAlternativeReasoning: [
      'Using correlated subqueries in the SELECT clause if query volume is low, provided the O(N) execution trade-off is articulated.',
      'Using UNION ALL staging table pattern to compute single-pass grouped aggregation.'
    ],
    referenceSolution: `1. Diagnostic:
When a merchant has 4 transactions, 2 refunds, and 3 surcharges on the same day, joining them directly creates 4 × 2 × 3 = 24 rows for that single merchant. Every transaction amount is summed 6 times, every refund 12 times, and every fee 8 times.

2. Production SQL:
WITH daily_txns AS (
  SELECT merchant_id,
         SUM(gross_amount) AS total_gross
  FROM transactions
  WHERE created_at >= '2026-09-01 00:00:00' AND created_at < '2026-09-02 00:00:00'
  GROUP BY merchant_id
),
daily_refunds AS (
  SELECT merchant_id,
         SUM(refunded_amount) AS total_refunded
  FROM refunds
  WHERE created_at >= '2026-09-01 00:00:00' AND created_at < '2026-09-02 00:00:00'
  GROUP BY merchant_id
),
daily_fees AS (
  SELECT merchant_id,
         SUM(fee_amount) AS total_fees
  FROM fee_surcharges
  WHERE created_at >= '2026-09-01 00:00:00' AND created_at < '2026-09-02 00:00:00'
  GROUP BY merchant_id
)
SELECT m.merchant_id,
       m.business_name,
       COALESCE(dt.total_gross, 0) AS total_gross,
       COALESCE(dr.total_refunded, 0) AS total_refunded,
       COALESCE(df.total_fees, 0) AS total_fees
FROM merchants m
LEFT JOIN daily_txns dt ON m.merchant_id = dt.merchant_id
LEFT JOIN daily_refunds dr ON m.merchant_id = dr.merchant_id
LEFT JOIN daily_fees df ON m.merchant_id = df.merchant_id
WHERE m.status = 'ACTIVE'
ORDER BY m.merchant_id;`,
    hints: [
      {
        tier: 1,
        type: 'Nudge',
        title: 'Row Multiplication Trace',
        hint: 'If merchant #10 has 3 orders and 2 refunds, how many rows does the FROM clause produce before the GROUP BY executes?',
        penaltyDescription: '-5% on Raw Independence'
      },
      {
        tier: 2,
        type: 'Direction',
        title: 'The Timing of the Aggregation',
        hint: 'The query aggregates AFTER joining multiple 1-to-many tables. What happens if you aggregate BEFORE joining?',
        penaltyDescription: '-12% on Raw Independence'
      },
      {
        tier: 3,
        type: 'Concept reminder',
        title: 'Cartesian Fan-Out and Pre-Aggregation',
        hint: 'Multiple independent 1-to-many joins multiply rows (M × N). To prevent fan-out, isolate each child table\'s SUM into its own CTE or subquery grouped by merchant_id first.',
        penaltyDescription: '-20% on Raw Independence'
      },
      {
        tier: 4,
        type: 'Structural guidance',
        title: 'CTE Architecture Blueprint',
        hint: 'Create three CTEs: one for transactions, one for refunds, and one for fees. Each should group by `merchant_id` and calculate the respective SUM. Then LEFT JOIN all three to `merchants` using `COALESCE(col, 0)`.',
        penaltyDescription: '-35% on Raw Independence'
      },
      {
        tier: 5,
        type: 'Solution reveal',
        title: 'Complete Production Query Blueprint',
        hint: 'Write CTEs `daily_txns`, `daily_refunds`, and `daily_fees` with single-table groupings. In the outer query, SELECT from `merchants` and LEFT JOIN each CTE on `merchant_id`. Wrap sums in `COALESCE(..., 0)` to handle inactive days without losing merchants.',
        penaltyDescription: '-60% on Raw Independence'
      }
    ]
  },
  'rag': {
    id: 'novel-rag-clinical-trials',
    conceptId: 'rag',
    conceptName: 'RAG',
    domain: 'AI / Technology',
    difficulty: 'Applied (AI Systems Engineer)',
    sourceType: 'LIBRARY',
    title: 'The Contradictory Clinical Trial Contraindication Failure',
    scenario: 'You are the AI Systems Architect for an oncology clinical trial intelligence platform. Oncologists query the assistant: "Can Patient X with borderline renal impairment (eGFR 34 mL/min) be enrolled in Trial ONCO-402 if administered with hydration protocol?" The retrieval pipeline retrieves 6 text chunks from the 280-page trial master dossier. Chunk 1 (from original Protocol v1.0, page 42) states: "Exclusion: eGFR < 45 mL/min strictly prohibited." Chunk 4 (from Protocol Amendment 4, page 12, approved 2 months later) states: "Section 4.2 revised: Patients with eGFR 30-44 mL/min may enroll if intravenous sodium chloride pre-hydration protocol H-2 is administered." However, the LLM consistently answers: "No, Patient X cannot be enrolled due to eGFR < 45 mL/min strictly prohibited."',
    contextData: `CURRENT RETRIEVAL PIPELINE CONFIGURATION:
- Chunk size: 512 tokens, 50 token overlap
- Embedding model: text-embedding-004 (raw cosine similarity)
- Top-K: 6 chunks concatenated into the prompt in order of descending cosine similarity score
- Chunks passed:
  * Chunk 1: Similarity = 0.88 (Matches keywords "eGFR strictly prohibited") -> injected at position 1 in context
  * Chunk 2: Similarity = 0.84 (General exclusion criteria)
  * Chunk 3: Similarity = 0.82 (Trial endpoints)
  * Chunk 4: Similarity = 0.81 (Amendment 4 with pre-hydration protocol) -> injected at position 4 in context
  * Chunk 5: Similarity = 0.79 (Dosing schedule)
  * Chunk 6: Similarity = 0.77 (Investigator bios)`,
    mandate: 'Diagnose the architectural failure modes in this pipeline, formulate the exact reranking and metadata-filtering changes required to ensure temporal amendment precedence, and reconstruct the system prompt and context assembly strategy to prevent attention attenuation.',
    constraints: [
      'Do not propose fine-tuning the base LLM as the primary fix.',
      'Address both the retrieval ranking flaw (why Chunk 4 had lower similarity than Chunk 1) and the generation/prompting flaw (why the LLM ignored Chunk 4).',
      'Specify how document hierarchical metadata (version, amendment date, section precedence) must be integrated into the index and prompt.'
    ],
    expectedOutputFormat: 'Architectural Diagnostic & System Blueprint: 1) Root Cause Analysis; 2) Index & Metadata Schema; 3) Reranking & Context Assembly Pipeline; 4) System Prompt Guardrail.',
    capabilityTested: 'Architecting grounded semantic retrieval pipelines that resolve contradictory context, temporal version precedence, and LLM attention dilution.',
    structuralMilestones: [
      'Diagnose the keyword/semantic bias: Chunk 1 directly echoes the negative prohibition keywords, giving it an artificially higher similarity score than Chunk 4',
      'Diagnose the "lost in the middle" attention attenuation: Chunk 4 sitting at position 4 of 6 suffered positional recency discount in the LLM attention matrix',
      'Design a metadata schema tracking `parent_document_id`, `version_number`, `effective_date`, and `supersedes_section`',
      'Implement a cross-encoder reranker with explicit temporal or hierarchical boosting',
      'Enforce an explicit conflict resolution instruction in the system prompt instructing the model that later amendments take precedence over baseline protocols'
    ],
    acceptableAlternativeReasoning: [
      'Pre-processing the document into a structured entity-attribute graph (Graph-RAG) where amendments explicitly mutate the parent node state.',
      'Chunk-level query expansion where user queries generate hypothetical clinical amendments.'
    ],
    referenceSolution: `1. Root Cause Diagnostic:
A. Retrieval Flaw: Symmetric/dense embedding models score Chunk 1 higher (0.88 vs 0.81) because Chunk 1 features dense keyword overlap with the clinician's query terms ("eGFR", "prohibited"). Chunk 4 discusses "Amendment 4" and "protocol H-2", which is semantically more distant from the query.
B. Generation Flaw: Passing 6 chunks naively places Chunk 4 in the middle (position 4). LLMs exhibit U-shaped attention curves ("lost in the middle"), paying highest attention to the beginning and end of the context window.
C. Missing Document Hierarchy: The embeddings lack temporal metadata awareness.

2. Index & Metadata Architecture:
Every chunk must store structured frontmatter:
{
  "doc_type": "protocol_amendment",
  "amendment_number": 4,
  "effective_date": "2026-06-15",
  "superseded_sections": ["4.2"],
  "parent_doc": "ONCO-402"
}

3. Two-Stage Retrieval & Context Assembly Pipeline:
Stage 1: Hybrid BM25 + dense retrieval for candidate generation (K=20).
Stage 2: Cross-encoder reranking with explicit metadata boosting: when multiple chunks target the same section, filter out superseded chunks or sort by effective_date DESC.
Assembly: Format chunks with clear provenance headers. Place the most recent amendment at the prominent prompt boundary (top or immediate prompt pre-amble).

4. System Prompt Conflict Resolution Rule:
"You are a Clinical Protocol Assistant. When reviewing trial documentation: Later dated amendments STRICTLY OVERRIDE earlier baseline protocols. If an amendment grants a conditional exception (e.g. hydration protocol), cite the amendment as the authoritative governing rule."`,
    hints: [
      {
        tier: 1,
        type: 'Nudge',
        title: 'Look at the Similarity Scores and Position',
        hint: 'Why did the baseline exclusion chunk get a higher similarity score (0.88) than the amendment chunk (0.81)? And where does Chunk 4 sit in the context window?',
        penaltyDescription: '-5% on Raw Independence'
      },
      {
        tier: 2,
        type: 'Direction',
        title: 'The Semantic Drift of Amendments',
        hint: 'Amendments often use conditional phrasing ("pre-hydration protocol H-2") that doesn\'t directly match the negative prohibition keywords in the clinician\'s query. How can metadata help the search engine know this chunk supersedes Section 4.2?',
        penaltyDescription: '-12% on Raw Independence'
      },
      {
        tier: 3,
        type: 'Concept reminder',
        title: 'Reranking and Attention Attenuation',
        hint: 'Two core RAG concepts: 1) Cross-encoder rerankers with metadata filtering; 2) "Lost in the middle" phenomena where LLMs overlook information placed in the center of long contexts.',
        penaltyDescription: '-20% on Raw Independence'
      },
      {
        tier: 4,
        type: 'Structural guidance',
        title: 'The Three-Tier Architecture Solution',
        hint: '1) Add metadata (effective_date, section_target, is_amendment) to chunks. 2) In the reranker, de-duplicate or suppress superseded baseline chunks. 3) Order remaining context chronologically or place the amendment in the prime attention slot.',
        penaltyDescription: '-35% on Raw Independence'
      },
      {
        tier: 5,
        type: 'Solution reveal',
        title: 'Full Pipeline Architecture Fix',
        hint: 'Implement metadata-filtered cross-encoder reranking: tag chunks with version and section IDs, eliminate Chunk 1 from the context because Amendment 4 supersedes it, and pass an explicit prompt instruction: "Amendments supersede master protocol rules."',
        penaltyDescription: '-60% on Raw Independence'
      }
    ]
  }
};

export function getCuratedNovelChallenge(conceptId: string): GeneratedChallenge | undefined {
  return CURATED_NOVEL_CHALLENGES[conceptId];
}
