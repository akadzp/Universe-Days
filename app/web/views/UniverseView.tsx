import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Package,
  Heart,
  HelpCircle,
  PlusCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Card, StatusBadge, Button, InfoCallout, Modal } from '../components/UIElements.tsx';
import type {
  UniverseDetails,
  UniverseCharacter,
  UniverseLocation,
  UniverseObject,
  UniverseRelationship,
  UniverseUnresolvedCondition,
} from '../types.ts';

export function UniverseView({
  universe,
  onOpenCharacterWorkspace,
  onOpenCharacterList,
  onAddLocation,
  onAddObject,
  onAddRelationship,
  onAddMystery,
  onAiAssist,
}: {
  universe: UniverseDetails | null;
  onOpenCharacterWorkspace: (characterId: string) => void;
  onOpenCharacterList: () => void;
  onAddLocation: (data: any) => Promise<void>;
  onAddObject: (data: any) => Promise<void>;
  onAddRelationship: (data: any) => Promise<void>;
  onAddMystery: (data: any) => Promise<void>;
  onAiAssist: (capability: string, input: any) => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState<'locations' | 'objects' | 'relationships' | 'mysteries' | 'characters'>('locations');

  // Modals
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [isMysteryModalOpen, setIsMysteryModalOpen] = useState(false);

  // Forms
  const [locName, setLocName] = useState('');
  const [locDesc, setLocDesc] = useState('');
  const [locType, setLocType] = useState('SETTLEMENT');
  const [locAccess, setLocAccess] = useState('OPEN');

  const [objName, setObjName] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objType, setObjType] = useState('RELIC');
  const [objOwnerId, setObjOwnerId] = useState('');
  const [objLocationId, setObjLocationId] = useState('');

  const [relChar1, setRelChar1] = useState('');
  const [relChar2, setRelChar2] = useState('');
  const [relType, setRelType] = useState('ALLY');
  const [relDynamic, setRelDynamic] = useState('');

  const [mysteryDesc, setMysteryDesc] = useState('');
  const [mysteryType, setMysteryType] = useState('MYSTERY');
  const [mysterySignificance, setMysterySignificance] = useState('MAJOR');


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!universe || !universe.mounted) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium">
        Belum ada dunia cerita yang dimuat.
      </div>
    );
  }

  // Handlers
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddLocation({
        displayName: locName.trim(),
        description: locDesc.trim() || undefined,
        locationType: locType,
        accessibilityStatus: locAccess,
      });
      setLocName('');
      setLocDesc('');
      setIsLocModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddObject({
        displayName: objName.trim(),
        description: objDesc.trim() || undefined,
        objectType: objType,
        currentOwnerCharacterId: objOwnerId || undefined,
        currentLocationId: objLocationId || undefined,
      });
      setObjName('');
      setObjDesc('');
      setIsObjModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relChar1 || !relChar2 || relChar1 === relChar2) return;
    setIsSubmitting(true);
    try {
      await onAddRelationship({
        characterIdA: relChar1,
        characterIdB: relChar2,
        relationshipType: relType,
        dynamic: relDynamic.trim() || undefined,
      });
      setRelDynamic('');
      setIsRelModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMystery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mysteryDesc.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddMystery({
        description: mysteryDesc.trim(),
        conditionType: mysteryType,
        significance: mysterySignificance,
      });
      setMysteryDesc('');
      setIsMysteryModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Dunia Cerita & Entitas Semesta
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Eksplorasi wilayah geografi, pusaka, dinamika relasi antartokoh, dan misteri yang belum terpecahkan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'locations' && (
            <Button kind="clay" size="sm" onClick={() => setIsLocModalOpen(true)} className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>+ Wilayah</span>
            </Button>
          )}
          {activeTab === 'objects' && (
            <Button kind="clay" size="sm" onClick={() => setIsObjModalOpen(true)} className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>+ Benda Pusaka</span>
            </Button>
          )}
          {activeTab === 'relationships' && (
            <Button kind="clay" size="sm" onClick={() => setIsRelModalOpen(true)} className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>+ Relasi Antartokoh</span>
            </Button>
          )}
          {activeTab === 'mysteries' && (
            <Button kind="clay" size="sm" onClick={() => setIsMysteryModalOpen(true)} className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>+ Misteri Baru</span>
            </Button>
          )}
          {activeTab === 'characters' && (
            <Button kind="clay" size="sm" onClick={onOpenCharacterList} className="gap-1.5 shadow-xs">
              <Users className="h-4 w-4" />
              <span>Kelola Tokoh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'locations', label: `Wilayah (${universe.locations.length})`, icon: MapPin },
          { id: 'objects', label: `Benda Pusaka (${universe.objects.length})`, icon: Package },
          { id: 'relationships', label: `Ikatan Relasi (${universe.relationships.length})`, icon: Heart },
          { id: 'mysteries', label: `Misteri (${universe.unresolvedConditions.length})`, icon: HelpCircle },
          { id: 'characters', label: `Tokoh (${universe.characters.length})`, icon: Users },
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

      {/* TAB: Wilayah & Lokasi */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.locations.map((loc) => (
            <Card key={loc.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{loc.displayName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{loc.locationType}</span>
                  </div>
                </div>
                <StatusBadge status={loc.accessibilityStatus || 'OPEN'} />
              </div>

              <p className="text-xs text-slate-600 line-clamp-3">
                {loc.description || 'Deskripsi belum tercatat.'}
              </p>
            </Card>
          ))}

          {universe.locations.length === 0 && (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Belum ada wilayah yang dicatat. Klik "+ Wilayah" di atas untuk menambahkan.
            </div>
          )}
        </div>
      )}

      {/* TAB: Pusaka & Benda */}
      {activeTab === 'objects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.objects.map((obj) => (
            <Card key={obj.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{obj.displayName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{obj.objectType}</span>
                  </div>
                </div>
                <StatusBadge status={obj.condition || 'PRISTINE'} />
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">
                {obj.description || 'Deskripsi belum tercatat.'}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Pemilik: {obj.currentOwnerCharacterId ? 'Dimiliki Tokoh' : 'Belum bertuan'}</span>
              </div>
            </Card>
          ))}

          {universe.objects.length === 0 && (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Belum ada benda pusaka yang dicatat. Klik "+ Benda Pusaka" untuk menambahkan.
            </div>
          )}
        </div>
      )}

      {/* TAB: Ikatan Relasi */}
      {activeTab === 'relationships' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.relationships.map((r) => {
            const actorAId = r.characterIdA || r.sourceActorRef;
            const actorBId = r.characterIdB || r.targetActorRef;
            const charA = universe.characters.find((c) => c.id === actorAId);
            const charB = universe.characters.find((c) => c.id === actorBId);
            return (
              <Card key={r.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                    {r.relationshipType}
                  </span>
                  <StatusBadge status={r.status || 'ACTIVE'} />
                </div>

                <div className="flex items-center justify-between py-2 text-xs font-bold text-slate-900">
                  <span>{charA?.displayName || actorAId || 'Tokoh'}</span>
                  <Heart className="h-4 w-4 text-rose-500 fill-rose-500 shrink-0 mx-2" />
                  <span>{charB?.displayName || actorBId || 'Tokoh'}</span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {r.dynamic || 'Dinamika belum tercatat.'}
                </p>
              </Card>
            );
          })}

          {universe.relationships.length === 0 && (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Belum ada ikatan relasi antartokoh. Klik "+ Relasi Antartokoh" untuk menghubungkan dua karakter.
            </div>
          )}
        </div>
      )}

      {/* TAB: Misteri Terbuka */}
      {activeTab === 'mysteries' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.unresolvedConditions.map((m) => (
            <Card key={m.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  {m.conditionType}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{m.significance}</span>
              </div>

              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {m.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status: <strong className="text-amber-800">{m.resolutionStatus || 'TERBUKA'}</strong></span>
              </div>
            </Card>
          ))}

          {universe.unresolvedConditions.length === 0 && (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Belum ada misteri yang tercatat.
            </div>
          )}
        </div>
      )}

      {/* TAB: Tokoh */}
      {activeTab === 'characters' && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4 sm:p-5 border-amber-200 bg-amber-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-amber-200 text-amber-800 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Tokoh dikelola di Ruang Tokoh</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Daftar di bawah membaca tokoh yang sudah tercatat. Gunakan Ruang Tokoh untuk membuat atau mengubah profil.
                  </p>
                </div>
              </div>
              <Button kind="clay" size="sm" onClick={onOpenCharacterList} className="gap-1.5 shrink-0">
                <Users className="h-4 w-4" />
                <span>Buka Ruang Tokoh</span>
              </Button>
            </div>
          </Card>

          {universe.characters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {universe.characters.map((c) => (
                <Card key={c.id} className="p-5 cursor-pointer hover:border-amber-400 hover:shadow-md transition group">
                  <button type="button" onClick={() => onOpenCharacterWorkspace(c.id)} className="w-full text-left space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-black text-sm shrink-0">
                          {c.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition truncate">{c.displayName}</h4>
                          <p className="text-xs text-slate-500 font-medium truncate">{c.role || 'Peran belum tercatat'}</p>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {c.traits?.length ? c.traits.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-lg border border-amber-200">{t}</span>
                      )) : <span className="text-[11px] text-slate-400 italic">Belum ada sifat yang tercatat</span>}
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-700">
                      <span>Buka profil tokoh</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-slate-200">
              <Users className="h-7 w-7 mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">Belum ada tokoh yang tercatat</p>
              <p className="mt-1 text-xs text-slate-500">Buka Ruang Tokoh untuk mendaftarkan tokoh pertama.</p>
            </Card>
          )}
        </div>
      )}

      {/* MODAL: Add Location */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Tambah Wilayah / Lokasi Baru"
        subtitle="Petakan lanskap geografis baru ke dalam semesta."
      >
        <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Wilayah *</label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Contoh: Benteng Karang Hitam"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipe Wilayah</label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="SETTLEMENT">PEMUKIMAN / KOTA</option>
              <option value="WILDERNESS">ALAM LIAR / HUTAN</option>
              <option value="DUNGEON">RUANG BAWAH TANAH / SITUS</option>
              <option value="FORTRESS">BENTENG / ISTANA</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Deskripsi Wilayah</label>
            <textarea
              rows={3}
              value={locDesc}
              onChange={(e) => setLocDesc(e.target.value)}
              placeholder="Gambaran visual, suasana, dan kondisi cuaca..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsLocModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting || !locName.trim()}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Wilayah'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Object */}
      <Modal
        isOpen={isObjModalOpen}
        onClose={() => setIsObjModalOpen(false)}
        title="Tambah Benda Pusaka / Artefak"
        subtitle="Catat objek penting yang memengaruhi alur narasi."
      >
        <form onSubmit={handleCreateObject} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Benda *</label>
            <input
              type="text"
              required
              value={objName}
              onChange={(e) => setObjName(e.target.value)}
              placeholder="Contoh: Kompas Bintang Kuno"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipe Benda</label>
              <select
                value={objType}
                onChange={(e) => setObjType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="RELIC">PUSAKA / ARTEFAK</option>
                <option value="WEAPON">SENJATA</option>
                <option value="DOCUMENT">DOKUMEN / MANUSKRIP</option>
                <option value="TOOL">PERALATAN</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pemilik (Opsional)</label>
              <select
                value={objOwnerId}
                onChange={(e) => setObjOwnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">-- Belum Bertuan --</option>
                {universe.characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Deskripsi Kegunaan & Khasiat</label>
            <textarea
              rows={3}
              value={objDesc}
              onChange={(e) => setObjDesc(e.target.value)}
              placeholder="Sejarah atau kekuatan khusus yang tersimpan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsObjModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting || !objName.trim()}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pusaka'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Relationship */}
      <Modal
        isOpen={isRelModalOpen}
        onClose={() => setIsRelModalOpen(false)}
        title="Hubungkan Relasi Antartokoh"
        subtitle="Bangun keterikatan naratif antara dua karakter."
      >
        <form onSubmit={handleCreateRelationship} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tokoh Pertama *</label>
              <select
                required
                value={relChar1}
                onChange={(e) => setRelChar1(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="">-- Pilih Tokoh --</option>
                {universe.characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tokoh Kedua *</label>
              <select
                required
                value={relChar2}
                onChange={(e) => setRelChar2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="">-- Pilih Tokoh --</option>
                {universe.characters
                  .filter((c) => c.id !== relChar1)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipe Ikatan</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="ALLY">SEKUTU / KAWAN (ALLY)</option>
              <option value="RIVAL">RIVAL / PESAING (RIVAL)</option>
              <option value="MENTOR">GURU - MURID (MENTOR)</option>
              <option value="ENEMY">MUSUH (ENEMY)</option>
              <option value="FAMILY">KELUARGA / KERABAT (FAMILY)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dinamika Hubungan</label>
            <input
              type="text"
              value={relDynamic}
              onChange={(e) => setRelDynamic(e.target.value)}
              placeholder="Contoh: Saling menghormati namun bersaing dalam keahlian"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsRelModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              kind="clay"
              size="sm"
              disabled={isSubmitting || !relChar1 || !relChar2 || relChar1 === relChar2}
            >
              {isSubmitting ? 'Menyambungkan...' : 'Simpan Ikatan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Mystery */}
      <Modal
        isOpen={isMysteryModalOpen}
        onClose={() => setIsMysteryModalOpen(false)}
        title="Catat Misteri / Konflik Terbuka"
        subtitle="Tambahkan teka-teki yang perlu dipecahkan dalam alur cerita."
      >
        <form onSubmit={handleCreateMystery} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Uraian Misteri / Persoalan *</label>
            <textarea
              required
              rows={3}
              value={mysteryDesc}
              onChange={(e) => setMysteryDesc(e.target.value)}
              placeholder="Uraikan teka-teki atau ancaman yang sedang mengintai..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Klasifikasi</label>
              <select
                value={mysteryType}
                onChange={(e) => setMysteryType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="MYSTERY">MISTERI DUNIA</option>
                <option value="CONFLICT">KONFLIK ANTARFAKSI</option>
                <option value="PROPHECY">RAMALAN / PETUNJUK</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Pengaruh</label>
              <select
                value={mysterySignificance}
                onChange={(e) => setMysterySignificance(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="MAJOR">UTAMA (MAJOR)</option>
                <option value="MINOR">SAMPINGAN (MINOR)</option>
                <option value="CRITICAL">KRITIS / KANUN</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsMysteryModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting || !mysteryDesc.trim()}>
              {isSubmitting ? 'Mencatat...' : 'Simpan Misteri'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
