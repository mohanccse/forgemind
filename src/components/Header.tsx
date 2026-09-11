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

  return (
    <header id="main-header" className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0c0d12]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <button
            id="brand-home-btn"
            onClick={() => onNavigate('home')}
            className="group flex items-center space-x-2.5 sm:space-x-3 text-left transition-opacity hover:opacity-90"
          >
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all group-hover:border-amber-500/60">
              <img
                src="/forgemind-icon.png"
                alt="ForgeMind Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
                  ForgeMind
                </span>
                <span className="hidden rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-zinc-400 uppercase sm:inline-block">
                  De-Tutorializer
                </span>
              </div>
              <p className="hidden text-[11px] text-zinc-500 md:block">
                Prove you can use it
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 pl-2 sm:pl-4 border-l border-zinc-800">
            <button
              id="nav-prove-btn"
              onClick={() => onNavigate('prove')}
              className={`rounded-md px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'prove' || currentTab === 'challenge' || currentTab === 'concept-preview'
                  ? 'bg-zinc-800 text-amber-300 font-semibold shadow-inner'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              Prove
            </button>
            <button
              id="nav-evidence-btn"
              onClick={() => onNavigate('evidence')}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'evidence'
                  ? 'bg-zinc-800 text-amber-300 font-semibold shadow-inner'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
              <span className="hidden sm:inline">My Evidence</span>
              <span className="sm:hidden">Evidence</span>
            </button>
          </nav>
        </div>

        {/* Actions: Add Study Material (Door 2 Primary Action - Reallocated to Anchor Right Side) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="header-add-material-btn"
            onClick={() => onNavigate('material')}
            className={`flex items-center space-x-1.5 rounded-lg border px-2.5 sm:px-3.5 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'material'
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'border-zinc-700/80 bg-zinc-900/90 text-zinc-200 hover:border-amber-500/40 hover:bg-zinc-800 hover:text-amber-200'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Add Study Material</span>
            <span className="sm:hidden">Add Material</span>
          </button>

          {/* =========================================================================
              [TEMPORARILY COMMENTED OUT FOR USER RESEARCH & FRICTIONLESS REVIEW SESSIONS]
              To restore Google sign-in and Account button at any time, uncomment below:
              ========================================================================= */}
          {/*
          {_user ? (
            <button
              id="nav-account-btn"
              onClick={() => onNavigate('account')}
              className={`flex items-center space-x-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all ${
                currentTab === 'account'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{_user.email?.split('@')[0] || 'Account'}</span>
            </button>
          ) : (
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg bg-amber-400 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors shadow"
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span>Sign in with Google</span>
            </button>
          )}
          */}
        </div>
      </div>
    </header>
  );
};
