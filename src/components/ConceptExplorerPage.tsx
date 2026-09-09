'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, Layers, HelpCircle, Sparkles, Filter, X, Gauge } from 'lucide-react';
import { Concept, Domain } from '../types';
import { getConcepts, DOMAINS } from '../data/concepts';

interface ConceptExplorerPageProps {
  onSelectConcept: (concept: Concept) => void;
}

export const ConceptExplorerPage: React.FC<ConceptExplorerPageProps> = ({ onSelectConcept }) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allConcepts = useMemo(() => getConcepts(undefined, undefined), []);

  const filteredConcepts = useMemo(() => {
    return allConcepts.filter((c) => {
      const matchesDomain = selectedDomain === 'All' || c.domain === selectedDomain;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.underlyingSkill.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q);
      return matchesDomain && matchesSearch;
    });
  }, [allConcepts, selectedDomain, searchQuery]);

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allConcepts.length };
    DOMAINS.forEach((d) => {
      counts[d] = allConcepts.filter((c) => c.domain === d).length;
    });
    return counts;
  }, [allConcepts]);

  return (
    <div id="concept-explorer-page" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 text-xs font-medium text-amber-300">
              <span>Path A • Verified Concept Library</span>
            </div>
            <h1 className="mt-3 font-serif text-3xl font-normal text-zinc-100 sm:text-4xl">
              What do you want to prove?
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              Select a core concept to inspect the skill benchmark, calibrate your readiness, and tackle an unfamiliar novel challenge under zero-reference conditions.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500/80 animate-pulse" />
            <span>{allConcepts.length} verified capability models ready</span>
          </div>
        </div>

        {/* Controls: Search and Filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="concept-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts or underlying skills..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-2 pl-10 pr-9 text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Domain Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', ...DOMAINS].map((domain) => {
              const isActive = selectedDomain === domain;
              const count = domainCounts[domain] || 0;
              return (
                <button
                  key={domain}
                  id={`filter-tab-${domain.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setSelectedDomain(domain)}
                  className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <span>{domain}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? 'bg-amber-400/20 text-amber-200' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Concept Cards Grid */}
      <div className="mt-8">
        {filteredConcepts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredConcepts.map((concept) => {
              return (
                <div
                  key={concept.id}
                  id={`concept-card-${concept.id}`}
                  onClick={() => onSelectConcept(concept)}
                  className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg cursor-pointer"
                >
                  <div>
                    {/* Top Row: Domain Tag & Difficulty */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="rounded px-2 py-0.5 text-[11px] font-mono font-medium tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {concept.domain}
                        </span>
                        {concept.sourceType === 'USER_GENERATED' && (
                          <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 text-[10px] font-mono font-semibold">
                            BYO Material
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 flex items-center space-x-1 font-mono">
                        <Gauge className="h-3 w-3 text-amber-400/80" />
                        <span>{concept.approximateDifficulty || 'Applied'}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-3 text-lg font-semibold text-zinc-100 group-hover:text-amber-200 transition-colors">
                      {concept.name}
                    </h3>

                    {/* Concept Core Description */}
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2">
                      {concept.description}
                    </p>

                    {/* Skill Tested */}
                    <div className="mt-4 rounded-md border border-zinc-800 bg-[#0e0f14] p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">
                        Skill Tested
                      </div>
                      <p className="mt-1 text-xs text-zinc-300 leading-snug line-clamp-2 font-medium">
                        "{concept.underlyingSkill}"
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-800/70 pt-3.5">
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      Select for preview
                    </span>
                    <span className="flex items-center space-x-1 text-xs font-semibold text-amber-300 group-hover:text-amber-200">
                      <span>View Preview</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            id="concepts-empty-state"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-800/40 text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-medium text-zinc-200">No concepts found</h3>
            <p className="mt-1.5 max-w-sm text-xs text-zinc-400">
              No matching modules for "{searchQuery}" in{' '}
              {selectedDomain === 'All' ? 'any domain' : selectedDomain}.
            </p>
            <div className="mt-5 flex items-center space-x-3">
              <button
                id="empty-state-reset-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDomain('All');
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700"
              >
                Reset Search & Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
