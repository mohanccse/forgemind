'use client';

import React from 'react';
import {
  ArrowRight,
  FileUp,
  BrainCircuit,
  Lock,
  Target,
  FileCheck,
  Award,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ViewTab } from '../types';

interface HomePageProps {
  onNavigate: (tab: ViewTab) => void;
  onSelectFeaturedConcept: (conceptId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectFeaturedConcept }) => {
  const steps = [
    { num: '01', title: 'Concept or Material', desc: 'Curated core concept or raw study notes', icon: BrainCircuit },
    { num: '02', title: 'Capability Model', desc: 'Deconstructs underlying operational principles', icon: Target },
    { num: '03', title: 'Novel Challenge', desc: 'Unfamiliar scenario never seen in tutorials', icon: Sparkles },
    { num: '04', title: 'Pre-Confidence', desc: 'Calibrate your predicted capability level', icon: Award },
    { num: '05', title: 'Independent Attempt', desc: 'Zero reference material active. Pure application', icon: Lock },
    { num: '06', title: 'Evidence Evaluation', desc: 'Rigorous diagnostic of structural reasoning', icon: FileCheck },
    { num: '07', title: 'Progressive Hints', desc: 'Tiered scaffolds with transparency tracking', icon: AlertTriangle },
    { num: '08', title: 'Capability Evidence', desc: 'Verifiable proof of independent execution', icon: Award }
  ];

  return (
    <div id="home-page" className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Subtle Background Glows (minimal, no excessive gradients) */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
        <div className="h-[400px] w-[650px] rounded-full bg-amber-500/[0.03] blur-[120px]" />
      </div>

      {/* Hero Section */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3.5 py-1 text-xs font-medium text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>ForgeMind — The De-Tutorializer</span>
        </div>

        <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
          You learned it.{' '}
          <span className="italic text-amber-200/95 block sm:inline">Now prove you can use it.</span>
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Turn what you study into unfamiliar challenges that reveal what you can actually apply.
        </p>

        {/* Primary Entry Doors: Door 1 & Door 2 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* DOOR 1: Content Library */}
          <div
            id="home-door-1-card"
            className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#0f1118] p-6 transition-all hover:border-amber-500/40 hover:bg-[#12141f] shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-400">
                  DOOR 1
                </span>
                <BrainCircuit className="h-5 w-5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </div>

              <h3 className="mt-4 font-serif text-xl font-normal text-zinc-100">
                Choose from the Content Library
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Test yourself against verified operational concepts across Product Management, AI Engineering, and SQL Analytical Systems.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80">
              <button
                id="enter-door-1-btn"
                onClick={() => onNavigate('prove')}
                className="flex items-center space-x-2 text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors"
              >
                <span>Browse Content Library</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* DOOR 2: Bring My Own Study Material */}
          <div
            id="home-door-2-card"
            className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#0f1118] p-6 transition-all hover:border-amber-500/40 hover:bg-[#12141f] shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-400">
                  DOOR 2
                </span>
                <FileUp className="h-5 w-5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </div>

              <h3 className="mt-4 font-serif text-xl font-normal text-zinc-100">
                Bring My Own Study Material
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Paste raw study notes, book excerpts, or technical documentation. ForgeMind normalizes your content, extracts the latent capability model, and tests you in an unreferenced workplace dilemma.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80">
              <button
                id="enter-door-2-btn"
                onClick={() => onNavigate('material')}
                className="flex items-center space-x-2 text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors"
              >
                <span>Bring My Study Material</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Interactive Preview Teaser */}
      <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-medium text-amber-400">
                SAMPLE NOVEL CHALLENGE
              </span>
              <span className="text-xs text-zinc-500">Zero Reference Allowed</span>
            </div>
            <h3 className="mt-2 text-xl font-medium text-zinc-100">
              The Series B Roadmap Deadlock: RICE Under Bias
            </h3>
          </div>
          <button
            id="teaser-preview-challenge-btn"
            onClick={() => onSelectFeaturedConcept('rice-prioritization')}
            className="flex items-center space-x-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-amber-300 transition-all hover:border-amber-500/40 hover:bg-zinc-800"
          >
            <span>Enter Challenge Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800/80 bg-[#0e0f15] p-4 lg:col-span-2">
            <div className="text-xs font-mono tracking-wide text-zinc-400 uppercase">Unfamiliar Scenario</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Your startup has 6 weeks of runway before the board meeting. Sales claims Feature A will close two $200k ARR deals (Confidence 50%). Product claims Feature B will cut self-serve churn for 4,200 accounts (Confidence 80%). The formulas are in your head—can you defend your trade-off under executive scrutiny?
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800/80 bg-[#0e0f15] p-4">
            <div>
              <div className="text-xs font-mono tracking-wide text-zinc-400 uppercase">Observation State</div>
              <div className="mt-2 flex items-center space-x-2 text-xs text-emerald-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Reference materials stripped</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Evaluates your ability to independently spot mathematical vulnerability and unit mismatch without crib notes.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <span className="text-[11px] font-mono text-zinc-500">Target Capability: Quantitative Prioritization Defense</span>
            </div>
          </div>
        </div>
      </div>

      {/* The Anti-Tutorializer Principle Section */}
      <div className="mt-20">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-normal text-zinc-100 sm:text-3xl">
            The Anti-Tutorializer Principle
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Tutorials create an illusion of competence. When you follow along with a guide, you are recognizing, not producing. ForgeMind changes the conditions.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* What ForgeMind is NOT */}
          <div className="rounded-xl border border-rose-950/40 bg-rose-950/10 p-6">
            <div className="flex items-center space-x-2 text-rose-400">
              <XCircle className="h-5 w-5" />
              <h3 className="font-medium text-zinc-200">What ForgeMind Is NOT</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-zinc-400">
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Not a generic AI tutor:</strong> It doesn't hold your hand or spoon-feed answers.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Not a chatbot:</strong> No endless conversational rabbit holes or polite pleasantries.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Not a quiz generator:</strong> No multiple-choice trivia testing rote memory.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Not an answer generator:</strong> It does not do the intellectual heavy lifting for you.</span>
              </li>
            </ul>
          </div>

          {/* What ForgeMind DOES */}
          <div className="rounded-xl border border-emerald-950/40 bg-emerald-950/10 p-6">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="font-medium text-zinc-200">The ForgeMind Standard</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-zinc-400">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Removes reference materials:</strong> Tests raw, unassisted mental retrieval and application.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Presents novel scenarios:</strong> Edge cases and real dilemmas you cannot solve from memorization.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Transparent hint tracking:</strong> Unlocking hints documents your level of autonomy.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-mono text-xs mt-0.5">•</span>
                <span><strong>Capability evidence:</strong> Yields verifiable proof that you can actually execute in the real world.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Core Experience Pipeline */}
      <div className="mt-20">
        <div className="text-center">
          <div className="text-xs font-mono tracking-widest text-amber-400 uppercase">
            The Core Pipeline
          </div>
          <h2 className="mt-2 font-serif text-2xl font-normal text-zinc-100 sm:text-3xl">
            From Study Material to Verified Capability
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
            A disciplined loop designed to replace passive consumption with verified execution.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
              >
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-mono text-xs text-amber-400/80">{step.num}</span>
                  <Icon className="h-4 w-4 text-zinc-400 group-hover:text-amber-300 transition-colors" />
                </div>
                <h4 className="mt-3 text-sm font-medium text-zinc-200">{step.title}</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => onNavigate('prove')}
            className="inline-flex items-center space-x-2 text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            <span>Explore all available proof domains</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
