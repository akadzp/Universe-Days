import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Calendar,
  Compass,
  Play,
  TrendingUp,
  Clock,
  FileText,
  Copy,
  Check,
  Download,
  AlertCircle,
  Wand2,
  ChevronRight,
  Shield,
  Layers,
  Flame,
  Users
} from 'lucide-react';
import { Card, StatusBadge, Button, ModeBadge, InfoCallout } from '../components/UIElements.tsx';
import type {
  UniverseDetails,
  DailyContextData,
  DevelopmentData,
  TimelineData,
  ProductionRunRecord,
} from '../types.ts';

export function StoryView({
  universe,
  onOpenCreateStory,
  onProduceStory,
  fetchDailyContext,
  fetchDevelopment,
  fetchTimeline,
  latestRuns,
  isSandbox,
}: {
  universe: UniverseDetails | null;
  onOpenCreateStory: () => void;
  onProduceStory: (options?: any) => Promise<void>;
  fetchDailyContext: () => Promise<DailyContextData | null>;
  fetchDevelopment: () => Promise<DevelopmentData | null>;
  fetchTimeline: () => Promise<TimelineData | null>;
  latestRuns: ProductionRunRecord[];
  isSandbox: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'development' | 'timeline' | 'reader'>('overview');
  const [dailyContext, setDailyContext] = useState<DailyContextData | null>(null);
  const [development, setDevelopment] = useState<DevelopmentData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [selectedRun, setSelectedRun] = useState<ProductionRunRecord | null>(null);
  const [isProducing, setIsProducing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (universe?.mounted) {
      fetchDailyContext().then(setDailyContext);
      fetchDevelopment().then(setDevelopment);
      fetchTimeline().then(setTimeline);
    }
  }, [universe?.mounted, universe?.temporal?.currentUniverseDate, fetchDailyContext, fetchDevelopment, fetchTimeline]);

  useEffect(() => {
    if (latestRuns.length > 0 && !selectedRun) {
      setSelectedRun(latestRuns[0]);
    }
  }, [latestRuns, selectedRun]);

  const handleRunProduction = async () => {
    setIsProducing(true);
    try {
      await onProduceStory({ purpose: 'DAILY_STORY' });
      fetchDailyContext().then(setDailyContext);
      fetchDevelopment().then(setDevelopment);
      fetchTimeline().then(setTimeline);
    } finally {
      setIsProducing(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!universe || !universe.mounted) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto py-12 px-4">
        <Card className="p-8 text-center space-y-4 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 border border-amber-200 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-xs">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-black text-slate-900">Belum Ada Cerita Aktif</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Mulai sebuah dunia cerita untuk membangun tokoh, lokasi, benda pusaka, dan alur naskah harian.
            </p>
          </div>
          <div className="pt-3">
            <Button kind="clay" size="md" onClick={onOpenCreateStory}>
              <Sparkles className="h-4 w-4" />
              <span>Buat Cerita</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const meta = universe.storyMetadata || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Story Banner Header */}
      <Card className="p-6 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 border border-amber-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              {meta.genre && (
                <span className="px-3 py-1 rounded-xl bg-amber-200/80 text-amber-950 text-xs font-black uppercase tracking-wider">
                  {meta.genre}
                </span>
              )}
              <ModeBadge isSandbox={isSandbox} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {meta.title || 'Cerita Tanpa Judul'}
            </h2>
            <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-2xl">
              {meta.premise || meta.synopsis || 'Belum ada ringkasan premis yang dicatat.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              kind="clay"
              size="md"
              onClick={handleRunProduction}
              disabled={isProducing}
              className="flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className={`h-4 w-4 ${isProducing ? 'animate-spin' : ''}`} />
              <span>{isProducing ? 'Menulis Naskah...' : '⚡ Lanjutkan Kisah'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Ringkasan Cerita', icon: BookOpen },
          { id: 'daily', label: 'Lanjutkan Kisah', icon: Play },
          { id: 'development', label: 'Perkembangan Alur', icon: TrendingUp },
          { id: 'timeline', label: 'Garis Waktu Cerita', icon: Clock },
          { id: 'reader', label: `Meja Baca (${latestRuns.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-xs border border-amber-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                <span>Sinopsis & Premis Cerita</span>
              </h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-800 leading-relaxed font-medium">
                {meta.synopsis || meta.premise || 'Sinopsis dan premis cerita belum dicatat.'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Tema Utama
                  </span>
                  <p className="text-xs font-bold text-amber-950 mt-1">{meta.theme || 'Belum diisi'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ID Semesta
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1 font-mono">{universe.universeId || 'Belum tercatat'}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-600" />
                <span>Statistik Dunia Saat Ini</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{universe.characters.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tokoh</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{universe.locations.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Wilayah</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{universe.objects.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Benda Pusaka</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{universe.unresolvedConditions.length}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Misteri Terbuka</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5 space-y-4 bg-gradient-to-b from-amber-50/50 to-white border border-amber-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Waktu Cerita Berjalan
              </h4>
              <div className="p-3 bg-white rounded-2xl border border-amber-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Semesta</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {universe.temporal?.currentUniverseDate || 'Belum tercatat'}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-medium">Kalender:</span>
                  <span className="font-bold text-slate-800">{universe.temporal?.calendarSystem || 'GREGORIAN'}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 font-medium">Siklus Periode:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">{universe.temporal?.periodRef || 'Belum disetel'}</span>
                </div>
              </div>

              <Button
                kind="clay"
                size="md"
                onClick={handleRunProduction}
                disabled={isProducing}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold py-3 mt-2 shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isProducing ? 'Menulis Bab...' : 'Lanjutkan Kisah'}</span>
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Daily Story Engine */}
      {activeTab === 'daily' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-amber-600" />
                  <span>Konteks Hari Ini & Peluang Narasi</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Kondisi terkini semesta sebelum babak baru dituliskan.
                </p>
              </div>

              <Button
                kind="clay"
                size="md"
                onClick={handleRunProduction}
                disabled={isProducing}
                className="flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isProducing ? 'Menulis Naskah...' : '⚡ Lanjutkan Kisah Hari Ini'}</span>
              </Button>
            </div>

            {dailyContext ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kondisi Awal Hari
                  </span>
                  <div className="text-xs text-slate-800 font-medium space-y-1 mt-1">
                    {dailyContext.initialConditions.length > 0 ? (
                      dailyContext.initialConditions.map((cond, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{cond}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Belum ada kondisi khusus tercatat.</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Entitas Terlibat
                  </span>
                  <div className="space-y-1 mt-2 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between">
                      <span>Tokoh Aktif:</span>
                      <span className="text-slate-900">{dailyContext.activeCharactersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wilayah Terjangkau:</span>
                      <span className="text-slate-900">{dailyContext.activeLocationsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pusaka & Objek:</span>
                      <span className="text-slate-900">{dailyContext.activeObjectsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Peluang Alur
                  </span>
                  <div className="space-y-1 mt-1 text-xs text-amber-950 font-medium">
                    {dailyContext.availableDevelopments.length > 0 ? (
                      dailyContext.availableDevelopments.map((dev, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">→</span>
                          <span>{dev}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Alur berjalan mengikuti dinamika dunia.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Memuat konteks harian...
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Development */}
      {activeTab === 'development' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span>Perkembangan Dinamika Cerita</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Evolusi karakter, relasi antartokoh, dan kondisi dunia seiring berjalannya alur.
            </p>

            {development ? (
              <div className="space-y-4 pt-2">
                {development.characterDevelopments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Perubahan Tokoh
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {development.characterDevelopments.map((cd) => (
                        <div key={cd.characterId} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{cd.name}</span>
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">{cd.role || 'Belum ditentukan'}</span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            <strong className="text-slate-700">Tujuan: </strong>
                            {cd.currentGoal || 'Belum tercatat'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {development.relationshipDevelopments.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Dinamika Relasi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {development.relationshipDevelopments.map((rd) => (
                        <div key={rd.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{rd.pair}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{rd.status}</span>
                          </div>
                          <p className="text-slate-600 mt-1">{rd.dynamic || 'Dinamika belum tercatat.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada catatan perkembangan khusus.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Garis Waktu Kronologis Peristiwa</span>
            </h3>

            {timeline && timeline.items.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-amber-300 space-y-6 pt-2">
                {timeline.items.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {item.date}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Garis waktu akan tercatat saat alur cerita dijalankan.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Reader Room */}
      {activeTab === 'reader' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase">Daftar Bab Terbit</h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {latestRuns.map((r) => (
                <div
                  key={r.runId}
                  onClick={() => setSelectedRun(r)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedRun?.runId === r.runId
                      ? 'bg-amber-100/70 border-amber-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                      {r.purpose}
                    </h5>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                    <span>📅 {r.timestamp?.slice(0, 10) || 'Belum tercatat'}</span>
                    <span>{r.outputTokens || 0} Tok</span>
                  </div>
                </div>
              ))}

              {latestRuns.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  Belum ada naskah yang diterbitkan.
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            {selectedRun ? (
              <Card className="p-6 space-y-4 bg-white border border-slate-200 shadow-xs min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{selectedRun.purpose}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>Waktu: {selectedRun.timestamp}</span>
                      <span>•</span>
                      <span>Token: {selectedRun.outputTokens}</span>
                    </div>
                  </div>

                  <Button
                    kind="secondary"
                    size="sm"
                    onClick={() => handleCopyText(JSON.stringify(selectedRun.output, null, 2))}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Naskah'}</span>
                  </Button>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-serif text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[420px] overflow-y-auto">
                  {typeof selectedRun.output === 'string'
                    ? selectedRun.output
                    : JSON.stringify(selectedRun.output, null, 2)}
                </div>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                Pilih bab di sebelah kiri untuk membaca naskah.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
