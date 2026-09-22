import React from 'react';
import {
  Sparkles,
  BookOpen,
  Compass,
  CalendarCheck,
  FileText,
  Clock,
  Bot,
  Sliders,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  TestTube,
  Flame,
  Layers,
} from 'lucide-react';
import { View } from '../types.ts';
import { Card, StatusBadge, ModeBadge } from './UIElements.tsx';

export interface NavItem {
  id: View;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  isSandboxFeature?: boolean;
}

export const mainNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Beranda Studio',
    hint: 'Ringkasan & karya terbaru',
    icon: Compass,
  },
  {
    id: 'universe',
    label: 'Ensiklopedia Dunia',
    hint: 'Tokoh, wilayah, & benda pusaka',
    icon: BookOpen,
  },
  {
    id: 'production',
    label: 'Tulis Naskah',
    hint: 'Tulis bab cerita & dialog',
    icon: Sparkles,
  },
  {
    id: 'pages',
    label: 'Produksi Halaman',
    hint: 'Katalog komik & kronik harian',
    icon: FileText,
  },
  {
    id: 'scheduler',
    label: 'Jadwal Terbit',
    hint: 'Penerbitan otomatis alur cerita',
    icon: CalendarCheck,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    id: 'sandbox',
    label: 'Laboratorium Sandbox',
    hint: 'Simulasi waktu & eksperimen tokoh',
    icon: TestTube,
    isSandboxFeature: true,
  },
  {
    id: 'history',
    label: 'Pustaka Naskah',
    hint: 'Arsip seluruh karya & bab',
    icon: Clock,
  },
  {
    id: 'ai',
    label: 'Asisten AI',
    hint: 'Koneksi model & imajinasi',
    icon: Bot,
  },
  {
    id: 'system',
    label: 'Keandalan & Cadangan',
    hint: 'Pencadangan & kesiapan studio',
    icon: ShieldCheck,
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  systemStatus,
  onOpenGuide,
  isSandbox,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  systemStatus: string;
  onOpenGuide: () => void;
  isSandbox: boolean;
}) {
  return (
    <aside
      id="main-sidebar"
      className="hidden w-72 shrink-0 border-r-2 border-white/80 bg-[#F4F7FB]/95 backdrop-blur-md lg:block shadow-[4px_0_20px_rgba(160,175,200,0.15)]"
    >
      <div className="sticky top-0 flex h-screen flex-col p-5 overflow-y-auto">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-900 border-2 border-white shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_2px_2px_rgba(255,255,255,0.8)]">
              <Sparkles className="h-6 w-6 fill-amber-100/50" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900">
                Pocer Universe
              </div>
              <div className="text-[11px] font-semibold text-amber-700">
                Studio Penulisan Cerita
              </div>
            </div>
          </div>
          <button
            id="open-guide-btn"
            type="button"
            onClick={onOpenGuide}
            title="Panduan Pemula"
            className="rounded-xl p-2 text-slate-400 bg-white border border-slate-200 shadow-sm transition hover:text-amber-600 hover:shadow"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Indicator in Sidebar */}
        <div className="mb-4">
          <ModeBadge isSandbox={isSandbox} />
        </div>

        {/* Primary Menu */}
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Menu Utama Cerita
        </div>
        <nav className="space-y-1.5">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full text-left transition-all duration-150 rounded-2xl p-2.5 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100/80 border-2 border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.2),inset_0_1px_2px_rgba(255,255,255,0.9)] text-slate-900 font-bold'
                    : 'bg-white/60 hover:bg-white border-2 border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-600 truncate font-normal">{item.hint}</div>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="my-4 border-t-2 border-slate-200/60" />

        {/* Creative Lab & Tools */}
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Eksperimen & Cadangan
        </div>
        <nav className="space-y-1.5">
          {secondaryNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            const isLab = item.id === 'sandbox';

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full text-left transition-all duration-150 rounded-2xl p-2.5 cursor-pointer ${
                  active
                    ? isLab
                      ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300 shadow-[0_4px_12px_rgba(99,102,241,0.2),inset_0_1px_2px_rgba(255,255,255,0.9)] text-indigo-950 font-bold'
                      : 'bg-gradient-to-r from-slate-100 to-white border-2 border-slate-300 shadow-[0_4px_10px_rgba(148,163,184,0.2),inset_0_1px_2px_rgba(255,255,255,0.9)] text-slate-900 font-bold'
                    : isLab
                    ? 'bg-indigo-50/50 hover:bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-200 text-indigo-900 shadow-sm'
                    : 'bg-white/60 hover:bg-white border-2 border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active
                        ? isLab
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-700 text-white shadow-sm'
                        : isLab
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {isLab && (
                        <span className="rounded-full bg-indigo-200 text-indigo-800 text-[9px] px-1.5 py-0.2 font-bold">
                          LAB
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate font-normal">{item.hint}</div>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info card */}
        <div className="mt-auto pt-4">
          <Card className="p-3.5 bg-white/90 border-2 border-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Kesiapan Studio</span>
              </div>
              <StatusBadge status={systemStatus} />
            </div>
            <div className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              Alur dan kebenaran cerita senantiasa dijaga konsisten.
            </div>
          </Card>
        </div>
      </div>
    </aside>
  );
}
