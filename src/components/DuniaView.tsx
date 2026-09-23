import React from 'react';
import type { DuniaSection, UniverseData } from '../types.ts';
import {
  Compass,
  MapPin,
  Box,
  Share2,
  Brain,
  Zap,
  Tag,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge, EntityLifecycleBadge } from './StatusBadges.tsx';

interface DuniaViewProps {
  section: DuniaSection;
  onSelectSection: (sec: DuniaSection) => void;
  universe: UniverseData | null;
  onNavigateToActor: (actorId: string) => void;
}

export function DuniaView({
  section,
  onSelectSection,
  universe,
  onNavigateToActor
}: DuniaViewProps) {
  const locations = universe?.locations || {};
  const objects = universe?.objects || {};
  const relationships = universe?.relationships || {};
  const knowledge = universe?.knowledge || {};
  const events = universe?.events || {};

  const TABS: Array<{ id: DuniaSection; label: string; icon: any; count?: number }> = [
    { id: 'ringkasan', label: 'Ringkasan Dunia', icon: Compass },
    { id: 'tempat', label: 'Tempat (Locations)', icon: MapPin, count: Object.keys(locations).length },
    { id: 'benda', label: 'Benda (Objects)', icon: Box, count: Object.keys(objects).length },
    { id: 'hubungan', label: 'Hubungan (Relations)', icon: Share2, count: Object.keys(relationships).length },
    { id: 'pengetahuan', label: 'Pengetahuan (Knowledge)', icon: Brain, count: Object.keys(knowledge).length },
    { id: 'peristiwa', label: 'Peristiwa (Events)', icon: Zap, count: Object.keys(events).length }
  ];

  const renderContent = () => {
    // 1. TEMPAT (Locations & Spatial)
    if (section === 'tempat') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Tempat & Ruang Spasial</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Canonical Home untuk domain LOCATION_SYSTEM. Mendefinisikan topologi dan hierarki spasial Universe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(locations).map((loc: any) => (
            <div key={loc.identity.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>{loc.identity.displayName}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">{loc.identity.id}</span>
                </div>
                <EntityLifecycleBadge status={loc.identity.status} />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500 font-mono">Parent Location:</span>
                  <span className="text-neutral-200 font-mono">{loc.parentLocationReference || 'NONE (ROOT)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500 font-mono">Spatial Tags:</span>
                  <div className="flex gap-1">
                    {loc.identity.tags?.map((t: string) => (
                      <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {t}
                      </span>
                    )) || <UnknownSafetyBadge status="NOT_RECORDED" />}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <TruthBadge level="CANON" />
                <span className="text-[10px] font-mono text-neutral-500">Domain: LOCATION</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. BENDA (Objects & Artifacts)
  if (section === 'benda') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Benda & Artefak Fisik</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Canonical Home untuk OBJECT_SYSTEM. Kepemilikan fisik dan kondisi artefak di dalam Universe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(objects).map((obj: any) => (
            <div key={obj.identity?.id || obj.objectId} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-amber-400" />
                    <span>{obj.objectName || obj.identity?.displayName}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">{obj.identity?.id}</span>
                </div>
                <EntityLifecycleBadge status={obj.identity?.status || 'ACTIVE'} />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500 font-mono">Disimpan di (Location):</span>
                  <span className="text-neutral-200 font-mono">{obj.locationReference || 'IN_TRANSIT'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500 font-mono">Kepemilikan Aktor:</span>
                  <span className="text-neutral-200 font-mono">{obj.ownerActorReference || 'UNOWNED'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <TruthBadge level="CANON" />
                <span className="text-[10px] font-mono text-neutral-500">Domain: OBJECT</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. HUBUNGAN (Relationships)
  if (section === 'hubungan') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Hubungan Antar-Aktor (Relationships)</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Canonical Home untuk RELATIONSHIP_SYSTEM. Hubungan dinamis antar karakter tanpa menduplikasi data pada profil aktor.
          </p>
        </div>

        <div className="space-y-3">
          {Object.values(relationships).map((rel: any) => (
            <div key={rel.relationshipId} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-neutral-200">{rel.relationshipId}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                  {rel.relationshipType}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => onNavigateToActor(rel.sourceActorId)}
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>{rel.sourceActorId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-neutral-500">⇄</span>
                  <button
                    onClick={() => onNavigateToActor(rel.targetActorId)}
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>{rel.targetActorId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                  <span>Strength: {rel.strength ?? 1.0}</span>
                  <span>•</span>
                  <span>Direction: {rel.direction || 'BIDIRECTIONAL'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. PENGETAHUAN (Knowledge Epistemics)
  if (section === 'pengetahuan') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Pengetahuan & Epistemik Dunia</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Canonical Home untuk KNOWLEDGE_SYSTEM. Membedakan fakta objektif, keyakinan subyektif, dan rumor.
          </p>
        </div>

        <div className="space-y-3">
          {Object.values(knowledge).map((k: any) => (
            <div key={k.knowledgeId} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-neutral-200">{k.knowledgeId}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold">
                  CERTAINTY: {k.certainty || 'FACT'}
                </span>
              </div>

              <p className="text-xs text-neutral-200">{k.statement}</p>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Epistemic Status: {k.epistemicStatus || 'VERIFIED'}</span>
                <span>Truth Level: CANON</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. PERISTIWA (Events)
  if (section === 'peristiwa') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Peristiwa & Jadwal Kejadian (Events)</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Canonical Home untuk EVENT_SYSTEM. Catatan peristiwa deterministik alam semesta.
          </p>
        </div>

        <div className="space-y-3">
          {Object.values(events).map((evt: any) => (
            <div key={evt.eventId} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-neutral-200">{evt.title}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {evt.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px]">Tipe Peristiwa:</span>
                  <div className="text-neutral-300">{evt.eventType}</div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px]">Lokasi:</span>
                  <div className="text-neutral-300">{evt.locationRef}</div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
                  <span className="text-neutral-500 text-[10px]">Partisipan:</span>
                  <div className="text-neutral-300">{evt.participantRefs?.join(', ') || 'NONE'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. DEFAULT: RINGKASAN DUNIA
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Kondisi Dunia (World State)</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Kondisi dunia yang terbentuk dari seluruh domain objektif: tempat, artefak, relasi, fakta pengetahuan, dan peristiwa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs font-mono">
            <MapPin className="w-4 h-4" />
            <span>Spasial Universe</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{Object.keys(locations).length}</div>
          <p className="text-xs text-neutral-400">Node lokasi terdaftar dengan topologi valid.</p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs font-mono">
            <Box className="w-4 h-4" />
            <span>Benda & Artefak</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{Object.keys(objects).length}</div>
          <p className="text-xs text-neutral-400">Entitas fisik dengan aturan akses dan kepemilikan.</p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs font-mono">
            <Brain className="w-4 h-4" />
            <span>Epistemik Pengetahuan</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{Object.keys(knowledge).length}</div>
          <p className="text-xs text-neutral-400">Kumpulan fakta kebenaran mutlak dan relatif.</p>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-6">
      {/* Submenu Tabs di dalam Dunia */}
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
