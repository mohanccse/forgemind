export const AI_EVALS_MASTERCLASS_TEST_FIXTURE = {
  isTestFixture: true,
  sourceName: '[TEST FIXTURE] AI Evals Explained — From Basics to Advanced (Masterclass)',
  text: `LECTURE TITLE: AI Evals Explained — From Basics to Advanced (Full Masterclass)

SECTION 1: INTRODUCTION TO AI EVALS & DETERMINISTIC SYSTEMS vs LLMs (0:00 - 14:25)
Welcome to this masterclass on AI Evals. When building traditional software applications, systems are strictly deterministic. Given an input X, a deterministic function consistently returns output Y. Unit tests assert exact equality (assertResult == expectedResult). However, Large Language Models (LLMs) are fundamentally non-deterministic probabilistic engines. The same prompt submitted to the same LLM temperature setting can yield divergent phrasing, structural variations, or latent reasoning paths across invocations.

This non-deterministic nature creates a fundamental product management dilemma: Capability vs Consistency. An LLM may exhibit impressive capability during a single demo, but in production across 10,000 real-world customer interactions, consistency degrades without disciplined evaluation architecture. AI Evals are the systematic framework designed to measure, benchmark, and enforce consistency, accuracy, and safety across LLM application deployments.

SECTION 2: WHAT ARE EVALS & TYPES OF EVALUATION ARCHITECTURES (14:26 - 38:13)
An AI Eval is a standardized, repeatable benchmark test suite consisting of:
1. Input Test Datasets (prompts, telemetry, user queries, edge-case boundary payloads)
2. Execution Harness (invoking the target LLM or RAG pipeline across parameters)
3. Evaluator / Scorer (evaluating output against capability criteria)

Evaluations fall into two core structural archetypes:
- Reference-Based Evaluations: Output is compared against a human-curated ground truth or reference answer. Metrics include exact match, semantic similarity, precision, recall, BLEU, and ROUGE scores.
- Reference-Free Evaluations: Output is evaluated independently of a fixed ground truth answer using structural properties, constraint adherence, factual consistency, safety guardrails, or LLM-as-a-Judge scoring rules.

Choosing between reference vs reference-free evals depends on domain open-endedness. Closed domain tasks (SQL generation, data parsing, exact mathematical reasoning) mandate reference-based ground truth comparisons. Open domain tasks (creative writing, executive decision memos, strategic negotiation advice) mandate reference-free constraint evaluation.

SECTION 3: TRACE ANALYSIS & QUALITATIVE CODING METHODOLOGY (42:18 - 01:22:33)
Before writing automated grading code, product managers must perform manual Trace Analysis. A trace represents the end-to-end execution log of an AI request—including user query, retriever context chunks, system instructions, model latency, token counts, and generated response.

The 5-Step Trace Analysis Workflow:
Step 1: Sample a representative batch of production traces across success and failure runs.
Step 2: Read raw traces manually without automated metrics to observe real user failure patterns.
Step 3: Apply Open Coding—annotate unexpected model behaviors, hallucination types, or boundary violations line by line.
Step 4: Transition to Axial Coding—group individual open codes into structured taxonomy failure buckets (e.g., "Context Contradiction", "Format Non-Compliance", "Over-Refusal", "Verbosity Drift").
Step 5: Define quantitative threshold metrics for each failure bucket.

How many traces should an AI Product Manager inspect? A disciplined baseline requires reading 50 to 100 raw traces per failure mode iteration before locking downstream evaluator prompts.

SECTION 4: EVALUATION METRICS FOR RAG SYSTEMS (01:22:34 - 01:45:36)
Retrieval-Augmented Generation (RAG) evaluation evaluates both the Retriever and the Generator:
1. Precision@K: The proportion of retrieved context chunks in top-K that are strictly relevant to the user query.
2. Recall@K: The proportion of all ground-truth relevant context chunks successfully retrieved in top-K.
3. Mean Reciprocal Rank (MRR): Measures how high up in the result list the first relevant context chunk appears (MRR = 1 / rank of first relevant chunk).
4. Faithfulness / Hallucination Rate: Evaluating whether generated claims are logically entailed by retrieved context chunks without ungrounded extrapolation.
5. Answer Relevance: Evaluating whether the generated response directly answers the user's explicit mandate.

SECTION 5: LLM-AS-A-JUDGE & INTER-RATER RELIABILITY (01:45:37 - 02:20:00)
Using a secondary LLM to evaluate target LLM outputs (LLM-as-a-Judge) requires rigorous calibration against human domain experts.

Key Inter-Rater Reliability Metrics:
- Confusion Matrix: Matrix tracking True Positives, False Positives, True Negatives, and False Negatives of the LLM Judge relative to human expert decisions.
- Cohen's Kappa (κ): Measures agreement between the LLM Judge and human raters while controlling for agreement occurring purely by chance. (κ > 0.70 represents strong alignment).
- Matthew's Correlation Coefficient (MCC): A balanced metric for binary classification that remains reliable even under heavy class imbalance.

Biases in LLM Judges:
- Position Bias: Preference for the first or last candidate answer in pairwise comparison settings. Mitigate by swapping option order and averaging dual runs.
- Verbosity Bias: Systematic preference for longer, verbose responses over concise, accurate ones. Mitigate by imposing word-count constraints and explicit length penalties in judge rubrics.
- Self-Enhancement Bias: Tendency of an LLM judge to favor outputs generated by its own model family. Mitigate by using cross-provider evaluation models (e.g., using Gemini to judge Claude or vice-versa).

Final Rule: Never ship an LLM Judge into production without validating its Cohen's Kappa against a multi-annotator human benchmark test set.`
};
