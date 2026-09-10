'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, User as UserIcon, BookOpen, Clock, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
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

/**
 * Computes per-attempt milestone percentage strictly as:
 * (milestones_met.length / (milestones_met.length + milestones_missing.length)) * 100
 *
 * STRICT RULE: NEEDS_CLARIFICATION attempts return "Unable to assess" (never 0%, never a placeholder).
 * No topic-level average or aggregate percentage is computed anywhere.
 */
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

  useEffect(() => {
    if (!user) return;

    // Load attempts belonging to logged in user or active session
    const allAttempts = getAllAttempts(user.id);

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

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <UserIcon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-serif text-zinc-100 sm:text-3xl">Sign in Required</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Please sign in with your Google account to access your account dashboard and view saved attempt history across devices.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center space-x-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </button>
      </div>
    );
  }

  return (
    <div id="account-page" className="mx-auto max-w-5xl px-3 py-8 sm:px-6 lg:px-8">
      {/* Account Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-lg shrink-0">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif text-xl sm:text-2xl font-normal text-zinc-100">
                Learner Account Dashboard
              </h1>
              <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0.5">
                Authenticated
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">{user.email}</p>
          </div>
        </div>
        <button
          id="account-signout-btn"
          onClick={handleLogout}
          className="flex items-center space-x-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="h-4 w-4 text-zinc-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Attempted Topics History */}
      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Attempted Topics & Per-Attempt Capability Scores
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">
            {topicGroups.length} Topic{topicGroups.length !== 1 ? 's' : ''} Attempted
          </span>
        </div>

        {topicGroups.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400 space-y-3">
            <BookOpen className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
            <p className="font-medium text-zinc-300">No challenge attempts recorded for this account yet.</p>
            <p className="text-xs text-zinc-500">Complete a challenge in Door 1 or Door 2 while logged in to view per-attempt milestone progress here.</p>
            <button
              onClick={() => onNavigate('prove')}
              className="mt-2 inline-block rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors"
            >
              Browse Content Library &rarr;
            </button>
          </div>
        ) : (
          topicGroups.map((group, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Topic / Concept</span>
                  <h3 className="font-serif text-base sm:text-lg font-normal text-zinc-100">{group.conceptName}</h3>
                </div>
                <span className="rounded bg-zinc-800 px-2.5 py-1 text-xs font-mono text-amber-300 border border-zinc-700/60 shrink-0">
                  {group.attemptCount} Attempt{group.attemptCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Per-Attempt List */}
              <div className="space-y-2.5">
                {group.attempts.map((att, aIdx) => {
                  const percentageStr = computeAttemptPercentage(att);
                  const isClarification = att.verdict === 'NEEDS_CLARIFICATION';

                  return (
                    <div
                      key={aIdx}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 p-3.5 text-xs transition-colors hover:border-zinc-700/80"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-zinc-500 text-[11px] font-semibold">
                          Attempt #{att.attempt_number || (group.attempts.length - aIdx)}
                        </span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                          att.verdict === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          att.verdict === 'PARTIALLY_CORRECT' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                          att.verdict === 'WRONG_APPROACH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}>
                          {att.verdict || 'NEEDS_CLARIFICATION'}
                        </span>
                        <span className="text-zinc-500 text-[11px] flex items-center space-x-1 font-mono">
                          <Clock className="h-3 w-3 inline" />
                          <span>{new Date(att.created_at).toLocaleDateString()} {new Date(att.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>

                      {/* Single Attempt Score */}
                      <div className="flex items-center space-x-2 font-mono text-xs self-end sm:self-auto">
                        <span className="text-zinc-400 text-[11px]">Attempt Score:</span>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          isClarification
                            ? 'bg-zinc-800 text-zinc-400 italic text-[11px]'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {percentageStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
