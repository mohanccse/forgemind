'use client';

import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
// [RESTORE_AUTH_IMPORTS]: import { User, LogIn } from 'lucide-react';
import { ViewTab } from '../types';
// [RESTORE_AUTH_CLIENT]: import { getSupabaseBrowserClient } from '../lib/supabase-browser';

interface HeaderProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  user?: any;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, user: _user }) => {
  /* =========================================================================
     [TEMPORARILY COMMENTED OUT FOR USER RESEARCH & FRICTIONLESS REVIEW SESSIONS]
     To restore Google sign-in at any time, uncomment the function below:
     =========================================================================
  const handleGoogleLogin = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (err) {
      console.error('Google login error:', err);
    }
  };
  ========================================================================= */

  const isStudioActive =
    currentTab === 'home' ||
    currentTab === 'prove' ||
    currentTab === 'concept-preview' ||
    currentTab === 'challenge';
  const isTrackActive = currentTab === 'track';
  const isEvidenceActive = currentTab === 'evidence';
  const isProfileActive = currentTab === 'profile' || currentTab === 'account';

  return (
    <>
      {/* Top Desktop & Mobile Header */}
      <header
        id="main-header"
        className="sticky top-0 z-50 w-full border-b border-border-hairline bg-canvas-base/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Brand Wordmark & Mode Badge */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            <button
              id="brand-home-btn"
              onClick={() => onNavigate('home')}
              className="group flex items-center space-x-2.5 text-left transition-opacity hover:opacity-90"
            >
              <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center">
                <img
                  src="/forgemind-icon.png"
                  alt="ForgeMind Logo"
                  className="h-full w-full object-contain rounded-lg shadow-xs"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-base sm:text-lg font-bold tracking-tight text-text-primary leading-tight">
                  ForgeMind
                </span>
                <span className="font-code-sm text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-text-secondary leading-tight mt-0.5">
                  THE PM DE-TUTORIALIZER
                </span>
              </div>
            </button>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-1 pl-3 sm:pl-4 border-l border-border-hairline">
              <button
                id="nav-studio-btn"
                onClick={() => onNavigate('home')}
                className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isStudioActive
                    ? 'bg-accent-rose-tint text-primary-container font-semibold shadow-xs ring-1 ring-accent-rose-soft'
                    : 'text-text-secondary hover:bg-surface-container hover:text-text-primary'
                }`}
              >
                Studio
              </button>
              <button
                id="nav-track-btn"
                onClick={() => onNavigate('track')}
                className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isTrackActive
                    ? 'bg-accent-rose-tint text-primary-container font-semibold shadow-xs ring-1 ring-accent-rose-soft'
                    : 'text-text-secondary hover:bg-surface-container hover:text-text-primary'
                }`}
              >
                Track
              </button>
              <button
                id="nav-evidence-btn"
                onClick={() => onNavigate('evidence')}
                className={`flex items-center space-x-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                  isEvidenceActive
                    ? 'bg-accent-rose-tint text-primary-container font-semibold shadow-xs ring-1 ring-accent-rose-soft'
                    : 'text-text-secondary hover:bg-surface-container hover:text-text-primary'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary-container" />
                <span>Evidence Vault</span>
              </button>
            </nav>
          </div>

          {/* Right Actions: Profile Avatar */}
          <div className="flex items-center space-x-2">
            <button
              id="header-profile-btn"
              onClick={() => onNavigate('profile')}
              title="Learner Profile & Rigor Settings"
              className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                isProfileActive
                  ? 'border-primary-container bg-accent-rose-tint text-primary-container'
                  : 'border-border-hairline bg-canvas-elevated text-text-secondary hover:text-text-primary hover:bg-canvas-subtle'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-code-sm text-[11px] font-bold shadow-xs">
                M
              </div>
              <span className="hidden sm:inline font-code-sm text-[11px]">@mohanccse</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

