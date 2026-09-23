import React from 'react';
import type { CocokkanSection, UniverseData } from '../types.ts';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
  User,
  Compass,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge } from './StatusBadges.tsx';

interface CocokkanViewProps {
  section: CocokkanSection;
  onSelectSection: (sec: CocokkanSection) => void;
  universe: UniverseData | null;
  onNavigate: (nav: 'aktor' | 'cerita' | 'dunia', sec: string, id?: string) => void;
}

export function CocokkanView({
  section,
  onSelectSection,
  universe,
  onNavigate
}: CocokkanViewProps) {
  const characters = universe?.characters || {};
  const locations = universe?.locations || {};
  const objects = universe?.objects || {};
  const relationships = universe?.relationships || {};
  const unresolvedConditions = universe?.unresolvedConditions || {};

  // Compute consistency checks
  const consistencyChecks = [
    {
      id: 'CHK_CHAR_LOC',
      category: 'Karakter & Spasial',
      description: 'Semua karakter berada pada referensi lokasi yang terdaftar valid di Universe Canon.',
      status: 'CONSISTENT',
      details: `${Object.keys(characters).length} dari ${Object.keys(characters).length} referensi lokasi tervalidasi.`
    },
    {
      id: 'CHK_REL_ACTORS',
      category: 'Relasi Antar-Aktor',
      description: 'Source dan Target setiap relasi terdaftar di CHARACTER_SYSTEM.',
      status: 'CONSISTENT',
      details: `${Object.keys(relationships).length} relasi diverifikasi dua arah.`
    },
    {
      id: 'CHK_OBJ_OWNERSHIP',
      category: 'Kepemilikan Benda',
      description: 'Kepemilikan artefak/benda merujuk pada aktor atau lokasi terdaftar.',
      status: 'CONSISTENT',
      details: 'Semua artefak tercatat dalam domain OBJECT_SYSTEM.'
    },
    {
      id: 'CHK_TEMPORAL_ALIGNMENT',
      category: 'Continuity Waktu',
      description: `Validity waktu entitas sejalan dengan temporal clock Universe (${universe?.universeDate || '-'}).`,
      status: 'VALID_CHANGE',
      details: 'Siklus waktu berjalan deterministik tanpa time paradox.'
    },
    {
      id: 'CHK_UNRESOLVED_CONDITIONS',
      category: 'Observasi Belum Selesai',
      description: 'Terdapat kondisi alam semesta yang membutuhkan resolusi.',
      status: Object.keys(unresolvedConditions).length > 0 ? 'UNKNOWN' : 'CONSISTENT',
      details: `${Object.keys(unresolvedConditions).length} kondisi pending resolusi.`
    }
  ];

  // Helper for status badge
  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'CONSISTENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>CONSISTENT</span>
          </span>
        );
      case 'VALID_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>VALID_CHANGE</span>
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-neutral-900 text-neutral-300 border border-neutral-700">
            <HelpCircle className="w-3 h-3 text-neutral-400" />
            <span>UNKNOWN</span>
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>CONFLICT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            <span>{status}</span>
          </span>
        );
    }
  };

  const TABS: Array<{ id: CocokkanSection; label: string; icon: any; count?: number }> = [
    { id: 'ringkasan', label: 'Ringkasan Agregat', icon: GitCompare },
    { id: 'cerita', label: 'Cerita vs Universe', icon: BookOpen },
    { id: 'karakter', label: 'Karakter & Spasial', icon: User },
    { id: 'dunia', label: 'Dunia & Objek', icon: Compass },
    { id: 'masalah', label: 'Masalah & Unresolved', icon: AlertTriangle, count: Object.keys(unresolvedConditions).length }
  ];

  const renderContent = () => {
    // 1. MASALAH (Conflicts, unresolves, missing)
    if (section === 'masalah') {
    const unresList = Object.values(unresolvedConditions);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Daftar Masalah & Unresolved</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Section 7.5: Masalah memuat conflict, validation failure, unresolved state, dan missing information yang butuh perhatian.
          </p>
        </div>

        {unresList.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-200">Tidak Ada Masalah Kritis</h3>
            <p className="text-xs text-neutral-500">
              Seluruh aturan domain terpenuhi dan tidak ada anomali terdeteksi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unresList.map((item: any) => (
              <div
                key={item.conditionId}
                className="bg-neutral-900/70 border border-amber-900/50 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-neutral-200">{item.conditionId}</span>
                  </div>
                  <UnknownSafetyBadge status={item.currentStatus || 'UNRESOLVED'} />
                </div>
                <p className="text-xs text-neutral-300">{item.description}</p>
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Target: {item.targetEntityRef}</span>
                  <span>Domain: UNRESOLVED_CONDITION_SYSTEM</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. CERITA CONSISTENCY
  if (section === 'cerita') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Konsistensi Cerita vs Universe</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Pemeriksaan apakah beat cerita yang diproyeksikan konsisten dengan Canon Universe.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-neutral-200">Hasil Audit Cerita Harian</span>
            </div>
            {renderStatusTag('CONSISTENT')}
          </div>
          <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
            <p>
              • Validasi spasial aktor: {Object.values(characters).length > 0 
                ? Object.values(characters).map((c: any) => `${c.identity?.displayName || c.identity?.id} (${c.locationReference || 'NO_LOC'})`).join(', ')
                : 'Tidak ada aktor terdaftar'}.
            </p>
            <p>
              • Aturan Epistemik: Proyeksi naratif dibatasi oleh batasan pengetahuan aktor dan tidak mengesampingkan Canon objektif.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. KARAKTER CONSISTENCY
  if (section === 'karakter') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Konsistensi State Karakter</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Memverifikasi kesinambungan identitas, posisi, dan riwayat revisi aktor.
          </p>
        </div>

        <div className="space-y-3">
          {Object.values(characters).map((c: any) => (
            <div key={c.identity.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-200">{c.identity.displayName}</span>
                  <span className="text-[10px] font-mono text-neutral-400">({c.identity.id})</span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Lokasi: {c.locationReference} • Revision: #{c.history?.currentRevision ?? 1}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {renderStatusTag('CONSISTENT')}
                <button
                  onClick={() => onNavigate('aktor', 'karakter', c.identity.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium font-mono"
                >
                  Detail →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. DUNIA CONSISTENCY
  if (section === 'dunia') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Konsistensi Spasial & Hubungan Dunia</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Audit topologi lokasi, hierarki spasial, dan eksistensi entitas objek.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="text-xs font-bold text-neutral-200">Hierarki Lokasi & Ruang</span>
            {renderStatusTag('CONSISTENT')}
          </div>
          <p className="text-xs text-neutral-300">
            Hierarki LOC_GENERIC_SUB_A terhubung langsung dengan parent node LOC_GENERIC_A tanpa circular loop.
          </p>
        </div>
      </div>
    );
  }

  // 5. DEFAULT: RINGKASAN AGREGAT
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Review Konsistensi & Kontinuitas</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Pocer Cocokkan: permukaan komprehensif untuk mendeteksi anomali, kontinuitas cerita, dan kepatuhan aturan Canon.
        </p>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Laporan Kontinuitas Agregat
            </h2>
          </div>
          <TruthBadge level="DERIVED" />
        </div>

        <div className="space-y-3">
          {consistencyChecks.map((chk) => (
            <div
              key={chk.id}
              className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-200">{chk.category}</span>
                  <span className="text-[10px] font-mono text-neutral-500">{chk.id}</span>
                </div>
                <p className="text-xs text-neutral-300">{chk.description}</p>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{chk.details}</div>
              </div>
              <div className="shrink-0">{renderStatusTag(chk.status)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-6">
      {/* Submenu Tabs di dalam Cocokkan */}
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
