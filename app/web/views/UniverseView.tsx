import React, { useState } from 'react';
import {
  Users,
  MapPin,
  Package,
  Heart,
  HelpCircle,
  PlusCircle,
  Sparkles,
  ChevronRight,
  Eye,
  Wand2,
  Shield,
  Layers
} from 'lucide-react';
import { Card, StatusBadge, Button, Modal, InfoCallout } from '../components/UIElements.tsx';
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
  onAddCharacter,
  onAddLocation,
  onAddObject,
  onAddRelationship,
  onAddMystery,
  onAiAssist,
}: {
  universe: UniverseDetails | null;
  onOpenCharacterWorkspace: (characterId: string) => void;
  onAddCharacter: (data: any) => Promise<void>;
  onAddLocation: (data: any) => Promise<void>;
  onAddObject: (data: any) => Promise<void>;
  onAddRelationship: (data: any) => Promise<void>;
  onAddMystery: (data: any) => Promise<void>;
  onAiAssist: (capability: string, input: any) => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'objects' | 'relationships' | 'mysteries'>('characters');

  // Modals state
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [isMysteryModalOpen, setIsMysteryModalOpen] = useState(false);

  // Form states
  const [charName, setCharName] = useState('');
  const [charRole, setCharRole] = useState('Tokoh Utama');
  const [charTraits, setCharTraits] = useState('Pemberani, Cerdas, Setia');
  const [charPersonality, setCharPersonality] = useState('Visioner & Tangguh');
  const [charOccupation, setCharOccupation] = useState('Penjelajah');
  const [charGoal, setCharGoal] = useState('Menemukan kebenaran masa lalu');
  const [charWound, setCharWound] = useState('Rasa bersalah masa kecil');

  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState('SETTLEMENT');
  const [locDesc, setLocDesc] = useState('');

  const [objName, setObjName] = useState('');
  const [objType, setObjType] = useState('PHYSICAL');
  const [objCondition, setObjCondition] = useState('INTACT');

  const [relSub, setRelSub] = useState('');
  const [relTar, setRelTar] = useState('');
  const [relType, setRelType] = useState('ALLY');
  const [relDynamic, setRelDynamic] = useState('Saling Mendukung');

  const [mysteryDesc, setMysteryDesc] = useState('');
  const [mysteryType, setMysteryType] = useState('NARRATIVE_MYSTERY');

  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!universe || !universe.mounted) {
    return (
      <Card className="p-12 text-center text-slate-500 text-xs">
        Buka atau buat dunia cerita terlebih dahulu untuk menjelajah entitas.
      </Card>
    );
  }

  // AI Assist Handlers
  const handleCharAiAssist = async () => {
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('CHARACTER_PROFILE', {
        name: charName || 'Kaelen',
        archetype: charRole,
      });
      if (res?.proposal) {
        if (!charName) setCharName(res.proposal.displayName);
        setCharPersonality(res.proposal.personalityType);
        setCharTraits(res.proposal.traits.join(', '));
        setCharOccupation(res.proposal.occupation);
        setCharGoal(res.proposal.primaryGoal);
        setCharWound(res.proposal.innerWound);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLocAiAssist = async () => {
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('LOCATION', { name: locName || 'Lembah Kabut' });
      if (res?.proposal) {
        if (!locName) setLocName(res.proposal.displayName);
        setLocDesc(res.proposal.description);
        setLocType(res.proposal.locationType);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleObjAiAssist = async () => {
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('OBJECT', { name: objName || 'Pusaka Kuno' });
      if (res?.proposal) {
        if (!objName) setObjName(res.proposal.displayName);
        setObjCondition(res.proposal.condition);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Ensiklopedia Semesta Cerita
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola tokoh, wilayah, pusaka kuno, relasi, dan misteri yang membangun kedalaman dunia Anda.
          </p>
        </div>

        {/* Dynamic Action Button */}
        <div>
          {activeTab === 'characters' && (
            <Button kind="clay" size="sm" onClick={() => setIsCharModalOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              <span>+ Tokoh Baru</span>
            </Button>
          )}
          {activeTab === 'locations' && (
            <Button kind="clay" size="sm" onClick={() => setIsLocModalOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              <span>+ Wilayah Baru</span>
            </Button>
          )}
          {activeTab === 'objects' && (
            <Button kind="clay" size="sm" onClick={() => setIsObjModalOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              <span>+ Benda Pusaka Baru</span>
            </Button>
          )}
          {activeTab === 'relationships' && (
            <Button kind="clay" size="sm" onClick={() => setIsRelModalOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              <span>+ Ikatan Relasi Baru</span>
            </Button>
          )}
          {activeTab === 'mysteries' && (
            <Button kind="clay" size="sm" onClick={() => setIsMysteryModalOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              <span>+ Catat Misteri Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'characters', label: `Tokoh & Karakter (${universe.characters.length})`, icon: Users },
          { id: 'locations', label: `Wilayah & Lokasi (${universe.locations.length})`, icon: MapPin },
          { id: 'objects', label: `Pusaka & Benda (${universe.objects.length})`, icon: Package },
          { id: 'relationships', label: `Ikatan Relasi (${universe.relationships.length})`, icon: Heart },
          { id: 'mysteries', label: `Misteri Terbuka (${universe.unresolvedConditions.length})`, icon: HelpCircle },
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

      {/* Characters Tab */}
      {activeTab === 'characters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.characters.map((c) => (
            <Card
              key={c.id}
              className="p-5 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
            >
              <div onClick={() => onOpenCharacterWorkspace(c.id)} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-900 font-black text-lg shadow-inner">
                      {c.displayName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition">
                        {c.displayName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{c.role || 'Tokoh Utama'}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Tipe: </span>
                  {c.personalityType || 'Pemberani & Visioner'}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {c.traits?.slice(0, 3).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-lg border border-amber-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>Buka Ruang Kerja Tokoh (9 Tab)</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.locations.map((loc) => (
            <Card key={loc.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{loc.displayName}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{loc.locationType}</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                  {loc.accessibilityStatus}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">
                {loc.description || 'Pusat pemukiman dan interaksi antar tokoh.'}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Objects Tab */}
      {activeTab === 'objects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {universe.objects.map((obj) => (
            <Card key={obj.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{obj.displayName}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{obj.objectType}</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold">
                  {obj.condition}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                <span>Status Pemilikan:</span>
                <strong className="text-slate-800">{obj.possessionStatus}</strong>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Relationships Tab */}
      {activeTab === 'relationships' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          {universe.relationships.map((r) => {
            const charA = universe.characters.find((c) => c.id === r.sourceActorRef)?.displayName || r.sourceActorRef;
            const charB = universe.characters.find((c) => c.id === r.targetActorRef)?.displayName || r.targetActorRef;
            return (
              <Card key={r.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{charA} ↔ {charB}</span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs rounded-xl font-bold">
                    {r.relationshipType}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Dinamika: </span>
                  {r.dynamic || 'Hubungan Saling Percaya'}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mysteries Tab */}
      {activeTab === 'mysteries' && (
        <div className="space-y-4 animate-fade-in">
          {universe.unresolvedConditions.map((uc) => (
            <Card key={uc.id} className="p-5 space-y-2 bg-rose-50/30 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-900 uppercase">{uc.title}</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-bold">
                  {uc.status}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium">{uc.description}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Character Builder Modal */}
      <Modal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        title="Daftarkan Tokoh Baru"
        subtitle="Lengkapi data profil karakter untuk memperkaya dunia cerita."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onAddCharacter({
              displayName: charName,
              role: charRole,
              personalityType: charPersonality,
              traits: charTraits.split(',').map((t) => t.trim()).filter(Boolean),
              occupation: charOccupation,
              primaryGoal: charGoal,
              innerWound: charWound,
            });
            setIsCharModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Bantuan AI:</span>
            <Button kind="clay" size="sm" onClick={handleCharAiAssist} disabled={isAiLoading}>
              <Wand2 className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Menyusun...' : 'Saran Profil AI'}</span>
            </Button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Tokoh *</label>
            <input
              type="text"
              required
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="cth. Lyra Valen"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Peran / Profesi</label>
              <input
                type="text"
                value={charOccupation}
                onChange={(e) => setCharOccupation(e.target.value)}
                placeholder="cth. Peneliti Pusaka"
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Kepribadian</label>
              <input
                type="text"
                value={charPersonality}
                onChange={(e) => setCharPersonality(e.target.value)}
                placeholder="cth. Analitis & Waspada"
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Sifat Utama (pisahkan dengan koma)</label>
            <input
              type="text"
              value={charTraits}
              onChange={(e) => setCharTraits(e.target.value)}
              placeholder="cth. Teliti, Tenang, Protektif"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan Utama (Goal)</label>
            <input
              type="text"
              value={charGoal}
              onChange={(e) => setCharGoal(e.target.value)}
              placeholder="cth. Membuka segel gerbang utara"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Luka Batin (Inner Wound)</label>
            <input
              type="text"
              value={charWound}
              onChange={(e) => setCharWound(e.target.value)}
              placeholder="cth. Kehilangan rekan tim dalam ekspedisi lama"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button kind="secondary" size="md" onClick={() => setIsCharModalOpen(false)}>
              Batal
            </Button>
            <Button kind="clay" size="md" onClick={() => {}}>
              <span>Simpan Tokoh</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Location Builder Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Daftarkan Wilayah / Lokasi Baru"
        subtitle="Tambahkan area penting untuk petualangan tokoh."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onAddLocation({
              displayName: locName,
              locationType: locType,
              description: locDesc,
            });
            setIsLocModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Bantuan AI:</span>
            <Button kind="clay" size="sm" onClick={handleLocAiAssist} disabled={isAiLoading}>
              <Wand2 className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Menyusun...' : 'Saran Wilayah AI'}</span>
            </Button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Wilayah *</label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="cth. Menara Obsidian"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Lokasi</label>
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            >
              <option value="SETTLEMENT">Pemukiman / Kota</option>
              <option value="STRUCTURE">Bangunan / Kuil</option>
              <option value="WILDERNESS">Alam Liar / Hutan</option>
              <option value="DUNGEON">Reruntuhan / Bawah Tanah</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Suasana</label>
            <textarea
              rows={3}
              value={locDesc}
              onChange={(e) => setLocDesc(e.target.value)}
              placeholder="Keadaan atmosfer dan karakteristik area..."
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button kind="secondary" size="md" onClick={() => setIsLocModalOpen(false)}>
              Batal
            </Button>
            <Button kind="clay" size="md" onClick={() => {}}>
              <span>Simpan Wilayah</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Object Builder Modal */}
      <Modal
        isOpen={isObjModalOpen}
        onClose={() => setIsObjModalOpen(false)}
        title="Daftarkan Pusaka / Benda Baru"
        subtitle="Tambahkan relik, artefak, atau senjata naratif."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onAddObject({
              displayName: objName,
              objectType: objType,
              condition: objCondition,
            });
            setIsObjModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Bantuan AI:</span>
            <Button kind="clay" size="sm" onClick={handleObjAiAssist} disabled={isAiLoading}>
              <Wand2 className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Menyusun...' : 'Saran Benda AI'}</span>
            </Button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Benda *</label>
            <input
              type="text"
              required
              value={objName}
              onChange={(e) => setObjName(e.target.value)}
              placeholder="cth. Cincin Surya Abadi"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Benda</label>
              <select
                value={objType}
                onChange={(e) => setObjType(e.target.value)}
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              >
                <option value="PHYSICAL">Fisik / Artefak</option>
                <option value="MAGICAL">Magis / Pusaka</option>
                <option value="DOCUMENT">Dokumen / Peta Kuno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi</label>
              <select
                value={objCondition}
                onChange={(e) => setObjCondition(e.target.value)}
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              >
                <option value="INTACT">Utuh & Berkilau</option>
                <option value="DAMAGED">Retak Sebagian</option>
                <option value="ANCIENT">Kuno & Aus</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button kind="secondary" size="md" onClick={() => setIsObjModalOpen(false)}>
              Batal
            </Button>
            <Button kind="clay" size="md" onClick={() => {}}>
              <span>Simpan Benda</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Relationship Builder Modal */}
      <Modal
        isOpen={isRelModalOpen}
        onClose={() => setIsRelModalOpen(false)}
        title="Daftarkan Ikatan Relasi Baru"
        subtitle="Tentukan dinamika hubungan antara dua tokoh."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!relSub || !relTar) return;
            await onAddRelationship({
              subjectRef: relSub,
              targetRef: relTar,
              relationshipType: relType,
              dynamic: relDynamic,
            });
            setIsRelModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tokoh Pertama *</label>
              <select
                required
                value={relSub}
                onChange={(e) => setRelSub(e.target.value)}
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              >
                <option value="">-- Pilih Tokoh --</option>
                {universe.characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tokoh Kedua *</label>
              <select
                required
                value={relTar}
                onChange={(e) => setRelTar(e.target.value)}
                className="clay-input w-full px-3 py-2 text-xs rounded-xl"
              >
                <option value="">-- Pilih Tokoh --</option>
                {universe.characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Ikatan</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            >
              <option value="ALLY">Sekutu / Rekan</option>
              <option value="RIVAL">Rival / Pesaing</option>
              <option value="MENTOR">Mentor & Murid</option>
              <option value="FAMILY">Keluarga</option>
              <option value="ENEMY">Musuh Bebuyutan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dinamika Hubungan</label>
            <input
              type="text"
              value={relDynamic}
              onChange={(e) => setRelDynamic(e.target.value)}
              placeholder="cth. Saling menghormati namun bersaing"
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button kind="secondary" size="md" onClick={() => setIsRelModalOpen(false)}>
              Batal
            </Button>
            <Button kind="clay" size="md" onClick={() => {}}>
              <span>Simpan Ikatan</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mystery Builder Modal */}
      <Modal
        isOpen={isMysteryModalOpen}
        onClose={() => setIsMysteryModalOpen(false)}
        title="Catat Misteri / Ketegangan Baru"
        subtitle="Misteri akan diteruskan dan diselesaikan sepanjang alur cerita."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onAddMystery({
              conditionType: mysteryType,
              description: mysteryDesc,
            });
            setIsMysteryModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Misteri</label>
            <select
              value={mysteryType}
              onChange={(e) => setMysteryType(e.target.value)}
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            >
              <option value="NARRATIVE_MYSTERY">Misteri Rahasia Kuno</option>
              <option value="POLITICAL_TENSION">Ketegangan Politik Antar Faksi</option>
              <option value="MISSING_ARTIFACT">Pusaka yang Hilang</option>
              <option value="PROPHECY">Ramalan Masa Depan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Misteri *</label>
            <textarea
              required
              rows={3}
              value={mysteryDesc}
              onChange={(e) => setMysteryDesc(e.target.value)}
              placeholder="Jelaskan teka-teki naratif yang belum terpecahkan..."
              className="clay-input w-full px-3 py-2 text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button kind="secondary" size="md" onClick={() => setIsMysteryModalOpen(false)}>
              Batal
            </Button>
            <Button kind="clay" size="md" onClick={() => {}}>
              <span>Simpan Misteri</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
