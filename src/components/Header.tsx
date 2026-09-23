import React, { useState } from 'react';
import {
  Globe2,
  Clock,
  Search,
  Activity,
  RotateCcw,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
  Menu
} from 'lucide-react';
import type { UniverseData, ReadinessReport } from '../types.ts';

interface HeaderProps {
  universe: UniverseData | null;
  readiness: ReadinessReport | null;
  onAdvanceDay: () => Promise<void>;
  onResetSeed: () => Promise<void>;
  onSelectEntity: (nav: 'aktor' | 'dunia' | 'cerita', section: string, entityId?: string) => void;
  isActionPending: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  universe,
  readiness,
  onAdvanceDay,
  onResetSeed,
  onSelectEntity,
  isActionPending,
  isSidebarOpen,
  onToggleSidebar
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Search across characters, locations, objects, relationships, knowledge
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() || !universe) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ id: string; name: string; type: string; nav: 'aktor' | 'dunia' | 'cerita'; section: string }> = [];

    // Characters -> Aktor / Karakter
    Object.values(universe.characters || {}).forEach((c: any) => {
      const name = c.identity?.displayName || c.identity?.id || '';
      if (name.toLowerCase().includes(q) || c.identity?.id?.toLowerCase().includes(q)) {
        results.push({ id: c.identity.id, name, type: 'Karakter', nav: 'aktor', section: 'karakter' });
      }
    });

    // Locations -> Dunia / Tempat
    Object.values(universe.locations || {}).forEach((loc: any) => {
      const name = loc.identity?.displayName || loc.identity?.id || '';
      if (name.toLowerCase().includes(q) || loc.identity?.id?.toLowerCase().includes(q)) {
        results.push({ id: loc.identity.id, name, type: 'Tempat', nav: 'dunia', section: 'tempat' });
      }
    });

    // Objects -> Dunia / Benda
    Object.values(universe.objects || {}).forEach((obj: any) => {
      const name = obj.objectName || obj.identity?.displayName || '';
      if (name.toLowerCase().includes(q) || obj.identity?.id?.toLowerCase().includes(q)) {
        results.push({ id: obj.identity.id, name, type: 'Benda', nav: 'dunia', section: 'benda' });
      }
    });

    // Knowledge -> Dunia / Pengetahuan
    Object.values(universe.knowledge || {}).forEach((k: any) => {
      const stmt = k.statement || k.knowledgeId || '';
      if (stmt.toLowerCase().includes(q)) {
        results.push({ id: k.knowledgeId, name: stmt.slice(0, 45) + '...', type: 'Pengetahuan', nav: 'dunia', section: 'pengetahuan' });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, universe]);

  const readinessStatus = readiness?.status ?? 'UNKNOWN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
      {/* 1. Sidebar Control & Universe Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Sidebar Open/Close Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm ${
            isSidebarOpen
              ? 'bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700'
              : 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80'
          }`}
          title={isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar (Menu Utama Lainnya)'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <PanelLeft className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span className="hidden md:inline font-sans">
            {isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
          </span>
        </button>

        {/* Universe & Scope Badge */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 shadow-sm min-w-0">
          <Globe2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-neutral-200 tracking-wide truncate">
                {universe?.universeId || '-'}
              </span>
              {universe?.scope && (
                <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded px-1.5 py-0.2 hidden sm:inline">
                  {universe.scope}
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 font-mono hidden lg:inline">
              Phase 34 Production Core
            </span>
          </div>
        </div>

        {/* Temporal Clock */}
        {universe?.universeDate && (
          <div className="hidden sm:flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-neutral-200 font-mono">
                  {universe.universeDate}
                </span>
                <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded px-1.5">
                  ACTUAL
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {universe.universeTime ? universe.universeTime.slice(11, 19) + ' UTC' : '-'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Global Search (Locator Rule: does not mutate, directs to canonical home) */}
      <div className="relative flex-1 max-w-md mx-1 sm:mx-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari Aktor, Tempat, Benda, Pengetahuan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full bg-neutral-900/90 text-neutral-200 placeholder-neutral-500 text-xs rounded-lg pl-9 pr-3 py-2 border border-neutral-800 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
          />
        </div>

        {showSearchDropdown && searchResults.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg shadow-2xl py-1.5 z-50 overflow-hidden"
            onMouseLeave={() => setShowSearchDropdown(false)}
          >
            <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-neutral-400 border-b border-neutral-800">
              Locator Navigation (Directs to Canonical UI Home)
            </div>
            {searchResults.map((res) => (
              <button
                key={`${res.type}-${res.id}`}
                onClick={() => {
                  onSelectEntity(res.nav, res.section, res.id);
                  setShowSearchDropdown(false);
                  setSearchQuery('');
                }}
                className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center justify-between group transition-colors"
              >
                <div>
                  <div className="text-xs text-neutral-200 font-medium group-hover:text-indigo-300">
                    {res.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    ID: {res.id} • Tipe: {res.type}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 group-hover:text-indigo-400">
                  <span>Buka di {res.nav}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Global Actions & Readiness Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onAdvanceDay}
          disabled={isActionPending}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          title="Majukan waktu alam semesta ke siklus hari berikutnya"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>{isActionPending ? 'Memajukan...' : '+1 Hari'}</span>
        </button>

        <button
          onClick={onResetSeed}
          disabled={isActionPending}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg text-xs font-medium transition-colors"
          title="Reset universe ke generic seed authoritatif"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Seed</span>
        </button>

        {/* Subsystem Readiness Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium ${
            readinessStatus === 'READY'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : readinessStatus === 'DEGRADED'
              ? 'bg-amber-950/70 border-amber-800 text-amber-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{readinessStatus}</span>
        </div>
      </div>
    </header>
  );
}
