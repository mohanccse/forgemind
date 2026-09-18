'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, ArrowLeft, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Concept, ViewTab } from '../types';
import { getConcepts, DOMAINS } from '../data/concepts';

interface ConceptExplorerPageProps {
  onSelectConcept: (concept: Concept) => void;
  onNavigate?: (tab: ViewTab) => void;
}

export const ConceptExplorerPage: React.FC<ConceptExplorerPageProps> = ({ onSelectConcept, onNavigate }) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchStart = () => {
    const firstSelected = allConcepts.find((c) => selectedIds.has(c.id));
    if (firstSelected) {
      onSelectConcept(firstSelected);
    }
  };

  return (
    <div id="concept-explorer-page" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-canvas-base min-h-screen">
      {/* Top Context & Header Section */}
      <header className="w-full mb-6">
        <div className="flex items-center gap-1.5 mb-2.5">
          <button
            id="explorer-back-home-btn"
            onClick={() => (onNavigate ? onNavigate('home') : window.history.back())}
            className="inline-flex items-center gap-1 font-label-sm text-label-sm text-text-muted hover:text-text-primary transition-colors py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <span className="text-border-focus font-body-sm">·</span>
          <span className="font-label-sm text-label-sm text-primary font-semibold tracking-wide uppercase">
            Verified Concept Library
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2 max-w-3xl">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-text-primary tracking-tight">
              What do you want to{' '}
              <span className="text-primary-container font-bold underline decoration-accent-rose-soft underline-offset-4">
                prove
              </span>
              ?
            </h1>
            <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
              Select a core concept to inspect the skill benchmark, calibrate readiness, and tackle novel evaluation
              challenges under zero-reference conditions.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-rose-tint border border-accent-rose-soft self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="font-code-sm text-[11px] text-primary font-medium tracking-tight">
              {allConcepts.length} verified capability benchmarks calibrated
            </span>
          </div>
        </div>
      </header>

      {/* Search and Category Filter Section */}
      <section className="w-full flex flex-col gap-3.5 mb-6">
        {/* Search Bar */}
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="concept-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concept, skill tested, or taxonomy..."
            className="w-full pl-10 pr-20 py-2.5 bg-canvas-elevated rounded-full font-body-sm text-body-sm text-text-primary placeholder:text-text-muted border border-border-hairline focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all shadow-[0_1px_4px_rgba(15,23,42,0.04)]"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-code-sm text-text-muted bg-canvas-subtle rounded border border-border-hairline">
              ⌘K
            </kbd>
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-canvas-subtle transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters Scroll Row */}
        <div className="w-full overflow-x-auto no-scrollbar py-1 flex items-center gap-2">
          {['All', ...DOMAINS].map((domain) => {
            const isActive = selectedDomain === domain;
            const count = domainCounts[domain] || 0;
            return (
              <button
                key={domain}
                id={`filter-tab-${domain.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedDomain(domain)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-text-primary text-canvas-base shadow-sm font-semibold'
                    : 'bg-canvas-subtle text-text-secondary hover:text-text-primary hover:bg-surface-container border border-border-hairline'
                }`}
              >
                <span>{domain}</span>
                <span className={`font-code-sm text-[10px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Benchmark Live Stats Banner */}
      <section className="w-full bg-surface-container-low rounded-xl p-3.5 mb-6 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-border-hairline">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent-rose-soft flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-container" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-md text-title-md text-text-primary font-semibold truncate">
              Strict Zero-Reference Sandbox
            </span>
            <span className="font-body-sm text-[12px] text-text-muted truncate">
              Synthesis testing with automated runtime evidence logging
            </span>
          </div>
        </div>
        <span className="font-code-sm text-[11px] text-primary uppercase font-bold px-2 py-0.5 rounded bg-canvas-elevated border border-border-hairline shrink-0 ml-2">
          Level 4
        </span>
      </section>

      {/* Concept Cards Grid */}
      <div className="w-full">
        {filteredConcepts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="concepts-grid">
            {filteredConcepts.map((concept) => {
              const isChecked = selectedIds.has(concept.id);
              return (
                <article
                  key={concept.id}
                  id={`concept-card-${concept.id}`}
                  onClick={() => onSelectConcept(concept)}
                  className={`concept-card bg-canvas-elevated rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between gap-3 cursor-pointer group shadow-[0_1px_4px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] ${
                    isChecked
                      ? 'border-primary-container ring-1 ring-primary-container bg-primary-container/[0.02]'
                      : 'border-border-hairline hover:border-border-focus'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Badge row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded font-code-sm text-[10px] uppercase font-bold tracking-wider bg-[#eff4ff] text-[#2563eb] border border-[#dbeafe]">
                          {concept.domain}
                        </span>
                        {concept.sourceType === 'USER_GENERATED' && (
                          <span className="px-2 py-0.5 rounded font-code-sm text-[10px] uppercase font-bold tracking-wider bg-accent-rose-tint text-primary-container border border-accent-rose-soft">
                            BYO Material
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 font-label-sm text-[11px] text-[#b45309] font-medium shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                        <span className="font-semibold">{concept.approximateDifficulty || 'Applied'}</span>
                      </span>
                    </div>

                    {/* Title and description */}
                    <div className="flex flex-col gap-1">
                      <h2 className="font-headline-sm text-[17px] text-text-primary font-bold tracking-tight group-hover:text-primary transition-colors">
                        {concept.name}
                      </h2>
                      <p className="font-body-sm text-[12.5px] text-text-secondary leading-relaxed line-clamp-2">
                        {concept.description}
                      </p>
                    </div>

                    {/* Skill Tested callout */}
                    <div className="bg-canvas-subtle border border-border-hairline rounded-lg p-3 flex flex-col gap-1.5">
                      <span className="font-label-sm text-[10px] tracking-wider uppercase text-[#b45309] font-bold">
                        SKILL TESTED
                      </span>
                      <p className="font-body-sm text-[12px] text-text-primary italic leading-relaxed line-clamp-2">
                        "{concept.underlyingSkill}"
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Controls */}
                  <div className="pt-2.5 flex items-center justify-between border-t border-border-hairline mt-1">
                    <label
                      onClick={(e) => toggleSelect(concept.id, e)}
                      className="inline-flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-primary-container focus:ring-0 focus:outline-none cursor-pointer accent-primary-container"
                      />
                      <span className="font-label-sm text-[11px] text-text-muted group-hover:text-text-secondary transition-colors">
                        Select for preview
                      </span>
                    </label>
                    <span className="inline-flex items-center gap-1 font-label-md text-[12.5px] text-[#b45309] font-bold group-hover:underline">
                      <span>View Preview</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty Search Result State */
          <div
            id="empty-state"
            className="w-full flex flex-col items-center justify-center text-center py-16 px-4 bg-canvas-elevated rounded-xl border border-border-hairline"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-text-muted mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold mb-1">
              No verified concepts match
            </h3>
            <p className="font-body-sm text-body-sm text-text-muted max-w-xs mb-4">
              Try refining your keyword query or browse across all {allConcepts.length} calibration models.
            </p>
            <button
              id="reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedDomain('All');
              }}
              className="px-4 py-2 rounded-full bg-canvas-subtle text-text-primary font-label-md text-label-md hover:bg-surface-container border border-border-hairline transition-colors cursor-pointer"
            >
              Reset Active Filters
            </button>
          </div>
        )}
      </div>

      {/* Floating Batch Quick-Launch Bar for Selected Items */}
      {selectedIds.size > 0 && (
        <aside
          id="batch-bar"
          className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto z-40 bg-[#1E293B] text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-slate-700/60 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-white font-code-sm text-[11px] font-bold">
              {selectedIds.size}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-semibold truncate text-white">
                {selectedIds.size} {selectedIds.size === 1 ? 'Concept' : 'Concepts'} Selected
              </span>
              <span className="font-body-sm text-[11px] text-slate-300 truncate">
                Calibrate evaluation suite
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-full font-label-sm text-label-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={handleBatchStart}
              className="px-4 py-1.5 rounded-full bg-primary-container text-white font-label-sm text-label-sm font-semibold hover:bg-primary-container/90 transition-colors shrink-0 shadow cursor-pointer flex items-center gap-1"
            >
              <span>Start Probe</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};

