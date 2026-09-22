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
} from 'lucide-react';
import { View } from '../types.ts';
import { Card, StatusBadge } from './UIElements.tsx';

export interface NavItem {
  id: View;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const mainNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Beranda Studio',
    hint: 'Ringkasan & langkah berikutnya',
    icon: Compass,
  },
  {
    id: 'universe',
    label: 'Dunia Cerita',
    hint: 'Latar, tokoh, & arsip cerita',
    icon: BookOpen,
  },
  {
    id: 'production',
    label: 'Tulis Cerita',
    hint: 'Buat kisah baru atau naskah',
    icon: Sparkles,
  },
  {
    id: 'scheduler',
    label: 'Jadwal Terbit',
    hint: 'Rencana publikasi otomatis',
    icon: CalendarCheck,
  },
  {
    id: 'pages',
    label: 'Katalog Halaman',
    hint: 'Format bacaan & kronik',
    icon: FileText,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    id: 'history',
    label: 'Pustaka Naskah',
    hint: 'Arsip cerita yang telah dibuat',
    icon: Clock,
  },
  {
    id: 'ai',
    label: 'Asisten AI',
    hint: 'Koneksi model kecerdasan buatan',
    icon: Bot,
  },
  {
    id: 'system',
    label: 'Status Sistem',
    hint: 'Pemeriksaan keandalan & cadangan',
    icon: Sliders,
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  systemStatus,
  onOpenGuide,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  systemStatus: string;
  onOpenGuide: () => void;
}) {
  return (
    <aside
      id="main-sidebar"
      className="hidden w-72 shrink-0 border-r border-stone-800/80 bg-stone-950/90 lg:block"
    >
      <div className="sticky top-0 flex h-screen flex-col p-5">
        {/* Brand / Title */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-stone-100">
                Pocer Universe
              </div>
              <div className="text-[10px] font-medium text-amber-300/80">
                Studio Penulisan Cerita
              </div>
            </div>
          </div>
          <button
            id="open-guide-btn"
            type="button"
            onClick={onOpenGuide}
            title="Panduan Pemula"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-900 hover:text-amber-200"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Menu Penulisan
        </div>
        <nav className="space-y-1">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-amber-400/25 bg-amber-400/10 text-amber-200 shadow-sm'
                    : 'border-transparent text-stone-400 hover:border-stone-800 hover:bg-stone-900/80 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-stone-400'}`} />
                  <span className="text-xs font-semibold">{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-amber-300" />}
                </div>
                <div className="mt-1 pl-7 text-[10px] text-stone-500">{item.hint}</div>
              </button>
            );
          })}
        </nav>

        <div className="my-4 border-t border-stone-800/80" />

        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Pustaka & Pengaturan
        </div>
        <nav className="space-y-1">
          {secondaryNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-stone-700 bg-stone-900 text-stone-100 shadow-sm'
                    : 'border-transparent text-stone-400 hover:border-stone-800 hover:bg-stone-900/60 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {active && <ChevronRight className="ml-auto h-3 w-3" />}
                </div>
                <div className="mt-0.5 pl-6 text-[10px] text-stone-500">{item.hint}</div>
              </button>
            );
          })}
        </nav>

        {/* Footer info card */}
        <div className="mt-auto space-y-3 pt-4">
          <Card className="p-3.5 bg-stone-950/80 border-stone-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Kesiapan Studio</span>
              </div>
              <StatusBadge status={systemStatus} />
            </div>
            <div className="mt-2 text-[10px] leading-relaxed text-stone-400">
              Alur dan kebenaran cerita selalu dijaga agar tidak saling bertentangan.
            </div>
          </Card>
        </div>
      </div>
    </aside>
  );
}
