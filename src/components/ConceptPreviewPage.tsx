'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, Award, Gauge } from 'lucide-react';
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
  onProveThis
}) => {
  return (
    <div id="concept-preview-page" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-border-hairline pb-4">
        <button
          id="preview-back-btn"
          onClick={onBackToExplorer}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Concept Library</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-text-muted font-mono">
          <span>Path A: Verified Library</span>
          <span className="text-border-focus">/</span>
          <span className="text-text-primary font-medium">{concept.name}</span>
        </div>
      </div>

      {/* Main Concept Preview Card */}
      <div className="mt-8 rounded-2xl border border-border-hairline bg-canvas-elevated p-6 shadow-sm sm:p-10">
        {/* Domain Badge & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-2.5 py-0.5 rounded font-code-sm text-[10px] uppercase font-bold tracking-wider bg-[#eff4ff] text-[#2563eb] border border-[#dbeafe]">
            {concept.domain}
          </span>

          <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-mono font-medium text-emerald-800">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Reference Stripped Upon Entry</span>
          </div>
        </div>

        {/* 1. Concept Name */}
        <h1
          id="preview-concept-name"
          className="mt-5 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary"
        >
          {concept.name}
        </h1>

        {/* 2. Short Description */}
        <p
          id="preview-concept-description"
          className="mt-3 text-base leading-relaxed text-text-secondary font-normal"
        >
          {concept.description}
        </p>

        {/* 3. Skill Being Tested & 4. Approximate Challenge Difficulty */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Skill Being Tested */}
          <div
            id="preview-skill-tested"
            className="rounded-xl border border-border-hairline bg-canvas-subtle p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-2 text-[#b45309]">
                <Award className="w-4 h-4" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Skill Being Tested
                </span>
              </div>
              <p className="mt-2.5 text-sm font-semibold leading-relaxed text-text-primary italic">
                "{concept.underlyingSkill}"
              </p>
            </div>
            <div className="mt-4 text-[11px] text-text-muted">
              Evaluates structural thinking under authentic real-world constraints.
            </div>
          </div>

          {/* Approximate Challenge Difficulty */}
          <div
            id="preview-challenge-difficulty"
            className="rounded-xl border border-border-hairline bg-canvas-subtle p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-2 text-text-secondary">
                <Gauge className="w-4 h-4 text-[#b45309]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
                  Approximate Difficulty
                </span>
              </div>

              <div className="mt-2.5 flex items-center space-x-2">
                <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-[#b45309] font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  <span>{concept.approximateDifficulty || 'Applied (Practitioner)'}</span>
                </span>
              </div>
            </div>

            {/* Difficulty Scale Dots */}
            <div className="mt-4 flex items-center space-x-1.5 text-[11px] text-text-muted">
              <span className="font-mono">Spectrum:</span>
              {['Foundational', 'Applied', 'Advanced'].map((level) => {
                const isIncluded = concept.difficultyLevels.includes(level as any);
                return (
                  <span
                    key={level}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                      isIncluded
                        ? 'bg-canvas-base border-border-hairline text-text-primary font-medium shadow-xs'
                        : 'text-text-muted border-transparent'
                    }`}
                  >
                    {level}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Challenge Ground Rules */}
        <div className="mt-8 rounded-xl border border-border-hairline bg-surface-container-low p-5">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-text-primary font-bold">
            <ShieldCheck className="w-4 h-4 text-primary-container" />
            <span>What happens when you click "Prove This"</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-text-secondary">
            <div className="rounded-lg border border-border-hairline bg-canvas-base p-3 shadow-xs">
              <strong className="text-text-primary block mb-1">1. Novel Scenario</strong>
              You receive an unfamiliar edge-case situation never seen in standard tutorials.
            </div>
            <div className="rounded-lg border border-border-hairline bg-canvas-base p-3 shadow-xs">
              <strong className="text-text-primary block mb-1">2. Zero Cribbing</strong>
              Notes, formulas, and search shortcuts are stripped. You solve from synthesis.
            </div>
            <div className="rounded-lg border border-border-hairline bg-canvas-base p-3 shadow-xs">
              <strong className="text-text-primary block mb-1">3. Capability Audit</strong>
              Your response is evaluated against milestone reasoning and trade-off defense.
            </div>
          </div>
        </div>

        {/* Primary CTA Transition */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border-hairline pt-6 sm:flex-row">
          <button
            id="preview-choose-another-btn"
            onClick={onBackToExplorer}
            className="w-full text-center text-xs font-medium text-text-muted hover:text-text-primary transition-colors sm:w-auto cursor-pointer"
          >
            ← Explore other concepts
          </button>

          <button
            id="prove-concept-btn"
            onClick={onProveThis}
            className="group flex w-full items-center justify-center space-x-2 rounded-full bg-primary-container px-7 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-container/90 active:scale-[0.99] sm:w-auto cursor-pointer"
          >
            <span>Prove This</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

