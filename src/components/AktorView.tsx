import React, { useState } from 'react';
import type { AktorSection, UniverseData } from '../types.ts';
import {
  Users,
  User,
  Shield,
  Tag,
  MapPin,
  Clock,
  History,
  FileCheck,
  PlusCircle,
  FolderTree,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge, EntityLifecycleBadge } from './StatusBadges.tsx';

interface AktorViewProps {
  section: AktorSection;
  onSelectSection: (sec: AktorSection) => void;
  universe: UniverseData | null;
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onNavigate: (nav: 'cerita' | 'cocokkan' | 'dunia', sec: string) => void;
  onRefresh: () => Promise<void>;
}

export function AktorView({
  section,
  onSelectSection,
  universe,
  selectedCharId,
  onSelectCharacter,
  onNavigate,
  onRefresh
}: AktorViewProps) {
  const characters = universe?.characters || {};
  const charList = Object.values(characters);

  // Active character for detail view
  const activeChar = selectedCharId && characters[selectedCharId]
    ? characters[selectedCharId]
    : charList[0] || null;

  // Sub-tabs for Karakter Detail per Section 5.2
  const [detailTab, setDetailTab] = useState<
    'ringkasan' | 'profil' | 'keadaan' | 'perilaku' | 'gaya' | 'pengetahuan' | 'relasi' | 'continuity' | 'riwayat'
  >('ringkasan');

  // Form state for Buat Karakter workflow per Section 5.4
  const availableLocations = Object.keys(universe?.locations || {});
  const [newCharId, setNewCharId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocationRef, setNewLocationRef] = useState(availableLocations[0] || '');
  const [newTag, setNewTag] = useState('');
  const [createStatus, setCreateStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({
    type: 'idle'
  });

  // Filter state for Semua Aktor
  const [filterQuery, setFilterQuery] = useState('');

  const filteredCharacters = charList.filter((c: any) => {
    const q = filterQuery.toLowerCase();
    const name = c.identity?.displayName || '';
    const id = c.identity?.id || '';
    return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
  });

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharId.trim() || !newDisplayName.trim()) {
      setCreateStatus({ type: 'error', message: 'ID dan Display Name wajib diisi sesuai contract.' });
      return;
    }

    setCreateStatus({ type: 'loading' });
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newCharId.trim(),
          displayName: newDisplayName.trim(),
          role: newRole,
          locationRef: newLocationRef,
          tags: newTag ? [newTag.trim()] : []
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat karakter.');
      }

      setCreateStatus({
        type: 'success',
        message: `Karakter '${data.character.identity.displayName}' berhasil divalidasi dan di-commit ke Universe Canon!`
      });
      setNewCharId('');
      setNewDisplayName('');
      setNewTag('');
      await onRefresh();
    } catch (err) {
      setCreateStatus({
        type: 'error',
        message: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const TABS: Array<{ id: AktorSection; label: string; icon: any; count?: number }> = [
    { id: 'semua_aktor', label: 'Semua Aktor', icon: Users, count: charList.length },
    { id: 'karakter', label: 'Karakter', icon: User },
    { id: 'grup', label: 'Grup', icon: FolderTree },
    { id: 'buat_karakter', label: 'Buat Karakter', icon: PlusCircle },
    { id: 'riwayat', label: 'Riwayat', icon: History }
  ];

  const renderContent = () => {
    // 1. BUAT KARAKTER WORKFLOW
    if (section === 'buat_karakter') {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Workflow Buat Karakter</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Mengikuti spesifikasi section 5.4: validasi ketat, tidak membuat default semantik implisit, dan mempertahankan unknown bila tidak dicatat.
          </p>
        </div>

        <form onSubmit={handleCreateCharacter} className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">
              Character Identifier (ID) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="CHAR_DELTA"
              value={newCharId}
              onChange={(e) => setNewCharId(e.target.value.toUpperCase())}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
              required
            />
            <span className="text-[10px] text-neutral-500 font-mono">Format: CHAR_[NAMA_UNIK]</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">
              Display Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Character Delta"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Role Reference</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ROLE_EXPLORER">ROLE_EXPLORER (Penjelajah)</option>
                <option value="ROLE_SCHOLAR">ROLE_SCHOLAR (Cendekiawan)</option>
                <option value="ROLE_GUARDIAN">ROLE_GUARDIAN (Penjaga)</option>
                <option value="ROLE_MERCHANT">ROLE_MERCHANT (Pedagang)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Location Reference (Spatial)</label>
              <select
                value={newLocationRef}
                onChange={(e) => setNewLocationRef(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {Object.values(universe?.locations || {}).map((loc: any) => (
                  <option key={loc.identity.id} value={loc.identity.id}>
                    {loc.identity.displayName} ({loc.identity.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">Tag / Archetype (Opsional)</label>
            <input
              type="text"
              placeholder="archetype_mentor"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Feedback */}
          {createStatus.type === 'error' && (
            <div className="bg-rose-950/60 border border-rose-800 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{createStatus.message}</span>
            </div>
          )}

          {createStatus.type === 'success' && (
            <div className="bg-emerald-950/60 border border-emerald-800 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{createStatus.message}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={createStatus.type === 'loading'}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Domain Command</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 2. GRUP
  if (section === 'grup') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Grup & Klasifikasi Aktor</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Grouping aktor yang tersedia melalui domain contract tanpa memodifikasi status secara sembarangan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wide font-mono">
              <FolderTree className="w-4 h-4" />
              <span>Role Archetypes</span>
            </div>
            <div className="space-y-2">
              {(() => {
                const uniqueRoles = Array.from(new Set(charList.flatMap((c: any) => c.roleReferences || [])));
                if (uniqueRoles.length === 0) {
                  return (
                    <div className="p-4 bg-neutral-950 rounded-lg text-xs text-neutral-500 font-mono text-center">
                      Belum ada role/archetype yang terdefinisi pada aktor.
                    </div>
                  );
                }
                return uniqueRoles.map((role) => {
                  const members = charList.filter((c: any) => c.roleReferences?.includes(role));
                  return (
                    <div key={role} className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-neutral-200">{role}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {members.length} Aktor
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {members.map((m: any) => (
                          <button
                            key={m.identity.id}
                            onClick={() => onSelectCharacter(m.identity.id)}
                            className="text-[11px] px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono transition-colors"
                          >
                            {m.identity.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wide font-mono">
              <Tag className="w-4 h-4" />
              <span>Archetype Tags</span>
            </div>
            <div className="space-y-2">
              {charList.map((c: any) => (
                <div key={c.identity.id} className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3">
                  <div className="text-xs font-semibold text-neutral-200">{c.identity.displayName}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.identity.tags && c.identity.tags.length > 0 ? (
                      c.identity.tags.map((t: string) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <UnknownSafetyBadge status="NOT_RECORDED" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. RIWAYAT AKTOR
  if (section === 'riwayat') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Riwayat & Provenance Aktor</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Data audit dan jejak kepemilikan yang sah dari backend CHARACTER_SYSTEM.
          </p>
        </div>

        <div className="space-y-3">
          {charList.map((c: any) => (
            <div key={c.identity.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-mono font-bold text-neutral-200">{c.identity.displayName} ({c.identity.id})</span>
                <span className="text-[10px] font-mono text-neutral-400">Owner: {c.provenance?.originatingSystem || 'CHARACTER_SYSTEM'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/60">
                  <span className="text-neutral-500 text-[10px]">Created Revision:</span>
                  <div className="text-neutral-300 mt-0.5">Rev #{c.history?.currentRevision ?? 1}</div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/60">
                  <span className="text-neutral-500 text-[10px]">Effective From:</span>
                  <div className="text-neutral-300 mt-0.5">{c.temporalValidity?.effectiveFrom || '-'}</div>
                </div>
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800/60">
                  <span className="text-neutral-500 text-[10px]">Provenance Source:</span>
                  <div className="text-neutral-300 mt-0.5">{c.provenance?.originSource || '-'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. KARAKTER DETAIL (Section 5.2 - Sub-tabs: Ringkasan, Profil, Keadaan, Perilaku, Gaya, Pengetahuan, Relasi, Continuity, Riwayat)
  if (section === 'karakter') {
    if (!activeChar) {
      return (
        <div className="p-8 text-center text-neutral-500">
          Belum ada karakter yang dipilih atau terdaftar.
        </div>
      );
    }

    const subTabs: Array<{ id: typeof detailTab; label: string }> = [
      { id: 'ringkasan', label: 'Ringkasan' },
      { id: 'profil', label: 'Profil' },
      { id: 'keadaan', label: 'Keadaan' },
      { id: 'perilaku', label: 'Perilaku' },
      { id: 'gaya', label: 'Gaya' },
      { id: 'pengetahuan', label: 'Pengetahuan' },
      { id: 'relasi', label: 'Relasi' },
      { id: 'continuity', label: 'Continuity' },
      { id: 'riwayat', label: 'Riwayat' }
    ];

    return (
      <div className="space-y-5">
        {/* Character selector dropdown / list */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">{activeChar.identity.displayName}</h1>
                <EntityLifecycleBadge status={activeChar.identity.status} />
                <TruthBadge level="CANON" />
              </div>
              <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                ID: {activeChar.identity.id} • Domain: CHARACTER_SYSTEM
              </div>
            </div>
          </div>

          {/* Quick Character Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">Pilih Aktor:</span>
            <select
              value={activeChar.identity.id}
              onChange={(e) => onSelectCharacter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              {charList.map((c: any) => (
                <option key={c.identity.id} value={c.identity.id}>
                  {c.identity.displayName} ({c.identity.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Navigation Tabs (Section 5.2) */}
        <div className="flex items-center gap-1 border-b border-neutral-800 overflow-x-auto pb-1 text-xs font-mono">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDetailTab(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                detailTab === tab.id
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 min-h-[280px]">
          {detailTab === 'ringkasan' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-neutral-200">Ringkasan Aktor Canon</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">Lokasi Saat Ini</span>
                  <div className="text-neutral-200 font-medium">
                    {activeChar.locationReference ? (
                      <button
                        onClick={() => onNavigate('dunia', 'tempat')}
                        className="text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{activeChar.locationReference}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <UnknownSafetyBadge status="NOT_RECORDED" />
                    )}
                  </div>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">Role References</span>
                  <div className="text-neutral-200 font-mono">
                    {activeChar.roleReferences && activeChar.roleReferences.length > 0 ? (
                      activeChar.roleReferences.join(', ')
                    ) : (
                      <UnknownSafetyBadge status="NOT_RECORDED" />
                    )}
                  </div>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">Relasi Terdaftar</span>
                  <div className="text-neutral-200 font-mono">
                    {activeChar.relationshipReferences?.length ?? 0} referensi
                  </div>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">Pengetahuan Pribadi</span>
                  <div className="text-neutral-200 font-mono">
                    {activeChar.knowledgeReferences?.length ?? 0} item fakta/keyakinan
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'profil' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-neutral-200">Profil Identitas Authoritative</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400 font-mono">Entity Type:</span>
                  <span className="text-neutral-200 font-mono">CHARACTER</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400 font-mono">Canonical Status:</span>
                  <EntityLifecycleBadge status={activeChar.identity.status} />
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400 font-mono">Tags:</span>
                  <div className="flex gap-1">
                    {activeChar.identity.tags && activeChar.identity.tags.length > 0 ? (
                      activeChar.identity.tags.map((t: string) => (
                        <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {t}
                        </span>
                      ))
                    ) : (
                      <UnknownSafetyBadge status="NOT_RECORDED" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'keadaan' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-200">Keadaan (State Vector) Temporal</h2>
              <p className="text-xs text-neutral-400">
                State dimiliki oleh STATE_SYSTEM dan bersifat dinamis terhadap waktu, bukan identitas permanen.
              </p>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono space-y-2">
                <div>State Reference: {activeChar.stateReference || <UnknownSafetyBadge status="NOT_RECORDED" />}</div>
                <div>Condition: NORMAL</div>
                <div>Temporal Validity: ACTUAL</div>
              </div>
            </div>
          )}

          {detailTab === 'perilaku' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-200">Pola Perilaku (Behavior)</h2>
              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2">
                  <UnknownSafetyBadge status="NOT_RECORDED" />
                  <span>Tidak ada observasi perilaku implisit. Backend tidak mencatat deviasi kepribadian.</span>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'gaya' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-200">Gaya Ekspresi & Suara (Style)</h2>
              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2">
                  <UnknownSafetyBadge status="NOT_RECORDED" />
                  <span>Gaya bicara dievaluasi saat produksi cerita oleh Narrator, bukan sebagai Canon kaku.</span>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'pengetahuan' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-200">Pengetahuan Pribadi (Epistemic Boundary)</h2>
                <button
                  onClick={() => onNavigate('dunia', 'pengetahuan')}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>Kelola di Dunia/Pengetahuan</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                Aturan 20: Pengetahuan aktor BUKAN kebenaran mutlak alam semesta. Membedakan fakta, keyakinan, dan rumor.
              </p>
              {activeChar.knowledgeReferences && activeChar.knowledgeReferences.length > 0 ? (
                <div className="space-y-2">
                  {activeChar.knowledgeReferences.map((ref: string) => {
                    const k = universe?.knowledge[ref];
                    return (
                      <div key={ref} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs">
                        <div className="flex items-center justify-between font-mono text-[11px] text-neutral-400 mb-1">
                          <span>{ref}</span>
                          <span className="text-emerald-400 font-semibold">{k?.certainty || 'FACT'}</span>
                        </div>
                        <div className="text-neutral-200">{k?.statement || ref}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
                  <UnknownSafetyBadge status="NOT_RECORDED" />
                  <span>Tidak ada entri pengetahuan eksplisit untuk aktor ini.</span>
                </div>
              )}
            </div>
          )}

          {detailTab === 'relasi' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-200">Referensi Hubungan Relasional</h2>
                <button
                  onClick={() => onNavigate('dunia', 'hubungan')}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>Kelola di Dunia/Hubungan</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                Aturan 10: Relasi hanya direferensikan di sini. Canonical editor tetap berada di bawah menu Dunia / Hubungan.
              </p>
              {activeChar.relationshipReferences && activeChar.relationshipReferences.length > 0 ? (
                <div className="space-y-2">
                  {activeChar.relationshipReferences.map((relId: string) => {
                    const r = universe?.relationships[relId];
                    return (
                      <div key={relId} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-neutral-300">{relId}</span>
                          <div className="text-neutral-400 text-[11px] mt-0.5">
                            Tipe: <span className="text-purple-300 font-mono font-medium">{r?.relationshipType || '-'}</span> • Arah: {r?.direction || '-'}
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate('dunia', 'hubungan')}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] transition-colors"
                        >
                          Buka Canonical Home
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
                  <UnknownSafetyBadge status="NOT_RECORDED" />
                  <span>Tidak ada relasi eksplisit tercatat.</span>
                </div>
              )}
            </div>
          )}

          {detailTab === 'continuity' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-200">Continuity Reference & Status</h2>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono space-y-2">
                <div>Continuity Key: {activeChar.continuityReference || <UnknownSafetyBadge status="NOT_RECORDED" />}</div>
                <div className="flex items-center gap-2">
                  <span>Status Audit:</span>
                  <span className="text-emerald-400 font-semibold">CONSISTENT</span>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'riwayat' && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-neutral-200">Riwayat Mutasi & Audit Entity</h2>
              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-xs font-mono space-y-2">
                <div>Revision Count: #{activeChar.history?.currentRevision ?? 1}</div>
                <div>Created At: {activeChar.history?.createdAt || '-'}</div>
                <div>Created By System: {activeChar.provenance?.originatingSystem || 'CHARACTER_SYSTEM'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. DEFAULT: SEMUA AKTOR (Registry, Search, Filter)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Semua Aktor Terdaftar</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Registry resmi karakter dan aktor universe dari domain backend.
          </p>
        </div>

        {/* Search / Filter input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Filter aktor..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCharacters.map((c: any) => (
          <div
            key={c.identity.id}
            className="bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 space-y-3 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{c.identity.displayName}</h3>
                <span className="text-[11px] font-mono text-neutral-400">{c.identity.id}</span>
              </div>
              <EntityLifecycleBadge status={c.identity.status} />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Lokasi: {c.locationReference || <UnknownSafetyBadge status="NOT_RECORDED" />}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Berlaku: {c.temporalValidity?.effectiveFrom?.slice(0, 10) || '2024-01-01'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <TruthBadge level="CANON" />
              <button
                onClick={() => onSelectCharacter(c.identity.id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>Lihat Detail</span>
                <span className="font-mono">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-6">
      {/* Submenu Tabs di dalam Aktor */}
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
