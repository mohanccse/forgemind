'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Award,
  Zap,
  Flame,
  CheckCircle2,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  User,
  Check,
  Clock,
  Fingerprint,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { ViewTab, LearnerAttempt } from '../types';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';
import { getAllAttempts } from '../services/attemptService';

interface AccountPageProps {
  onNavigate: (tab: ViewTab) => void;
  user: any;
}

interface TopicGroup {
  conceptId: string;
  conceptName: string;
  attemptCount: number;
  attempts: LearnerAttempt[];
}

function computeAttemptPercentage(attempt: LearnerAttempt): string {
  if (attempt.verdict === 'NEEDS_CLARIFICATION') {
    return 'Unable to assess';
  }

  const milestonesMet = attempt.demonstrated_capabilities || attempt.evaluation?.demonstrated_capabilities || [];
  const milestonesMissing = attempt.missing_capabilities || attempt.evaluation?.missing_capabilities || [];

  const metCount = milestonesMet.length;
  const missingCount = milestonesMissing.length;
  const totalCount = metCount + missingCount;

  if (totalCount === 0) {
    return 'Unable to assess';
  }

  const percentage = Math.round((metCount / totalCount) * 100);
  return `${percentage}%`;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate, user }) => {
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [zeroRefEnforced, setZeroRefEnforced] = useState<boolean>(true);
  const [spacedProbesEnabled, setSpacedProbesEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Load attempts belonging to logged in user or local browser storage
    const allAttempts = getAllAttempts(user?.id);

    const grouped: Record<string, LearnerAttempt[]> = {};
    allAttempts.forEach((a) => {
      const key = a.concept_id || 'general-practice';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });

    const topicList: TopicGroup[] = Object.entries(grouped).map(([conceptKey, attempts]) => ({
      conceptId: conceptKey,
      conceptName: conceptKey.replace(/[-_]+/g, ' ').toUpperCase(),
      attemptCount: attempts.length,
      attempts: attempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }));

    setTopicGroups(topicList);
  }, [user]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      onNavigate('home');
    } catch (err) {
      console.error('Logout error:', err);
      onNavigate('home');
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mohan C.';
  const userHandle = user?.email ? `@${user.email.split('@')[0]}` : '@mohanccse';
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  return (
    <div id="profile-page" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* User Hero Profile Card */}
      <section className="w-full bg-canvas-elevated rounded-2xl border border-border-hairline shadow-sm p-6 sm:p-7 flex flex-col gap-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full p-1 bg-surface-container flex-shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  className="w-full h-full rounded-full object-cover"
                  src={avatarUrl}
                  alt={displayName}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary-container text-white font-display text-xl font-bold flex items-center justify-center">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-xl sm:text-2xl text-text-primary font-bold truncate">
                  {displayName}
                </h1>
                <ShieldCheck className="w-5 h-5 text-primary-container shrink-0" />
              </div>
              <p className="font-code-sm text-xs text-text-muted">{userHandle}</p>
              <span className="font-label-sm text-xs text-text-secondary mt-0.5">
                Lead Product Strategist · Cognitive Evaluator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={handleLogout}
                className="h-9 px-3.5 rounded-full bg-surface-container hover:bg-rose-50 hover:text-rose-600 text-text-secondary font-label-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Verified Badge & Sandbox Tier */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-rose-tint text-primary-container font-label-sm text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Tier-1 Verified Practitioner</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-text-secondary font-label-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ForgeMind Sandbox Tier</span>
          </div>
        </div>

        {/* Level Progress Micro-Bar */}
        <div className="bg-canvas-subtle rounded-xl p-3.5 border border-border-hairline flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-label-sm text-xs">
            <span className="font-medium text-text-primary">Level 4 Autonomous Engineer</span>
            <span className="font-code-sm text-primary-container font-semibold">1,480 / 2,000 XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary-container rounded-full" style={{ width: '74%' }} />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-canvas-subtle border border-border-hairline text-center">
            <span className="font-display text-xl sm:text-2xl text-text-primary font-bold">18</span>
            <span className="font-label-sm text-[11px] text-text-muted mt-0.5">Probes Mastered</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-canvas-subtle border border-border-hairline text-center">
            <span className="font-display text-xl sm:text-2xl text-emerald-600 font-bold">92%</span>
            <span className="font-label-sm text-[11px] text-text-muted mt-0.5">Autonomous Rate</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-canvas-subtle border border-border-hairline text-center">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-primary-container" />
              <span className="font-display text-xl sm:text-2xl text-text-primary font-bold">14d</span>
            </div>
            <span className="font-label-sm text-[11px] text-text-muted mt-0.5">Velocity Streak</span>
          </div>
        </div>
      </section>

      {/* Pedagogical Boundary & Rigor Settings */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary-container" />
            <h2 className="font-title-md text-base font-bold text-text-primary">
              Cognitive Rigor & Boundaries
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-accent-rose-tint text-primary-container font-code-sm text-[10px] font-bold uppercase tracking-wider">
            ENFORCED
          </span>
        </div>

        <div className="bg-canvas-elevated rounded-2xl border border-border-hairline shadow-sm p-5 sm:p-6 flex flex-col gap-4">
          {/* Zero Reference Enforcement */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-md text-sm text-text-primary font-semibold">
                Zero-Reference Enforcement
              </span>
              <span className="font-body-sm text-xs text-text-secondary mt-0.5 leading-relaxed">
                Locks all reference notes, study sheets, and external syntax tooltips during active crucible challenges.
              </span>
            </div>
            <button
              role="switch"
              aria-checked={zeroRefEnforced}
              onClick={() => setZeroRefEnforced(!zeroRefEnforced)}
              className={`w-12 h-7 rounded-full p-0.5 flex items-center transition-colors flex-shrink-0 cursor-pointer ${
                zeroRefEnforced ? 'bg-primary-container justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="w-full h-px bg-border-hairline" />

          {/* Progressive Hint Delay */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-md text-sm text-text-primary font-semibold">
                Progressive Hint Delay
              </span>
              <span className="font-body-sm text-xs text-text-secondary mt-0.5">
                Gated threshold before Tier-1 diagnostic hint reveals
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-text-primary font-code-sm text-xs font-semibold flex-shrink-0 border border-border-hairline">
              <span>4 Attempts</span>
            </div>
          </div>

          <div className="w-full h-px bg-border-hairline" />

          {/* Diagnostic Feedback Tone */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-md text-sm text-text-primary font-semibold">
                Diagnostic Tone
              </span>
              <span className="font-body-sm text-xs text-text-secondary mt-0.5">
                Uncompromising feedback vs generic encouragement
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-rose-tint text-primary-container font-label-sm text-xs font-semibold flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-primary-container" />
              <span>Rigorous & Direct</span>
            </div>
          </div>

          <div className="w-full h-px bg-border-hairline" />

          {/* Ledger Signature */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-sm text-text-primary font-semibold">
                  Ledger Signature
                </span>
                <Fingerprint className="w-3.5 h-3.5 text-primary-container" />
              </div>
              <span className="font-body-sm text-xs text-text-secondary mt-0.5">
                Autonomous Cryptographic Signing for skill verifications.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-code-sm text-[11px] font-bold border border-emerald-100 flex-shrink-0">
              ACTIVE
            </span>
          </div>
        </div>
      </section>

      {/* Learning Trajectory */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-primary-container" />
          <h2 className="font-title-md text-base font-bold text-text-primary">
            Learning Trajectory
          </h2>
        </div>

        <div className="bg-canvas-elevated rounded-2xl border border-border-hairline shadow-sm p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-sm text-xs text-text-muted">Primary Target Domain</span>
              <span className="font-label-md text-sm text-text-primary font-semibold mt-0.5">
                Product Strategy & AI Systems
              </span>
            </div>
            <button
              onClick={() => onNavigate('track')}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full h-px bg-border-hairline" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-sm text-xs text-text-muted">Daily Cognitive Commitment</span>
              <span className="font-label-md text-sm text-text-primary font-semibold mt-0.5">
                1 unassisted challenge / day (~15m)
              </span>
            </div>
            <Clock className="w-5 h-5 text-primary-container" />
          </div>

          <div className="w-full h-px bg-border-hairline" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-md text-sm text-text-primary font-semibold">
                Spaced Recall Probes
              </span>
              <span className="font-body-sm text-xs text-text-secondary mt-0.5">
                Notifications when memory decay models estimate retention drops
              </span>
            </div>
            <button
              role="switch"
              aria-checked={spacedProbesEnabled}
              onClick={() => setSpacedProbesEnabled(!spacedProbesEnabled)}
              className={`w-12 h-7 rounded-full p-0.5 flex items-center transition-colors flex-shrink-0 cursor-pointer ${
                spacedProbesEnabled ? 'bg-primary-container justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      </section>

      {/* Recorded Attempt History */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-container" />
            <h2 className="font-title-md text-base font-bold text-text-primary">
              Completed Topic Audits ({topicGroups.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigate('evidence')}
            className="text-xs font-label-sm font-semibold text-primary-container hover:underline"
          >
            View Evidence Vault →
          </button>
        </div>

        {topicGroups.length === 0 ? (
          <div className="bg-canvas-elevated rounded-2xl border border-border-hairline p-8 text-center text-text-muted text-xs">
            No completed topic assessments yet. Head over to the Studio to launch your first crucible challenge.
          </div>
        ) : (
          <div className="space-y-3">
            {topicGroups.map((group) => (
              <div
                key={group.conceptId}
                className="bg-canvas-elevated rounded-2xl border border-border-hairline p-4 sm:p-5 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-title-md text-sm font-bold text-text-primary">
                      {group.conceptName}
                    </span>
                    <span className="font-code-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-text-secondary">
                      {group.attemptCount} attempt{group.attemptCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-border-hairline">
                  {group.attempts.slice(0, 3).map((att) => (
                    <div
                      key={att.attempt_id}
                      className="flex items-center justify-between text-xs bg-canvas-subtle p-2.5 rounded-xl border border-border-hairline"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-code-sm text-[10px] font-bold ${
                            att.verdict === 'CORRECT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {att.verdict}
                        </span>
                        <span className="text-text-secondary font-code-sm text-[11px]">
                          {new Date(att.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-code-sm text-[11px] text-text-muted">
                          Score: <strong className="text-text-primary">{computeAttemptPercentage(att)}</strong>
                        </span>
                        <span className="font-code-sm text-[11px] text-text-muted">
                          Hints: {att.hint_tier_reached}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
