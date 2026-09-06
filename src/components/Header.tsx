'use client';

import React from 'react';
import { ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { ViewTab } from '../types';

interface HeaderProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  return (
    <header id="main-header" className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0c0d12]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <button
            id="brand-home-btn"
            onClick={() => onNavigate('home')}
            className="group flex items-center space-x-3 text-left transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all group-hover:border-amber-500/50">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-lg font-semibold tracking-tight text-zinc-100">
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

          {/* Simple Navigation Links */}
          <nav className="flex items-center space-x-1 pl-4 border-l border-zinc-800">
            <button
              id="nav-prove-btn"
              onClick={() => onNavigate('prove')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
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
              className={`flex items-center space-x-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
                currentTab === 'evidence'
                  ? 'bg-zinc-800 text-amber-300 font-semibold shadow-inner'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4 opacity-70" />
              <span>My Evidence</span>
            </button>
          </nav>
        </div>

        {/* Secondary Action: Add Study Material */}
        <div className="flex items-center space-x-3">
          <button
            id="header-add-material-btn"
            onClick={() => onNavigate('material')}
            className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              currentTab === 'material'
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Study Material</span>
          </button>
        </div>
      </div>
    </header>
  );
};
