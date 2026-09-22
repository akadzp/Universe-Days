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
      // refresh contexts
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
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-8">
        <Card className="p-8 text-center space-y-4 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 border-2 border-amber-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-md">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-black text-slate-900">Belum Ada Cerita Aktif</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Buka kisah baru untuk mulai menjelajah alur cerita, mengelola karakter, dan menerbitkan naskah harian.
            </p>
          </div>
          <div className="pt-2">
            <Button kind="clay" size="lg" onClick={onOpenCreateStory}>
              <Sparkles className="h-5 w-5" />
              <span>+ Buat Kisah Cerita Baru</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const meta = universe.storyMetadata || {
    title: 'Kisah Semesta Pocer',
    premise: 'Petualangan luar biasa di dunia yang sarat intrik dan pusaka kuno.',
    synopsis: 'Para tokoh berjuang membimbing takdir wilayah menuju kedamaian sejati.',
    genre: 'Fantasi / Petualangan',
    theme: 'Keberanian & Penemuan Kebenaran',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Story Banner Header */}
      <Card className="p-6 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 border-2 border-amber-200 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-amber-200/80 text-amber-950 text-xs font-black uppercase tracking-wider">
                {meta.genre || 'Fantasi / Petualangan'}
              </span>
              <ModeBadge isSandbox={isSandbox} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {meta.title}
            </h2>
            <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-2xl">
              {meta.premise}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              kind="clay"
              size="md"
              onClick={handleRunProduction}
              disabled={isProducing}
              className="flex items-center justify-center gap-2 shadow-md"
            >
              <Sparkles className={`h-4 w-4 ${isProducing ? 'animate-spin' : ''}`} />
              <span>{isProducing ? 'Menulis Naskah...' : '⚡ Jalankan Hari & Tulis Naskah'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Ringkasan Cerita', icon: BookOpen },
          { id: 'daily', label: 'Lanjutkan Kisah (Harian)', icon: Play },
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
                  ? 'bg-amber-400 text-slate-950 shadow-sm border border-amber-300'
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
                {meta.synopsis || meta.premise}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Tema Utama
                  </span>
                  <p className="text-xs font-bold text-amber-950 mt-1">{meta.theme || 'Perjuangan & Takdir'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ID Semesta
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1 font-mono">{universe.universeId}</p>
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
            <Card className="p-5 space-y-4 bg-gradient-to-b from-amber-50/50 to-white border-2 border-amber-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Waktu Cerita Berjalan
              </h4>
              <div className="p-3 bg-white rounded-2xl border border-amber-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Semesta</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {universe.temporal?.currentUniverseDate || '2024-01-01'}
                </p>
                <p className="text-[11px] font-bold text-amber-800 mt-1">
                  Periode: {universe.temporal?.periodRef || 'PERIOD_001'}
                </p>
              </div>

              <Button
                kind="clay"
                size="md"
                onClick={handleRunProduction}
                disabled={isProducing}
                className="w-full"
              >
                <Play className="h-4 w-4" />
                <span>{isProducing ? 'Menulis Naskah...' : 'Lanjutkan Hari Ini'}</span>
              </Button>
            </Card>

            <InfoCallout title="Prinsip Kedaulatan Cerita" tone="amber">
              Dunia cerita dikelola secara kanonik. AI bertindak sebagai asisten penulis naskah, sementara seluruh fakta tokoh, relasi, dan benda tetap patuh pada hukum kebenaran semesta.
            </InfoCallout>
          </div>
        </div>
      )}

      {/* Tab: Daily Continuation */}
      {activeTab === 'daily' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Persiapan Cerita Hari Ini ({universe.temporal?.currentUniverseDate})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Kondisi awal semesta sebelum babak peristiwa hari ini digulirkan.
                </p>
              </div>

              <Button
                kind="clay"
                size="md"
                onClick={handleRunProduction}
                disabled={isProducing}
              >
                <Sparkles className="h-4 w-4" />
                <span>{isProducing ? 'Menjalankan...' : 'Jalankan & Tulis Bab Hari Ini'}</span>
              </Button>
            </div>

            {/* Initial Conditions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Kondisi Awal yang Terdata
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dailyContext?.initialConditions.map((cond, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{cond}</span>
                  </div>
                )) || (
                  <div className="text-xs text-slate-400 p-4">Memuat kondisi harian...</div>
                )}
              </div>
            </div>

            {/* Narrative Hooks */}
            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-amber-600" />
                <span>Peluang Alur & Rekomendasi Narasi</span>
              </h4>
              <div className="space-y-2">
                {dailyContext?.availableDevelopments.map((dev, idx) => (
                  <div key={idx} className="p-2.5 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{dev}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Development */}
      {activeTab === 'development' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                <span>Perkembangan Tokoh</span>
              </h3>
              <div className="space-y-3">
                {development?.characterDevelopments.map((cd) => (
                  <div key={cd.characterId} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{cd.name}</span>
                      <span className="text-[10px] font-bold text-amber-800 px-2 py-0.5 bg-amber-100 rounded-lg">{cd.role}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">Tujuan Aktif: {cd.currentGoal}</p>
                  </div>
                )) || <div className="text-xs text-slate-400">Belum ada catatan tokoh.</div>}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-600" />
                <span>Dinamika Hubungan & Misteri</span>
              </h3>
              <div className="space-y-3">
                {development?.relationshipDevelopments.map((rd) => (
                  <div key={rd.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{rd.pair}</span>
                      <span className="text-amber-800 text-[10px] font-bold">{rd.status}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{rd.dynamic}</p>
                  </div>
                ))}

                {development?.mysteryDevelopments.map((md) => (
                  <div key={md.id} className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-rose-900">
                      <span>{md.type}</span>
                      <span className="text-[10px] font-bold text-rose-700">{md.status}</span>
                    </div>
                    <p className="text-rose-800 text-[11px]">{md.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <Card className="p-6 space-y-6 animate-fade-in">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <span>Garis Waktu Perjalanan Kisah</span>
          </h3>
          <div className="space-y-6 relative pl-6 border-l-2 border-amber-300">
            {timeline?.items.map((item, idx) => (
              <div key={idx} className="relative space-y-1.5">
                <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase">
                    {item.date}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{item.title}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  {item.description}
                </p>
              </div>
            )) || <div className="text-xs text-slate-400">Memuat garis waktu...</div>}
          </div>
        </Card>
      )}

      {/* Tab: Reader (Meja Baca) */}
      {activeTab === 'reader' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Chapter / Run Selector */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daftar Naskah & Bab
            </h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {latestRuns.map((r) => (
                <div
                  key={r.runId}
                  onClick={() => setSelectedRun(r)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedRun?.runId === r.runId
                      ? 'bg-amber-100/70 border-amber-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="truncate">{r.purpose}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>{r.timestamp?.slice(0, 10) || '2024-01-01'}</span>
                    <span>{r.outputTokens || 0} Kata / Token</span>
                  </div>
                </div>
              ))}
              {latestRuns.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                  Belum ada naskah yang diterbitkan. Klik 'Jalankan Hari & Tulis Naskah' untuk menerbitkan bab pertama!
                </div>
              )}
            </div>
          </div>

          {/* Reader Body */}
          <div className="md:col-span-2">
            <Card className="p-8 space-y-6 bg-amber-50/20 border-2 border-amber-200 shadow-sm min-h-[500px]">
              {selectedRun ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-amber-200/80">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        {selectedRun.purpose}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Diterbitkan pada {selectedRun.timestamp} • Status: {selectedRun.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        kind="secondary"
                        size="sm"
                        onClick={() => handleCopyText(typeof selectedRun.output === 'string' ? selectedRun.output : JSON.stringify(selectedRun.output, null, 2))}
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        <span>{copied ? 'Tersalin' : 'Salin Naskah'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Story Text with Elegant Typography */}
                  <div className="prose prose-slate max-w-none text-sm text-slate-800 font-serif leading-relaxed whitespace-pre-wrap">
                    {typeof selectedRun.output === 'string'
                      ? selectedRun.output
                      : typeof selectedRun.output?.storyContent === 'string'
                        ? selectedRun.output.storyContent
                        : JSON.stringify(selectedRun.output || selectedRun.reason || 'Naskah berhasil diproduksi.', null, 2)}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Pilih bab naskah di sebelah kiri untuk mulai membaca.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
