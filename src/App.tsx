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
import { ConceptExplorerPage } from './components/ConceptExplorerPage';
import { ConceptPreviewPage } from './components/ConceptPreviewPage';
import { StudyMaterialPage } from './components/StudyMaterialPage';
import { ChallengePage } from './components/ChallengePage';
import { EvidencePage } from './components/EvidencePage';
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
      if (saved && ['home', 'prove', 'concept-preview', 'material', 'challenge', 'evidence', 'account'].includes(saved)) {
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
    const concept = getConceptById(conceptId);
    if (concept) {
      clearPersistedActiveChallenge(concept.id);
      resetHintStateForConcept(concept.id);
      clearAttemptDraft(concept.id);
      setActiveConcept(concept);
    }
    setCurrentTab('concept-preview');
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
    <div className="min-h-screen bg-[#0c0d12] text-[#e4e5eb] flex flex-col selection:bg-amber-500/20 selection:text-amber-200">
      {/* Navigation Header */}
      <Header currentTab={currentTab} onNavigate={handleNavigate} user={authUser} />

      {/* Main Viewport */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectFeaturedConcept={handleSelectFeaturedConcept}
          />
        )}

        {currentTab === 'prove' && (
          <ConceptExplorerPage
            onSelectConcept={handleSelectConcept}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'concept-preview' && (
          <ConceptPreviewPage
            concept={activeConcept}
            onBackToExplorer={() => handleNavigate('prove')}
            onProveThis={handleProveThis}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'material' && (
          <StudyMaterialPage
            onNavigate={handleNavigate}
            onConceptConfirmed={handleConceptConfirmed}
          />
        )}

        {currentTab === 'challenge' && (
          <ChallengePage
            concept={activeConcept}
            onBackToProve={() => {
              const isDoor2 =
                activeConcept?.sourceType === 'USER_GENERATED' ||
                activeConcept?.isUserOwned ||
                activeConcept?.id === 'custom-concept' ||
                activeConcept?.id?.startsWith('custom-');
              handleNavigate(isDoor2 ? 'material' : 'concept-preview');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'evidence' && (
          <EvidencePage onNavigate={handleNavigate} />
        )}

        {currentTab === 'account' && (
          <AccountPage onNavigate={handleNavigate} user={authUser} />
        )}
      </main>

      {/* Minimal, Credible Footer */}
      <footer className="border-t border-zinc-900 bg-[#090a0e] py-8 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <img src="/forgemind-icon.png" alt="ForgeMind" className="h-5 w-5 rounded object-cover shadow-sm" />
            <span className="font-serif font-medium text-zinc-300">ForgeMind</span>
            <span className="text-zinc-700">|</span>
            <span className="italic text-zinc-400">"You learned it. Now prove you can use it."</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => handleNavigate('prove')}
              className="hover:text-zinc-300 transition-colors"
            >
              Prove
            </button>
            <button
              onClick={() => handleNavigate('material')}
              className="hover:text-zinc-300 transition-colors"
            >
              Study Material
            </button>
            <button
              onClick={() => handleNavigate('evidence')}
              className="hover:text-zinc-300 transition-colors"
            >
              My Evidence
            </button>
            {authUser && (
              <button
                onClick={() => handleNavigate('account')}
                className="hover:text-zinc-300 transition-colors text-amber-400 font-medium"
              >
                Account
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
