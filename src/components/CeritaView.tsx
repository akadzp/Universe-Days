import React, { useState } from 'react';
import type { CeritaSection, UniverseData, ProductionRunRecord } from '../types.ts';
import {
  BookOpen,
  Calendar,
  Sparkles,
  FileText,
  Lightbulb,
  History,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge } from './StatusBadges.tsx';

interface CeritaViewProps {
  section: CeritaSection;
  onSelectSection: (sec: CeritaSection) => void;
  universe: UniverseData | null;
  productionRuns: ProductionRunRecord[];
  onTriggerProduction: () => Promise<void>;
  isActionPending: boolean;
}

export function CeritaView({
  section,
  onSelectSection,
  universe,
  productionRuns,
  onTriggerProduction,
  isActionPending
}: CeritaViewProps) {
  const events = universe?.events || {};
  const eventList = Object.values(events);

  // Creative ideas state for 'ide' - starts empty without dummy data
  const [ideas, setIdeas] = useState<Array<{ id: string; title: string; desc: string; author: string }>>([]);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim()) return;
    setIdeas((prev) => [
      ...prev,
      {
        id: `IDEA_${Date.now()}`,
        title: newIdeaTitle.trim(),
        desc: newIdeaDesc.trim(),
        author: 'User Ideation'
      }
    ]);
    setNewIdeaTitle('');
    setNewIdeaDesc('');
  };

  const TABS: Array<{ id: CeritaSection; label: string; icon: any; count?: number }> = [
    { id: 'daily_story', label: 'Daily Story', icon: BookOpen },
    { id: 'hari_ini', label: 'Hari Ini', icon: Calendar },
    { id: 'daily_page', label: 'Daily Page', icon: FileText },
    { id: 'ide', label: 'Ide Kreatif', icon: Lightbulb, count: ideas.length },
    { id: 'riwayat', label: 'Riwayat Produksi', icon: History, count: productionRuns.length }
  ];

  const latestProduction = productionRuns[0] || null;

  const renderContent = () => {
    // 1. HARI INI CERITA
    if (section === 'hari_ini') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Konteks Cerita Hari Ini</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Cerita terikat pada tanggal alam semesta ({universe?.universeDate || '-'}) tanpa menggantikan fakta Canon Universe.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-200">
                    Daily Universe Cycle: {universe?.universeDate || '-'}
                  </span>
                  <TruthBadge level="PROJECTION" />
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Scope: {universe?.scope || 'DAILY_PRODUCTION'}
                </p>
              </div>

              <button
                onClick={onTriggerProduction}
                disabled={isActionPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan Produksi Harian</span>
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wide">
                Peristiwa Aktif pada Hari Ini (Canon Events)
              </h3>
              {eventList.length > 0 ? (
                <div className="space-y-2">
                  {eventList.map((evt: any) => (
                    <div key={evt.eventId} className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-200">{evt.title}</span>
                          <TruthBadge level="CANON" />
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-1">
                          ID: {evt.eventId} • Tipe: {evt.eventType} • Lokasi: {evt.locationRef}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {evt.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-neutral-950 rounded-lg text-xs text-neutral-500 font-mono">
                  Belum ada peristiwa tercatat pada hari ini.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. DAILY PAGE (Section 6.3 - Presentation/Narrative Projection)
    if (section === 'daily_page') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Page (Proyeksi Halaman)</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Aturan 22: Daily Page adalah presentation layer, bukan sumber kebenaran Canon. Perubahan pada halaman tidak boleh mengubah entitas Universe secara diam-diam.
            </p>
          </div>

          {latestProduction && latestProduction.renderResult?.renderedOutput ? (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 max-w-3xl space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">
                    Daily Page • Lembar Proyeksi Resmi
                  </span>
                  <TruthBadge level="PROJECTION" />
                </div>
                <h2 className="text-lg font-bold text-neutral-100 mt-2 font-mono">
                  {latestProduction.storyPackage?.storyId || 'HASIL_PRODUKSI'}
                </h2>
                <div className="text-xs font-mono text-neutral-400 mt-1">
                  Tanggal Semesta: {universe?.universeDate || '-'} • Renderer: {latestProduction.renderResult?.rendererId}
                </div>
              </div>

              <div className="prose prose-invert text-xs leading-relaxed space-y-3 text-neutral-300 font-sans">
                {latestProduction.renderResult.renderedOutput.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span>Run ID: {latestProduction.runId}</span>
                <span>Presentation Status: COMMITTED</span>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl p-8 text-center space-y-3 max-w-2xl">
              <FileText className="w-8 h-8 text-neutral-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-300">
                  Belum Ada Daily Page untuk Siklus Ini
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Daily Page dihasilkan secara deterministik melalui pipeline produksi cerita tanpa membuat data buatan secara sembarangan.
                </p>
              </div>
              <button
                onClick={onTriggerProduction}
                disabled={isActionPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isActionPending ? 'Memproses...' : 'Jalankan Produksi Harian'}</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    // 3. IDE (Creative Input Non-Canon per Section 6.4)
    if (section === 'ide') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Ide Cerita Kreatif</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Aturan 6.4: Digunakan untuk input kreatif yang belum menjadi Canon. Ide berstatus PROPOSAL dan tidak boleh dinaikkan menjadi Canon tanpa validasi resmi.
            </p>
          </div>

          {/* Add Idea form */}
          <form onSubmit={handleAddIdea} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3 max-w-xl">
            <h3 className="text-xs font-semibold text-neutral-200">Ajukan Ide Narasi Baru (Proposal)</h3>
            <input
              type="text"
              placeholder="Judul ide cerita..."
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              placeholder="Deskripsi ide dan arahan naratif..."
              rows={2}
              value={newIdeaDesc}
              onChange={(e) => setNewIdeaDesc(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Simpan Proposal Ide</span>
              </button>
            </div>
          </form>

          {/* Ideas List */}
          {ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ideas.map((item) => (
                <div key={item.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200">{item.title}</span>
                    <TruthBadge level="PROPOSAL" />
                  </div>
                  <p className="text-xs text-neutral-400">{item.desc}</p>
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Pengusul: {item.author}</span>
                    <span className="text-amber-400/80">Belum Disetujui (Non-Canon)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
              Belum ada proposal ide yang diajukan. Gunakan formulir di atas untuk mengusulkan ide narasi.
            </div>
          )}
        </div>
      );
    }

    // 4. RIWAYAT CERITA
    if (section === 'riwayat') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Riwayat Produksi Pipeline</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Arsip lengkap deterministic story production run dan audit traces dari DailyProductionPipeline.
            </p>
          </div>

          {productionRuns.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800">
              Belum ada eksekusi pipeline dalam sesi ini.
            </div>
          ) : (
            <div className="space-y-4">
              {productionRuns.map((run) => (
                <div key={run.runId} className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-300">{run.runId}</span>
                      <TruthBadge level="DERIVED" />
                    </div>
                    <span className="text-xs text-emerald-400 font-mono font-semibold">STATUS: {run.status}</span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-neutral-300 font-semibold">
                      Story ID: <span className="font-mono text-neutral-400">{run.storyPackage?.storyId || '-'}</span>
                    </div>
                    <div className="text-neutral-400">
                      Renderer: <span className="font-mono">{run.renderResult?.rendererId || '-'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono text-neutral-400 uppercase">Stages Passed:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {run.traces.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t.stage}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 5. DEFAULT: DAILY STORY (Section 6.2 - Lifecycle, Beats, Pipeline Run)
    const charactersList = Object.keys(universe?.characters || {});
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Story Lifecycle</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Menampilkan story yang terikat pada Daily Universe dan siklus produksi harian.
            </p>
          </div>

          <button
            onClick={onTriggerProduction}
            disabled={isActionPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isActionPending ? 'Memproses Pipeline...' : 'Trigger Daily Production Run'}</span>
          </button>
        </div>

        {/* Production Run Card */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-neutral-200">
                Paket Produksi Harian (Daily Story Package)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Lifecycle: READY_FOR_PRODUCTION
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 font-mono uppercase">Trigger ID</span>
              <div className="text-neutral-200 font-mono mt-0.5">
                {eventList[0]?.eventId || '(Tidak ada trigger aktif)'}
              </div>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 font-mono uppercase">Target Actors</span>
              <div className="text-neutral-200 font-mono mt-0.5 truncate">
                {charactersList.length > 0 ? charactersList.join(', ') : '(Belum ada aktor terdaftar)'}
              </div>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 font-mono uppercase">Narrative Flow</span>
              <div className="text-neutral-200 font-mono mt-0.5">Deterministic Beat Graph</div>
            </div>
          </div>

          {/* Pipeline Architecture Note */}
          <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
            <div className="font-semibold text-neutral-300 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Alur Produksi 7-Tahap:</span>
            </div>
            <div className="font-mono text-[10px] text-neutral-400">
              INPUT → INITIALIZATION → PROGRESSION → STORY → RENDER → FINALIZATION → PERSISTENCE
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Submenu Tabs di dalam Cerita */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSection(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-950 text-indigo-300' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {renderContent()}
    </div>
  );
}
