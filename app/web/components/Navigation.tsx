import React from 'react';
import {
  BookOpen,
  Compass,
  Users,
  TestTube,
  Clock,
  Sliders,
  Sparkles,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  FolderPlus,
  Play,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { View } from '../types.ts';
import { Card, StatusBadge, ModeBadge, Button } from './UIElements.tsx';

export interface NavItem {
  id: View;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  isSandboxFeature?: boolean;
}

export const primaryNavItems: NavItem[] = [
  {
    id: 'story',
    label: 'Kisah Cerita',
    hint: 'Alur, naskah harian & meja baca',
    icon: BookOpen,
  },
  {
    id: 'universe',
    label: 'Ensiklopedia Dunia',
    hint: 'Tokoh, wilayah, benda & misteri',
    icon: Compass,
  },
  {
    id: 'character',
    label: 'Ruang Tokoh',
    hint: '9 Tab holistik profil karakter',
    icon: Users,
  },
  {
    id: 'sandbox',
    label: 'Ruang Eksperimen',
    hint: 'Mesin waktu & simulasi ide',
    icon: TestTube,
    isSandboxFeature: true,
  },
  {
    id: 'history',
    label: 'Pustaka & Arsip',
    hint: 'Hasil terbit & kronik perjalanan',
    icon: Clock,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    id: 'studio',
    label: 'Pusat Operasional',
    hint: 'Kesiapan sistem, AI, & penjadwal',
    icon: Sliders,
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  systemStatus,
  onOpenGuide,
  isSandbox,
  onOpenCreateStory,
  activeStoryTitle,
  currentDate,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  systemStatus: string;
  onOpenGuide: () => void;
  isSandbox: boolean;
  onOpenCreateStory: () => void;
  activeStoryTitle?: string;
  currentDate?: string;
}) {
  return (
    <aside className="w-72 shrink-0 flex flex-col justify-between border-r border-slate-200/80 bg-slate-50/70 p-4 min-h-screen">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-[0_6px_14px_rgba(245,158,11,0.35),inset_0_2px_2px_rgba(255,255,255,0.6)] text-xl border-2 border-amber-200">
                P
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 leading-tight">
                  POCER STUDIO
                </h1>
                <p className="text-[11px] font-semibold text-slate-500">
                  Dunia Cerita & Penulisan
                </p>
              </div>
            </div>
          </div>

          {/* Active Story Card in Sidebar */}
          <div className="mt-4 p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Cerita Aktif
            </div>
            <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
              {activeStoryTitle || 'Belum Membuka Cerita'}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
              <span>📅 {currentDate || '2024-01-01'}</span>
              <ModeBadge isSandbox={isSandbox} />
            </div>
          </div>

          {/* Create Story Button */}
          <div className="mt-3">
            <Button
              kind="clay"
              size="sm"
              onClick={onOpenCreateStory}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Buat Cerita Baru</span>
            </Button>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-4">
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Perjalanan Cerita
            </div>
            <nav className="space-y-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left text-xs transition-all duration-150 group ${
                      isActive
                        ? isSandbox
                          ? 'clay-nav-active-sandbox font-bold text-purple-950'
                          : 'clay-nav-active font-bold text-amber-950'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? isSandbox
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-200/70 text-slate-600 group-hover:bg-slate-300/70 group-hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-slate-500 line-clamp-1">
                          {item.hint}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isSandbox ? 'text-purple-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operasional & Sistem
            </div>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left text-xs transition-all duration-150 group ${
                      isActive
                        ? 'clay-nav-active font-bold text-amber-950'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-200/70 text-slate-600 group-hover:bg-slate-300/70 group-hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-slate-500 line-clamp-1">
                          {item.hint}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer System Status & Guide */}
      <div className="pt-4 border-t border-slate-200/80 space-y-2">
        <button
          type="button"
          onClick={onOpenGuide}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/80 text-amber-900 text-xs font-semibold transition"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <span>Panduan Blueprint POCER</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
        </button>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="text-[11px] text-slate-500 font-medium">
            Kesiapan Mesin
          </div>
          <StatusBadge status={systemStatus} />
        </div>
      </div>
    </aside>
  );
}
