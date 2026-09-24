import React, { useState } from 'react';
import {
  Users2,
  Plus,
  User,
  MapPin,
  Brain,
  Network,
  Activity,
  History,
  Shield,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { AuthoritativeUniverse, CharacterItem } from '../types';

interface ActorActressViewProps {
  universe: AuthoritativeUniverse | null;
  onCharacterCreated: () => void;
}

export const ActorActressView: React.FC<ActorActressViewProps> = ({
  universe,
  onCharacterCreated
}) => {
  const characters = universe?.characters ? Object.values(universe.characters) : [];
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    characters[0]?.identity.id ?? null
  );

  // Modal / Form state for character creation (no hardcoded domain defaults per Section 5, 7, 59)
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    displayName: '',
    role: '',
    locationRef: '',
    tags: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedChar: CharacterItem | undefined =
    characters.find(c => c.identity.id === selectedCharacterId) ?? characters[0];

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id.trim() || !formData.displayName.trim()) {
      setErrorMessage('ID Karakter dan Nama Tampilan wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        id: formData.id.trim(),
        displayName: formData.displayName.trim(),
        role: formData.role.trim() || undefined,
        locationRef: formData.locationRef.trim() || undefined,
        tags: formData.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
      };

      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan karakter');
      }

      setSuccessMessage(`Karakter ${data.character?.identity?.displayName || formData.displayName} berhasil didaftarkan secara otoritatif!`);
      setIsCreating(false);
      setFormData({
        id: '',
        displayName: '',
        role: '',
        locationRef: '',
        tags: ''
      });
      onCharacterCreated();
      if (data.character?.identity?.id) {
        setSelectedCharacterId(data.character.identity.id);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Users2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-neutral-100">
              Actor & Actress Workspace
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Canonical Home untuk Karakter, Aktor, Profil, Status Temporal, Relasi, dan Riwayat
            Revisi.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Daftarkan Karakter Baru</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-center space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout: Characters Registry on Left, Canonical Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Character Registry List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Registry Karakter ({characters.length})
            </span>
            <span className="text-[10px] font-mono text-neutral-500">CANONICAL STATE</span>
          </div>

          <div className="space-y-2">
            {characters.map(char => {
              const isSelected = char.identity.id === (selectedChar?.identity.id ?? '');
              return (
                <div
                  key={char.identity.id}
                  onClick={() => setSelectedCharacterId(char.identity.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-600/60 shadow-md'
                      : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {char.identity.displayName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-100">
                          {char.identity.displayName}
                        </h4>
                        <span className="font-mono text-[11px] text-neutral-400">
                          {char.identity.id}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                      {char.identity.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="truncate">
                      {char.roleReferences?.[0] || 'Tanpa Peran Tertentu'}
                    </span>
                    <span className="font-mono text-[10px] text-indigo-400">
                      Lokasi: {char.locationReference || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Character Canonical Detail (8 cols) */}
        <div className="lg:col-span-8">
          {selectedChar ? (
            <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-6">
              {/* Header: Identity & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xl">
                    {selectedChar.identity.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-neutral-100">
                        {selectedChar.identity.displayName}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                        {selectedChar.identity.status}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-neutral-400 mt-0.5">
                      Canonical ID: {selectedChar.identity.id}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs font-mono">
                  <span className="text-neutral-500 block">Kategori Temporal:</span>
                  <span className="text-indigo-400 font-semibold">
                    {selectedChar.temporalValidity?.temporalCategory ?? 'ACTUAL'}
                  </span>
                </div>
              </div>

              {/* Tags and Roles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Role References</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChar.roleReferences && selectedChar.roleReferences.length > 0 ? (
                      selectedChar.roleReferences.map(role => (
                        <span
                          key={role}
                          className="px-2.5 py-1 text-xs font-mono bg-indigo-950/40 text-indigo-300 border border-indigo-800/50 rounded-lg"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500 italic">Belum ada role</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Entity Tags & Archetypes</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChar.identity.tags && selectedChar.identity.tags.length > 0 ? (
                      selectedChar.identity.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-xs font-mono bg-amber-950/40 text-amber-300 border border-amber-800/50 rounded-lg"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500 italic">Tanpa tag</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Location & Temporal State Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Location Reference</span>
                  </div>
                  <div className="text-xs font-mono text-neutral-200">
                    {selectedChar.locationReference || (
                      <span className="text-neutral-500 italic">UNKNOWN / NOT_RECORDED</span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Merujuk pada Spatial Truth yang dimiliki oleh LOCATION_SYSTEM.
                  </p>
                </div>

                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span>State Reference</span>
                  </div>
                  <div className="text-xs font-mono text-neutral-200">
                    {selectedChar.stateReference || (
                      <span className="text-neutral-500 italic">UNKNOWN / NOT_RECORDED</span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Vektor temporal dinamis yang dimiliki oleh STATE_SYSTEM.
                  </p>
                </div>
              </div>

              {/* Knowledge & Relationships references */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <Brain className="w-4 h-4 text-sky-400" />
                    <span>Knowledge References ({selectedChar.knowledgeReferences?.length || 0})</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedChar.knowledgeReferences && selectedChar.knowledgeReferences.length > 0 ? (
                      selectedChar.knowledgeReferences.map(ref => (
                        <div
                          key={ref}
                          className="text-xs font-mono px-2.5 py-1.5 bg-neutral-900 rounded border border-neutral-800 text-sky-300"
                        >
                          {ref}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-neutral-500 italic">
                        Belum ada referensi pengetahuan tercatat.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span>
                      Relationship References ({selectedChar.relationshipReferences?.length || 0})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedChar.relationshipReferences &&
                    selectedChar.relationshipReferences.length > 0 ? (
                      selectedChar.relationshipReferences.map(ref => (
                        <div
                          key={ref}
                          className="text-xs font-mono px-2.5 py-1.5 bg-neutral-900 rounded border border-neutral-800 text-purple-300"
                        >
                          {ref}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-neutral-500 italic">
                        Belum ada referensi hubungan tercatat.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Provenance and Audit Trace */}
              <div className="p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/70 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-400">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Provenance & Traceability Audit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-neutral-400">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">SYSTEM OWNER</span>
                    <span className="text-neutral-300">
                      {selectedChar.provenance?.ownerSystemId || 'CHARACTER_SYSTEM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">DOMAIN</span>
                    <span className="text-neutral-300">
                      {selectedChar.provenance?.domainId || 'CHARACTER'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">REVISI TERAKHIR</span>
                    <span className="text-neutral-300 truncate block">
                      {selectedChar.history?.currentRevisionId || 'REV_INITIAL'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-12 text-center text-neutral-500 text-sm">
              Pilih karakter di sebelah kiri untuk melihat detail canonical.
            </div>
          )}
        </div>
      </div>

      {/* Modal / Dialog: Daftarkan Karakter Baru (Command Mutation) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-100">
                Daftarkan Karakter Baru
              </h3>
              <p className="text-xs text-neutral-400">
                Mengirimkan command otoritatif ke <code>/api/characters</code> sesuai aturan tata
                kelola sistem.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateCharacter} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">
                  Identifier Karakter (ID)*
                </label>
                <input
                  type="text"
                  placeholder="CHAR_NEW_HERO"
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:border-indigo-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-neutral-500">
                  Akan diformat otomatis menjadi awalan CHAR_
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">
                  Nama Tampilan (Display Name)*
                </label>
                <input
                  type="text"
                  placeholder="Karakter Baru"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">Role Reference</label>
                <input
                  type="text"
                  placeholder="ROLE_EXPLORER"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">Location Reference</label>
                <select
                  value={formData.locationRef}
                  onChange={e => setFormData({ ...formData, locationRef: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Tanpa Lokasi / Belum Ditentukan --</option>
                  {universe?.locations &&
                    Object.values(universe.locations).map(loc => (
                      <option key={loc.identity.id} value={loc.identity.id}>
                        {loc.identity.id} ({loc.identity.displayName})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">Tags (pisahkan koma)</label>
                <input
                  type="text"
                  placeholder="adventurer, scholar"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-semibold transition cursor-pointer"
                >
                  {submitting ? 'Memvalidasi...' : 'Daftarkan Otoritatif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
