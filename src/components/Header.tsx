import React from 'react';
import {
  LayoutDashboard,
  Users2,
  BookOpen,
  Lock,
  UserCircle,
  Clock,
  FastForward,
  RotateCcw,
  Search,
  RefreshCw,
  Globe2
} from 'lucide-react';
import type { AuthoritativeUniverse, DeploymentReadinessReport } from '../types';

export type NavTab = 'dashboard' | 'actor-actress' | 'cerita' | 'reserved' | 'profile';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  universe: AuthoritativeUniverse | null;
  readiness: DeploymentReadinessReport | null;
  mode: 'PRODUCTION' | 'SANDBOX';
  onAdvanceTime: () => void;
  onResetUniverse: () => void;
  onRefresh: () => void;
  onOpenSearch: () => void;
  loadingAction: string | null;
  characterCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  universe,
  mode,
  onAdvanceTime,
  onResetUniverse,
  onRefresh,
  onOpenSearch,
  loadingAction,
  characterCount = 0
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30 flex flex-col select-none">
      {/* Top Context & Actions Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-neutral-800/60">
        {/* Left: Universe Scope & Temporal Clock */}
        <div className="flex items-center space-x-5 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Globe2 className="w-4 h-4 text-indigo-400" />
            <span className="text-neutral-400 hidden sm:inline">SEMESTA:</span>
            <span className="font-semibold text-neutral-100 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60">
              {universe?.universeId ?? 'MEMUAT...'}
            </span>
          </div>

          <div className="h-3.5 w-px bg-neutral-800 hidden sm:block" />

          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-neutral-400 hidden sm:inline">WAKTU:</span>
            <span className="text-neutral-200 bg-amber-950/40 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded">
              {universe?.temporalContext?.currentUniverseDate ?? 'MEMUAT...'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded hidden md:inline">
              {universe?.temporalContext?.temporalStatus ?? 'AKTUAL'}
            </span>
          </div>
        </div>

        {/* Right: Search, Advance, Sync Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Global Search Button (Locator) */}
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-2 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/70 px-3 py-1.5 rounded-lg transition cursor-pointer"
            title="Cari entitas atau cerita (Locator)"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden md:inline">Cari...</span>
            <kbd className="hidden md:inline-block text-[10px] bg-neutral-700/60 text-neutral-300 px-1 rounded border border-neutral-600/60">
              Ctrl+K
            </kbd>
          </button>

          {/* Advance Time Action */}
          <button
            onClick={onAdvanceTime}
            disabled={loadingAction === 'advance'}
            className="flex items-center space-x-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
            title="Majukan Waktu Universe (+1 Hari)"
          >
            <FastForward className={`w-3.5 h-3.5 ${loadingAction === 'advance' ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">+1 Hari</span>
          </button>

          {/* Reset Universe */}
          <button
            onClick={onResetUniverse}
            disabled={loadingAction === 'reset'}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition cursor-pointer"
            title="Kembalikan Semesta ke Status Awal (Seed)"
          >
            <RotateCcw className={`w-4 h-4 ${loadingAction === 'reset' ? 'animate-spin' : ''}`} />
          </button>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={loadingAction === 'refresh'}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition cursor-pointer"
            title="Segarkan Data Semesta"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAction === 'refresh' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Navigation Bar (5 Canonical Slots per README Bagian 23 & 55) */}
      <nav className="px-6 flex items-center space-x-1 overflow-x-auto py-1">
        {/* Slot 1: Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
            activeTab === 'dashboard'
              ? 'bg-indigo-950/70 text-indigo-200 border-indigo-600/60 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-transparent'
          }`}
        >
          <LayoutDashboard className={`w-3.5 h-3.5 ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-neutral-400'}`} />
          <span>Dashboard</span>
          <span className="text-[10px] font-mono text-neutral-500">01</span>
        </button>

        {/* Slot 2: Actor & Actress */}
        <button
          onClick={() => onSelectTab('actor-actress')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
            activeTab === 'actor-actress'
              ? 'bg-indigo-950/70 text-indigo-200 border-indigo-600/60 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-transparent'
          }`}
        >
          <Users2 className={`w-3.5 h-3.5 ${activeTab === 'actor-actress' ? 'text-indigo-400' : 'text-neutral-400'}`} />
          <span>Actor & Actress</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
            {characterCount}
          </span>
        </button>

        {/* Slot 3: Cerita */}
        <button
          onClick={() => onSelectTab('cerita')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
            activeTab === 'cerita'
              ? 'bg-indigo-950/70 text-indigo-200 border-indigo-600/60 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-transparent'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'cerita' ? 'text-indigo-400' : 'text-neutral-400'}`} />
          <span>Cerita</span>
          <span className="text-[10px] font-mono text-neutral-500">03</span>
        </button>

        {/* Slot 4: [Reserved / Empty] (README Bagian 27) */}
        <button
          onClick={() => onSelectTab('reserved')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
            activeTab === 'reserved'
              ? 'bg-neutral-800/90 text-neutral-200 border-neutral-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800/30 border-transparent'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span className="italic">[Reserved / Empty]</span>
          <span className="text-[10px] font-mono text-neutral-600">04</span>
        </button>

        {/* Slot 5: Profil User (README Bagian 28) */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer border ${
            activeTab === 'profile'
              ? 'bg-indigo-950/70 text-indigo-200 border-indigo-600/60 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-transparent'
          }`}
        >
          <UserCircle className={`w-3.5 h-3.5 ${activeTab === 'profile' ? 'text-indigo-400' : 'text-neutral-400'}`} />
          <span>Profil User</span>
          <span className="text-[10px] font-mono text-neutral-500">05</span>
        </button>
      </nav>
    </header>
  );
};
