-- Migration: 001_init.sql
-- Description: Create initial 5 core tables for ForgeMind Supabase integration.
-- Guardrail: Exactly 5 tables, matching fields without extra columns or numeric scores.

-- 1. Create Enums
CREATE TYPE source_type_enum AS ENUM ('text', 'pdf', 'docx', 'youtube', 'library');
CREATE TYPE source_status_enum AS ENUM ('uploaded', 'extracted', 'failed');
CREATE TYPE session_status_enum AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE attempt_verdict_enum AS ENUM ('CORRECT', 'PARTIALLY_CORRECT', 'WRONG_APPROACH', 'NEEDS_CLARIFICATION');
CREATE TYPE flag_review_status_enum AS ENUM ('unreviewed', 'accepted', 'rejected');

-- 2. Table: sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  source_type source_type_enum NOT NULL,
  original_filename TEXT,
  source_uri TEXT,
  raw_text TEXT,
  content_hash TEXT,
  status source_status_enum NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  challenge_text TEXT NOT NULL,
  capability_milestones JSONB NOT NULL,
  hints JSONB NOT NULL,
  tier_5_solution TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  generation_latency_ms INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID,
  current_hint_tier INT NOT NULL DEFAULT 0,
  tier_4_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  status session_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: attempts
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  answer TEXT NOT NULL,
  verdict attempt_verdict_enum NOT NULL,
  evaluation_confidence DOUBLE PRECISION NOT NULL,
  injection_detected BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INT NOT NULL,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: flags
CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  review_status flag_review_status_enum NOT NULL DEFAULT 'unreviewed',
  reviewer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
