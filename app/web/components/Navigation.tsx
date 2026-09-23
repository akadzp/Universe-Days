import React from 'react';
import {
  BookOpen,
  Compass,
  Users,
  TestTube,
  Clock,
  Sliders,
  ChevronRight,
  HelpCircle,
  MoreHorizontal,
  X,
  FolderPlus
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
    label: 'Cerita',
    hint: 'Alur, naskah harian & meja baca',
    icon: BookOpen,
  },
  {
    id: 'universe',
    label: 'Dunia',
    hint: 'Wilayah, benda pusaka & misteri',
    icon: Compass,
  },
  {
    id: 'character',
    label: 'Tokoh',
    hint: 'Daftar & ruang profil tokoh',
    icon: Users,
  },
  {
    id: 'history',
    label: 'Arsip',
    hint: 'Pustaka naskah & riwayat',
    icon: Clock,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    id: 'sandbox',
    label: 'Sandbox',
    hint: 'Simulasi alur & mesin waktu',
    icon: TestTube,
    isSandboxFeature: true,
  },
  {
    id: 'studio',
    label: 'Studio',
    hint: 'Kesiapan sistem & model AI',
    icon: Sliders,
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  systemStatus,
  onOpenGuide,
  isSandbox,
  activeStoryTitle,
  currentDate,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  systemStatus: string;
  onOpenGuide: () => void;
  isSandbox: boolean;
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-[0_4px_12px_rgba(245,158,11,0.3),inset_0_2px_2px_rgba(255,255,255,0.6)] text-lg border border-amber-200">
                P
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 leading-tight">
                  POCER
                </h1>
                <p className="text-[11px] font-semibold text-slate-500">
                  Dunia Cerita & Penulisan
                </p>
              </div>
            </div>
          </div>

          {/* Active Story Card in Sidebar */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/90 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Cerita Aktif
              </span>
              <ModeBadge isSandbox={isSandbox} />
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {activeStoryTitle || 'Belum Ada Cerita Aktif'}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <span>📅 {currentDate || 'Belum tercatat'}</span>
              <span className="text-[10px] font-semibold text-slate-400">
                Pilih Cerita dari halaman Cerita
              </span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Groups */}
        <div className="space-y-4">
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigasi Utama
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
              Lainnya
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
                        ? item.isSandboxFeature
                          ? 'clay-nav-active-sandbox font-bold text-purple-950'
                          : 'clay-nav-active font-bold text-amber-950'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? item.isSandboxFeature
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
                          item.isSandboxFeature ? 'text-purple-600' : 'text-amber-600'
                        }`}
                      />
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
            <span>Panduan POCER</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
        </button>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="text-[11px] text-slate-500 font-medium">
            Kesiapan Sistem
          </div>
          <StatusBadge status={systemStatus} />
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomNav({
  currentView,
  onNavigate,
  onOpenMore,
  isSandbox,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  onOpenMore: () => void;
  isSandbox: boolean;
}) {
  const isMoreActive = currentView === 'sandbox' || currentView === 'studio';

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      {primaryNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition ${
              isActive
                ? isSandbox
                  ? 'text-purple-700 font-bold'
                  : 'text-amber-800 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                isActive
                  ? isSandbox
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-800'
                  : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        aria-label="Menu Lainnya"
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition ${
          isMoreActive
            ? 'text-purple-700 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div
          className={`p-1 rounded-lg ${
            isMoreActive ? 'bg-purple-100 text-purple-700' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Lainnya</span>
      </button>
    </nav>
  );
}

export function MobileMoreSheet({
  isOpen,
  onClose,
  onNavigate,
  onOpenGuide,
  systemStatus,
  isSandbox,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onOpenGuide: () => void;
  systemStatus: string;
  isSandbox: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              P
            </div>
            <h3 className="text-sm font-black text-slate-900">Menu Tambahan POCER</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Menu"
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onNavigate('sandbox');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <TestTube className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-950">Ruang Eksperimen (Sandbox)</div>
                <div className="text-[10px] text-purple-700">Simulasi alternatif & uji coba alur</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-purple-600" />
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigate('studio');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Pusat Operasional Studio</div>
                <div className="text-[10px] text-slate-500">Kesiapan sistem, model AI & token</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onOpenGuide();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-700" />
            <span>Panduan</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
          <span>Kesiapan Mesin:</span>
          <StatusBadge status={systemStatus} />
        </div>
      </div>
    </div>
  );
}
