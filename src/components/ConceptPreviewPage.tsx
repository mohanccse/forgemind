'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, Award, Gauge, Sparkles, BookOpen } from 'lucide-react';
import { Concept, ViewTab } from '../types';

interface ConceptPreviewPageProps {
  concept: Concept;
  onBackToExplorer: () => void;
  onProveThis: () => void;
  onNavigate: (tab: ViewTab) => void;
}

export const ConceptPreviewPage: React.FC<ConceptPreviewPageProps> = ({
  concept,
  onBackToExplorer,
  onProveThis,
  onNavigate
}) => {
  const domainColors = {
    'Product Management': 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    'AI / Technology': 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    'SQL / Data': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
  };

  const difficultyColor = 
    concept.approximateDifficulty?.includes('Advanced') || concept.difficultyLevels.includes('Advanced')
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-sky-400 border-sky-500/30 bg-sky-500/10';

  return (
    <div id="concept-preview-page" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <button
          id="preview-back-btn"
          onClick={onBackToExplorer}
          className="inline-flex items-center space-x-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Concept Explorer</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-zinc-500">
          <span>Path A: Verified Library</span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400">{concept.name}</span>
        </div>
      </div>

      {/* Main Concept Preview Card */}
      <div className="mt-8 rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-sm sm:p-10">
        {/* Domain Badge & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-mono font-medium uppercase tracking-wider ${
              domainColors[concept.domain] || 'border-zinc-700 bg-zinc-800 text-zinc-300'
            }`}
          >
            {concept.domain}
          </span>

          <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-300">
            <Lock className="h-3 w-3" />
            <span>Reference Stripped Upon Entry</span>
          </div>
        </div>

        {/* 1. Concept Name */}
        <h1
          id="preview-concept-name"
          className="mt-6 font-serif text-3xl font-medium tracking-tight text-zinc-100 sm:text-4xl"
        >
          {concept.name}
        </h1>

        {/* 2. Short Description */}
        <p
          id="preview-concept-description"
          className="mt-3 text-base leading-relaxed text-zinc-300 sm:text-lg"
        >
          {concept.description}
        </p>

        {/* 3. Skill Being Tested & 4. Approximate Challenge Difficulty */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Skill Being Tested */}
          <div
            id="preview-skill-tested"
            className="rounded-xl border border-zinc-800 bg-[#0e0f15] p-5 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center space-x-2 text-amber-400">
              <Award className="h-4 w-4" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">
                Skill Being Tested
              </span>
            </div>
            <p className="mt-2.5 text-sm font-medium leading-relaxed text-zinc-200">
              "{concept.underlyingSkill}"
            </p>
            <div className="mt-3 text-[11px] text-zinc-500">
              Evaluates structural thinking under authentic real-world constraints.
            </div>
          </div>

          {/* Approximate Challenge Difficulty */}
          <div
            id="preview-challenge-difficulty"
            className="rounded-xl border border-zinc-800 bg-[#0e0f15] p-5 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center space-x-2 text-zinc-400">
              <Gauge className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">
                Approximate Difficulty
              </span>
            </div>

            <div className="mt-2.5 flex items-center space-x-2">
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-mono font-medium ${difficultyColor}`}
              >
                {concept.approximateDifficulty || 'Applied (Practitioner)'}
              </span>
            </div>

            {/* Difficulty Scale Dots */}
            <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-zinc-500">
              <span>Spectrum:</span>
              {['Foundational', 'Applied', 'Advanced'].map((level) => {
                const isIncluded = concept.difficultyLevels.includes(level as any);
                return (
                  <span
                    key={level}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                      isIncluded
                        ? 'bg-zinc-800 text-zinc-300 font-medium'
                        : 'text-zinc-600'
                    }`}
                  >
                    {level}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Challenge Ground Rules (Transparent execution contract) */}
        <div className="mt-8 rounded-xl border border-zinc-800/80 bg-[#0b0c10] p-5">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>What happens when you click "Prove This"</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-zinc-400">
            <div className="rounded-lg border border-zinc-900 bg-zinc-900/40 p-3">
              <strong className="text-zinc-300 block mb-1">1. Novel Scenario</strong>
              You receive an unfamiliar edge-case situation never seen in standard tutorials.
            </div>
            <div className="rounded-lg border border-zinc-900 bg-zinc-900/40 p-3">
              <strong className="text-zinc-300 block mb-1">2. Zero Cribbing</strong>
              Notes, formulas, and search shortcuts are stripped. You solve from synthesis.
            </div>
            <div className="rounded-lg border border-zinc-900 bg-zinc-900/40 p-3">
              <strong className="text-zinc-300 block mb-1">3. Capability Audit</strong>
              Your response is evaluated against milestone reasoning and trade-off defense.
            </div>
          </div>
        </div>

        {/* Primary CTA Transition */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 sm:flex-row">
          <button
            id="preview-choose-another-btn"
            onClick={onBackToExplorer}
            className="w-full text-center text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors sm:w-auto"
          >
            ← Explore other concepts
          </button>

          <button
            id="prove-this-btn"
            onClick={onProveThis}
            className="group flex w-full items-center justify-center space-x-2 rounded-lg bg-amber-400 px-7 py-3.5 text-sm font-semibold text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:shadow-amber-500/20 active:scale-[0.99] sm:w-auto"
          >
            <span>Prove This</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
