'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewTab, Concept } from './types';
import { INITIAL_CONCEPTS, getConceptById } from './data/concepts';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { ChallengePage } from './components/ChallengePage';
import { EvidencePage } from './components/EvidencePage';
import { TrackPage } from './components/TrackPage';
import { AccountPage } from './components/AccountPage';
import { clearPersistedActiveChallenge, clearAttemptDraft } from './services/attemptService';
import { resetHintStateForConcept } from './services/hintService';
import { getSupabaseBrowserClient } from './lib/supabase-browser';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('home');
  const [activeConcept, setActiveConcept] = useState<Concept>(INITIAL_CONCEPTS[0]);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setAuthUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch (e) {
      console.warn('Supabase auth state listener init warning:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('forgemind_tab');
      if (
        saved &&
        [
          'home',
          'prove',
          'concept-preview',
          'material',
          'challenge',
          'evidence',
          'track',
          'profile',
          'account'
        ].includes(saved)
      ) {
        setCurrentTab(saved as ViewTab);
      }
      const savedConceptId = sessionStorage.getItem('forgemind_concept_id');
      if (savedConceptId) {
        const found = getConceptById(savedConceptId);
        if (found) setActiveConcept(found);
      }
    } catch {
      // Ignore storage errors on client
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('forgemind_tab', currentTab);
    } catch {
      // Ignore
    }
  }, [currentTab]);

  useEffect(() => {
    if (activeConcept) {
      try {
        sessionStorage.setItem('forgemind_concept_id', activeConcept.id);
      } catch {
        // Ignore
      }
    }
  }, [activeConcept]);

  const handleNavigate = (tab: ViewTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Flow: Concept Explorer -> Select Concept -> Concept Preview
  // Clear stale session states so selecting a topic from the library starts at Tier 0
  const handleSelectConcept = (concept: Concept) => {
    clearPersistedActiveChallenge(concept.id);
    resetHintStateForConcept(concept.id);
    clearAttemptDraft(concept.id);

    setActiveConcept(concept);
    setCurrentTab('concept-preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Flow: Concept Preview -> "Prove This" -> Challenge experience
  const handleProveThis = () => {
    if (activeConcept) {
      clearPersistedActiveChallenge(activeConcept.id);
      resetHintStateForConcept(activeConcept.id);
      clearAttemptDraft(activeConcept.id);
    }
    setCurrentTab('challenge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFeaturedConcept = (conceptId: string) => {
    let concept = getConceptById(conceptId);
    if (!concept && INITIAL_CONCEPTS.length > 0) {
      concept = INITIAL_CONCEPTS[0];
    }
    if (concept) {
      clearPersistedActiveChallenge(concept.id);
      resetHintStateForConcept(concept.id);
      clearAttemptDraft(concept.id);
      setActiveConcept(concept);
    }
    setCurrentTab('challenge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConceptConfirmed = (concept: Concept) => {
    clearPersistedActiveChallenge(concept.id);
    resetHintStateForConcept(concept.id);
    clearAttemptDraft(concept.id);
    setActiveConcept(concept);
    setCurrentTab('challenge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-canvas-base text-text-primary flex flex-col selection:bg-accent-rose-soft selection:text-primary-container">
      {/* Navigation Header */}
      <Header currentTab={currentTab} onNavigate={handleNavigate} user={authUser} />

      {/* Main Viewport */}
      <main className="flex-1">
        {(currentTab === 'home' || currentTab === 'prove' || currentTab === 'concept-preview') && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectFeaturedConcept={handleSelectFeaturedConcept}
            onConceptConfirmed={handleConceptConfirmed}
            initialIngestionMode={currentTab === 'prove' ? 'library' : undefined}
          />
        )}

        {currentTab === 'challenge' && (
          <ChallengePage
            concept={activeConcept}
            onBackToProve={() => {
              handleNavigate('home');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'evidence' && (
          <EvidencePage onNavigate={handleNavigate} />
        )}

        {currentTab === 'track' && (
          <TrackPage onNavigate={handleNavigate} />
        )}

        {(currentTab === 'profile' || currentTab === 'account') && (
          <AccountPage onNavigate={handleNavigate} user={authUser} />
        )}
      </main>

      {/* Editorial DocKit Light Footer */}
      <footer className="border-t border-border-hairline bg-canvas-subtle py-8 text-xs font-body-sm text-text-secondary">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <img src="/forgemind-icon.png" alt="ForgeMind" className="h-6 w-6 object-contain" />
            <span className="font-display font-bold text-text-primary">ForgeMind</span>
            <span className="text-border-hairline">|</span>
            <span className="font-body-sm italic text-text-muted">&ldquo;You learned it. Now prove you can use it.&rdquo;</span>
          </div>

          <div className="flex items-center space-x-6 font-label-sm text-xs">
            <button
              onClick={() => handleNavigate('home')}
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              Studio
            </button>
            <button
              onClick={() => handleNavigate('track')}
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              Track
            </button>
            <button
              onClick={() => handleNavigate('evidence')}
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              Evidence Vault
            </button>
            <button
              onClick={() => handleNavigate('profile')}
              className="hover:text-text-primary transition-colors cursor-pointer text-primary-container font-semibold"
            >
              Profile
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
