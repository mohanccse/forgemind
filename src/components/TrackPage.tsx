'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Zap,
  Target,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Calendar,
  Sparkles,
  Layers,
  BarChart3
} from 'lucide-react';
import { ViewTab } from '../types';
import { INITIAL_CONCEPTS } from '../data/concepts';
import { getAllAttempts } from '../services/attemptService';

interface TrackPageProps {
  onNavigate: (tab: ViewTab) => void;
}

interface DomainMilestone {
  id: string;
  name: string;
  category: string;
  totalChallenges: number;
  completedChallenges: number;
  autonomousPercent: number;
  level: string;
  status: 'in-progress' | 'mastered' | 'locked';
}

export const TrackPage: React.FC<TrackPageProps> = ({ onNavigate }) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const attempts = getAllAttempts();

  const domains: DomainMilestone[] = [
    {
      id: 'prod-strategy',
      name: 'Product Strategy & Prioritization',
      category: 'Strategic Decision-Making',
      totalChallenges: 6,
      completedChallenges: Math.min(6, attempts.filter(a => a.concept_id?.includes('rice') || a.concept_id?.includes('product')).length || 4),
      autonomousPercent: 92,
      level: 'Level 4 Mastery',
      status: 'in-progress'
    },
    {
      id: 'sys-design',
      name: 'Distributed Systems & Scalability',
      category: 'System Architecture',
      totalChallenges: 5,
      completedChallenges: Math.min(5, attempts.filter(a => a.concept_id?.includes('cache') || a.concept_id?.includes('raft')).length || 2),
      autonomousPercent: 85,
      level: 'Level 3 Calibrated',
      status: 'in-progress'
    },
    {
      id: 'ai-agents',
      name: 'Autonomous AI & Evaluation Pipelines',
      category: 'AI Systems',
      totalChallenges: 4,
      completedChallenges: Math.min(4, attempts.filter(a => a.concept_id?.includes('rag') || a.concept_id?.includes('eval')).length || 3),
      autonomousPercent: 88,
      level: 'Level 3 Calibrated',
      status: 'in-progress'
    },
    {
      id: 'eng-lead',
      name: 'Engineering Governance & Incident Triage',
      category: 'Leadership & Ops',
      totalChallenges: 5,
      completedChallenges: 1,
      autonomousPercent: 70,
      level: 'Level 2 Foundations',
      status: 'in-progress'
    }
  ];

  const totalPossible = domains.reduce((acc, d) => acc + d.totalChallenges, 0);
  const totalCompleted = domains.reduce((acc, d) => acc + d.completedChallenges, 0);
  const overallPercentage = Math.round((totalCompleted / totalPossible) * 100);

  return (
    <div id="track-page" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col items-start gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-text-secondary border border-border-hairline shadow-xs">
          <TrendingUp className="w-3.5 h-3.5 text-primary-container" />
          <span className="font-code-sm text-[11px] font-medium tracking-tight">
            Learning Trajectory & Milestone Progression
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4 mt-1">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-text-primary">Mastery </span>
              <span className="text-primary-container">Progression Track</span>
            </h1>
            <p className="font-body-md text-sm text-text-secondary mt-1.5 leading-relaxed max-w-xl">
              Track your autonomous milestone accomplishments across core engineering and product disciplines without tutorial illusions.
            </p>
          </div>

          <button
            onClick={() => onNavigate('prove')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-container text-white font-label-sm text-xs font-bold shadow-sm hover:bg-primary-container/90 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>Continue Challenge</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global Progression Micro-Board */}
      <div className="mt-6 bg-canvas-elevated border border-border-hairline rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent-rose-tint border border-accent-rose-soft flex items-center justify-center text-primary-container shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-text-primary">
                  Level 4 Autonomous Engineer
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-code-sm text-[10px] font-bold">
                  Top 8%
                </span>
              </div>
              <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                {totalCompleted} of {totalPossible} Milestones Verified ({overallPercentage}% completed)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="font-code-sm text-xs text-text-muted uppercase font-medium block">
                Cognitive Velocity
              </span>
              <span className="font-display text-lg font-extrabold text-primary-container">
                14-Day Streak
              </span>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between font-label-sm text-xs text-text-secondary">
            <span>Progress to Level 5 Principal Auditor</span>
            <span className="font-code-sm font-semibold text-primary-container">1,480 / 2,000 XP</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Quick Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border-hairline">
          <div className="bg-canvas-subtle p-3 rounded-xl border border-border-hairline">
            <span className="font-code-sm text-[10px] text-text-muted uppercase block">Probes Solved</span>
            <span className="font-display text-lg font-bold text-text-primary mt-0.5 block">{attempts.length || 18}</span>
          </div>
          <div className="bg-canvas-subtle p-3 rounded-xl border border-border-hairline">
            <span className="font-code-sm text-[10px] text-text-muted uppercase block">Autonomous Rate</span>
            <span className="font-display text-lg font-bold text-emerald-600 mt-0.5 block">92%</span>
          </div>
          <div className="bg-canvas-subtle p-3 rounded-xl border border-border-hairline">
            <span className="font-code-sm text-[10px] text-text-muted uppercase block">Active Domains</span>
            <span className="font-display text-lg font-bold text-text-primary mt-0.5 block">{domains.length}</span>
          </div>
          <div className="bg-canvas-subtle p-3 rounded-xl border border-border-hairline">
            <span className="font-code-sm text-[10px] text-text-muted uppercase block">Signed Proofs</span>
            <span className="font-display text-lg font-bold text-primary-container mt-0.5 block">24</span>
          </div>
        </div>
      </div>

      {/* Domain Tracks List */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-title-md text-base font-bold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-container" />
            <span>Capability Tracks & Milestones</span>
          </h2>
          <span className="font-code-sm text-xs text-text-muted">4 Active Tracks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((domain) => {
            const domainPct = Math.round((domain.completedChallenges / domain.totalChallenges) * 100);

            return (
              <div
                key={domain.id}
                className="bg-canvas-elevated rounded-2xl p-5 border border-border-hairline shadow-sm hover:border-border-focus transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-text-secondary font-code-sm text-[10px] uppercase font-bold tracking-wider">
                      {domain.category}
                    </span>
                    <span className="font-code-sm text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {domain.level}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-text-primary mt-2 leading-snug">
                    {domain.name}
                  </h3>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-label-sm">
                      <span className="text-text-secondary">
                        {domain.completedChallenges} of {domain.totalChallenges} challenges
                      </span>
                      <span className="font-code-sm font-bold text-text-primary">{domainPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full"
                        style={{ width: `${domainPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry info */}
                  <div className="flex items-center justify-between text-[11px] font-code-sm text-text-muted mt-3 pt-3 border-t border-border-hairline">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Zap className="w-3 h-3" />
                      {domain.autonomousPercent}% Autonomous Accuracy
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-primary-container" />
                      Audited
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('prove')}
                  className="mt-4 w-full h-9 rounded-full bg-surface-container hover:bg-slate-200 text-text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Practice Track Challenges</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ground Rules & Spaced Retention Reminder */}
      <div className="mt-8 bg-canvas-subtle border border-border-hairline rounded-2xl p-5 flex items-start gap-3.5">
        <Sparkles className="w-5 h-5 text-primary-container shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-title-md text-sm font-bold text-text-primary">
            Continuous Retention & Ebbinghaus Decay Protection
          </h4>
          <p className="font-body-sm text-xs text-text-secondary leading-relaxed">
            ForgeMind continuously assesses retention decay across your verified capabilities. If a concept has not been exercised autonomously within 21 days, targeted zero-reference probe challenges will appear in your Studio queue.
          </p>
        </div>
      </div>
    </div>
  );
};
