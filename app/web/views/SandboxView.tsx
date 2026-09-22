import React, { useState } from 'react';
import {
  TestTube,
  Clock,
  Sparkles,
  Users,
  MapPin,
  Plus,
  RefreshCw,
  Copy,
  Calendar,
  FastForward,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';
import { ControlOverview, ProductionRunRecord } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge, InfoCallout } from '../components/UIElements.tsx';
import { formatFriendlyDate, formatFriendlyTime } from '../translations.ts';

export function SandboxView({
  overview,
  runs,
  onRunProduction,
  onAdvanceDay,
  onCloneToSandbox,
  onAddCharacter,
  onAddLocation,
  onAddObject,
  onLoadCurrentUniverse,
  busy,
}: {
  overview: ControlOverview;
  runs: ProductionRunRecord[];
  onRunProduction: (kind: 'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION', instruction: string) => Promise<void>;
  onAdvanceDay: (days: number) => Promise<void>;
  onCloneToSandbox: () => Promise<void>;
  onAddCharacter: (data: { displayName: string; role: string; background: string; traits: string[] }) => Promise<void>;
  onAddLocation: (data: { displayName: string; locationType: string; accessibilityStatus: string }) => Promise<void>;
  onAddObject: (data: { displayName: string; objectType: string; condition: string }) => Promise<void>;
  onLoadCurrentUniverse: () => Promise<void>;
  busy: boolean;
}) {
  const isMounted = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const isSandbox = overview.universe.universeScope === 'SANDBOX';

  // State for forms
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('Pahlawan Petualang');
  const [newCharBackground, setNewCharBackground] = useState('');
  const [newCharTraits, setNewCharTraits] = useState('Pemberani, Setia, Cerdas');

  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState('SETTLEMENT');

  const [newObjName, setNewObjName] = useState('');
  const [newObjType, setNewObjType] = useState('ARTIFACT');

  const [experimentPrompt, setExperimentPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('Fantasi Epik');

  const handleAddChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    await onAddCharacter({
      displayName: newCharName.trim(),
      role: newCharRole.trim(),
      background: newCharBackground.trim(),
      traits: newCharTraits.split(',').map(s => s.trim()).filter(Boolean),
    });
    setNewCharName('');
    setNewCharBackground('');
  };

  const handleAddLoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    await onAddLocation({
      displayName: newLocName.trim(),
      locationType: newLocType,
      accessibilityStatus: 'OPEN',
    });
    setNewLocName('');
  };

  const handleAddObj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjName.trim()) return;
    await onAddObject({
      displayName: newObjName.trim(),
      objectType: newObjType,
      condition: 'PRISTINE',
    });
    setNewObjName('');
  };

  const handleRunExperiment = () => {
    const fullInstruction = `[Gaya: ${selectedTone}] ${experimentPrompt || 'Eksplorasi adegan tak terduga dalam dunia cerita.'}`;
    void onRunProduction('GENERAL_PRODUCTION', fullInstruction);
  };

  return (
    <div id="view-sandbox" className="space-y-6">
      {/* Sandbox Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <TestTube className="h-6 w-6 text-indigo-600" />
            <span>Laboratorium Eksperimen Cerita (Sandbox)</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Uji ide cerita baru, lakukan simulasi waktu ke hari esok, dan coba karakter hipotetis tanpa mengubah arsip resmi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={true} />
        </div>
      </div>

      {/* Mode Difference Explanatory Banner */}
      <Card variant="sandbox" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Perbedaan Mode Sandbox vs Mode Produksi</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Mode Produksi (Kanun)</strong> adalah catatan resmi cerita yang tidak boleh diubah sembarangan. Sedangkan di <strong>Mode Sandbox</strong>, Anda bebas memajukan tanggal, menambah tokoh uji coba, dan menguji gaya naskah sebelum diterapkan secara resmi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              kind="indigo"
              size="sm"
              onClick={() => void onCloneToSandbox()}
              disabled={busy}
            >
              <Copy className="h-3.5 w-3.5" />
              Kloning Kanun ke Sandbox
            </Button>
            <Button
              kind="secondary"
              size="sm"
              onClick={() => void onLoadCurrentUniverse()}
              disabled={busy}
            >
              Kembali ke Arsip Kanun
            </Button>
          </div>
        </div>
      </Card>

      {/* Section 1: Time Machine & Temporal Simulator */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Simulasi Garis Waktu Cerita (Time Machine)</h3>
              <p className="text-xs text-slate-600">
                Majukan kalender alur cerita untuk melihat bagaimana peristiwa berkembang pada hari berikutnya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-950">{formatFriendlyDate(universeDate)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          <Button
            kind="indigo"
            size="md"
            onClick={() => void onAdvanceDay(1)}
            disabled={busy || !isMounted}
            className="w-full"
          >
            <FastForward className="h-4 w-4" />
            Maju +1 Hari (Hari Esok)
          </Button>

          <Button
            kind="secondary"
            size="md"
            onClick={() => void onAdvanceDay(3)}
            disabled={busy || !isMounted}
            className="w-full"
          >
            <FastForward className="h-4 w-4" />
            Lompat +3 Hari
          </Button>

          <Button
            kind="secondary"
            size="md"
            onClick={() => void onAdvanceDay(7)}
            disabled={busy || !isMounted}
            className="w-full"
          >
            <FastForward className="h-4 w-4" />
            Lompat +1 Pekan (7 Hari)
          </Button>
        </div>
      </Card>

      {/* Section 2: Character & Entity Playground */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Tambah Tokoh */}
        <Card className="p-5 flex flex-col justify-between">
          <form onSubmit={handleAddChar} className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <Users className="h-4 w-4 text-amber-500" />
              <span>Tambah Tokoh Eksperimen</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Karakter</label>
              <input
                type="text"
                value={newCharName}
                onChange={e => setNewCharName(e.target.value)}
                placeholder="Contoh: Ksatria Vaelen"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Peran / Arketipe</label>
              <input
                type="text"
                value={newCharRole}
                onChange={e => setNewCharRole(e.target.value)}
                placeholder="Contoh: Pengembara Misterius"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sifat & Kepribadian</label>
              <input
                type="text"
                value={newCharTraits}
                onChange={e => setNewCharTraits(e.target.value)}
                placeholder="Pisahkan dengan koma"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Latar Belakang Singkat</label>
              <textarea
                value={newCharBackground}
                onChange={e => setNewCharBackground(e.target.value)}
                placeholder="Asal-usul atau rahasia karakter..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <Button kind="indigo" size="sm" disabled={busy || !isMounted || !newCharName.trim()} className="w-full">
              <Plus className="h-3.5 w-3.5" />
              Daftarkan ke Sandbox
            </Button>
          </form>
        </Card>

        {/* Form Tambah Lokasi */}
        <Card className="p-5 flex flex-col justify-between">
          <form onSubmit={handleAddLoc} className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span>Tambah Wilayah Eksperimen</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Tempat / Lokasi</label>
              <input
                type="text"
                value={newLocName}
                onChange={e => setNewLocName(e.target.value)}
                placeholder="Contoh: Benteng Kabut Abadi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipe Wilayah</label>
              <select
                value={newLocType}
                onChange={e => setNewLocType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="SETTLEMENT">Kota / Pemukiman</option>
                <option value="STRUCTURE">Kuil / Benteng / Kastil</option>
                <option value="INTERIOR_SPACE">Ruang Rahasia / Aula</option>
                <option value="TERRAIN">Hutan / Lembah / Pegunungan</option>
              </select>
            </div>

            <div className="pt-8">
              <Button kind="emerald" size="sm" disabled={busy || !isMounted || !newLocName.trim()} className="w-full">
                <Plus className="h-3.5 w-3.5" />
                Tambah Lokasi
              </Button>
            </div>
          </form>
        </Card>

        {/* Form Tambah Pusaka */}
        <Card className="p-5 flex flex-col justify-between">
          <form onSubmit={handleAddObj} className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>Tambah Benda Pusaka</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Benda / Senjata</label>
              <input
                type="text"
                value={newObjName}
                onChange={e => setNewObjName(e.target.value)}
                placeholder="Contoh: Cincin Bintang Kejora"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori Benda</label>
              <select
                value={newObjType}
                onChange={e => setNewObjType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="ARTIFACT">Pusaka Keramat</option>
                <option value="WEAPON">Senjata Pusaka</option>
                <option value="DOCUMENT">Kitab / Naskah Kuno</option>
                <option value="TECHNOLOGY">Perangkat Magis</option>
              </select>
            </div>

            <div className="pt-8">
              <Button kind="indigo" size="sm" disabled={busy || !isMounted || !newObjName.trim()} className="w-full">
                <Plus className="h-3.5 w-3.5" />
                Tambah Benda
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Section 3: AI Prompt & Tone Workshop */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bengkel Eksperimen Gaya Narasi AI</h3>
              <p className="text-xs text-slate-600">
                Uji coba berbagai genre cerita dan instruksi naskah dengan imajinasi bebas.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Pilih Nuansa / Genre Cerita:</label>
            <div className="flex flex-wrap gap-2">
              {['Fantasi Epik', 'Misteri & Detektif', 'Manga Aksi & Shonen', 'Drama Psikologis', 'Komedi & Satir'].map(tone => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTone === tone
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Instruksi Eksperimen Naskah:</label>
            <textarea
              value={experimentPrompt}
              onChange={e => setExperimentPrompt(e.target.value)}
              placeholder="Contoh: Buat dialog dramatis saat dua tokoh saling berhadapan di tengah badai salju..."
              rows={3}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex justify-end">
            <Button
              kind="indigo"
              size="md"
              onClick={handleRunExperiment}
              disabled={busy || !isMounted}
            >
              <Send className="h-4 w-4" />
              Jalankan Naskah Eksperimen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
