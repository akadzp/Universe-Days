import React, { useState, useEffect } from 'react';
import {
  User,
  Heart,
  Brain,
  Shield,
  Compass,
  Package,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
  ArrowLeft,
  Activity,
  Layers,
  Award
} from 'lucide-react';
import { Card, StatusBadge, Button, InfoCallout } from '../components/UIElements.tsx';
import type { CharacterWorkspaceData, UniverseCharacter } from '../types.ts';

export function CharacterWorkspaceView({
  characterId,
  onBack,
  onSelectCharacter,
  allCharacters,
  fetchCharacterWorkspace,
}: {
  characterId: string | null;
  onBack: () => void;
  onSelectCharacter: (id: string) => void;
  allCharacters: UniverseCharacter[];
  fetchCharacterWorkspace: (id: string) => Promise<CharacterWorkspaceData | null>;
}) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'identity' | 'personality' | 'narrative' | 'state' | 'knowledge' | 'relationships' | 'possessions' | 'timeline'
  >('overview');
  const [data, setData] = useState<CharacterWorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!characterId) return;
    setLoading(true);
    fetchCharacterWorkspace(characterId)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [characterId, fetchCharacterWorkspace]);

  if (!characterId || (!data && !loading)) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Ruang Tokoh & Karakter
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pilih salah satu tokoh dari daftar untuk melihat proyeksi holistik 9 dimensi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCharacters.map((c) => (
            <Card
              key={c.id}
              className="p-5 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
            >
              <div
                onClick={() => onSelectCharacter(c.id)}
                className="space-y-3"
              >
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
                  <span>Buka Ruang Kerja Tokoh</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium">
        Memuat data holistik karakter...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb / Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button kind="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Ensiklopedia</span>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-xs text-slate-500 font-bold">Ruang Kerja Tokoh:</span>
          <span className="text-xs text-slate-900 font-black">{data.identity.displayName}</span>
        </div>

        {/* Character switcher dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold hidden sm:inline">Pilih Tokoh:</span>
          <select
            value={data.id}
            onChange={(e) => onSelectCharacter(e.target.value)}
            className="clay-input px-3 py-1.5 text-xs text-slate-900 font-bold rounded-xl"
          >
            {allCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Character Card */}
      <Card className="p-6 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 border-2 border-amber-200/80 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-3xl shadow-[0_8px_20px_rgba(245,158,11,0.35),inset_0_2px_2px_rgba(255,255,255,0.7)] border-2 border-amber-200">
              {data.identity.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-2xl font-black text-slate-900">
                  {data.identity.displayName}
                </h3>
                {data.identity.nickname && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                    "{data.identity.nickname}"
                  </span>
                )}
                <StatusBadge status={data.identity.status} />
              </div>

              <p className="text-xs text-slate-600 font-semibold mt-1">
                {data.actor.role} • {data.life.occupation} • {data.identity.age || 24} Tahun
              </p>

              <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 font-medium">
                <span>📍 <strong className="text-slate-800">{data.location?.displayName || 'Lokasi Terbuka'}</strong></span>
                <span>•</span>
                <span>✨ Status: <strong className="text-slate-800">{data.currentState.vitality}</strong></span>
                <span>•</span>
                <span>🛡️ Kontinuitas: <strong className="text-emerald-700">{data.continuity.status}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200 text-right shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Suasana Hati (Mood)</div>
              <div className="text-xs font-bold text-amber-900 mt-0.5">{data.currentState.mood}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* 9 Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Ringkasan', icon: Eye },
          { id: 'identity', label: 'Profil & Fisik', icon: User },
          { id: 'personality', label: 'Kepribadian & Hidup', icon: Brain },
          { id: 'narrative', label: 'Luka & Ambisi', icon: Flame },
          { id: 'state', label: 'Kondisi & Vitalitas', icon: Activity },
          { id: 'knowledge', label: `Pengetahuan (${data.knowledge.length})`, icon: BookOpen },
          { id: 'relationships', label: `Relasi (${data.relationships.length})`, icon: Heart },
          { id: 'possessions', label: `Benda Bawaan (${data.possessions.length})`, icon: Package },
          { id: 'timeline', label: 'Garis Waktu', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-sm border border-amber-300 scale-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              <span>Esensi Karakter</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tipe Kepribadian</span>
                <span className="font-bold text-slate-800">{data.personality.personalityType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Orientasi Sosial</span>
                <span className="font-bold text-slate-800">{data.social.socialOrientation}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tujuan Utama</span>
                <span className="font-bold text-slate-800">{data.narrative.primaryGoal}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Cita-Cita Jangka Panjang</span>
                <span className="font-bold text-slate-800">{data.narrative.aspiration}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-600" />
              <span>Luka Batin & Rahasia Masa Lalu</span>
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs">
                <span className="font-bold text-rose-900 block mb-1">Luka Batin (Inner Wound):</span>
                <p className="text-rose-800">{data.narrative.innerWound || 'Belum ada luka batin tercatat.'}</p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs">
                <span className="font-bold text-amber-900 block mb-1">Rahasia Masa Lalu:</span>
                <p className="text-amber-800">{data.narrative.secretBackstory || 'Belum ada rahasia khusus.'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'identity' && (
        <Card className="p-6 space-y-6 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Biodata & Penampilan Fisik</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Usia & Kelahiran</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {data.identity.age || 24} Tahun • {data.identity.birthDate || '15 April'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Zodiak: {data.identity.zodiac || 'Aries'} • Shio: {data.identity.shio || 'Naga'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Perawakan Fisik</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{data.appearance.physicalBuild || 'Tegap dan atletis'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400">Gaya Pakaian</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{data.appearance.clothingStyle || 'Jubah petualang linen'}</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80">
            <span className="text-xs font-bold text-amber-900 block mb-1">Ciri Khas Fisik yang Mencolok:</span>
            <p className="text-xs text-amber-800 leading-relaxed">{data.appearance.distinctFeatures || 'Tidak ada tanda khusus.'}</p>
          </div>
        </Card>
      )}

      {activeTab === 'personality' && (
        <Card className="p-6 space-y-6 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Kepribadian & Gaya Hidup</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700">Sifat Utama:</span>
              <div className="flex flex-wrap gap-1.5">
                {data.personality.traits?.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700">Kelemahan Karakter (Flaws):</span>
              <div className="flex flex-wrap gap-1.5">
                {data.personality.flaws?.map((f, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1">Rutinitas Harian (Daily Pattern):</span>
              <p className="text-xs text-slate-600">{data.life.dailyRoutine || 'Berlatih di fajar hari dan menganalisis catatan di malam hari.'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1">Keahlian & Kemahiran:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {data.life.skills?.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-200/80 text-slate-800 text-xs font-medium rounded-xl">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'narrative' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Dimensi Narasi & Ambisi</h4>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1">Tujuan Pribadi Utama:</span>
              <p className="text-xs text-slate-800 font-medium">{data.narrative.primaryGoal}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1">Cita-Cita Jangka Panjang:</span>
              <p className="text-xs text-slate-800 font-medium">{data.narrative.aspiration}</p>
            </div>
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200">
              <span className="text-xs font-bold text-rose-900 block mb-1">Luka Batin (Inner Wound):</span>
              <p className="text-xs text-rose-800">{data.narrative.innerWound}</p>
            </div>
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
              <span className="text-xs font-bold text-amber-900 block mb-1">Rahasia Masa Lalu:</span>
              <p className="text-xs text-amber-800">{data.narrative.secretBackstory}</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'state' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Kondisi & Vitalitas Terkini</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Status Fisik</span>
              <p className="text-sm font-black text-emerald-950 mt-1">{data.currentState.vitality}</p>
            </div>
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800">Suasana Hati (Mood)</span>
              <p className="text-sm font-black text-amber-950 mt-1">{data.currentState.mood}</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Fakta & Pengetahuan yang Dikuasai</h4>
          {data.knowledge.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              Belum ada fakta pengetahuan terdaftar untuk tokoh ini.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.knowledge.map((k) => (
                <Card key={k.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Fakta #{k.id.slice(-4)}</span>
                    <span className="text-amber-700">Tingkat Kepastian: {Math.round(k.certainty * 100)}%</span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{k.statement}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Ikatan & Relasi Antartokoh</h4>
          {data.relationships.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              Belum ada ikatan relasi terdaftar untuk tokoh ini.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.relationships.map((r) => (
                <Card key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Terhubung Dengan:</span>
                      <h5 className="text-sm font-bold text-slate-900">{r.otherCharacterName}</h5>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-xl">
                      {r.relationshipType}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Dinamika: </span>
                    {r.dynamic}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">"{r.narrativeBasis}"</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'possessions' && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Lokasi & Benda Pusaka Bawaan</h4>
          <Card className="p-4 bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-bold text-amber-900 block mb-1">Lokasi Saat Ini:</span>
            <p className="text-xs text-slate-800">
              📍 <strong>{data.location?.displayName || 'Lokasi Terbuka'}</strong> ({data.location?.locationType || 'SETTLEMENT'})
            </p>
          </Card>

          <h5 className="text-xs font-bold text-slate-700 pt-2">Benda yang Dimiliki / Dipegang:</h5>
          {data.possessions.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-500">
              Tokoh ini belum membawa atau memiliki benda khusus saat ini.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.possessions.map((obj) => (
                <Card key={obj.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">{obj.displayName}</h5>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg">
                      {obj.objectType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{obj.isHolder ? '✋ Sedang Dipegang' : '📦 Dimiliki'}</span>
                    <span>•</span>
                    <span>Kondisi: <strong className="text-slate-700">{obj.condition}</strong></span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Riwayat Perjalanan Tokoh</h4>
          <div className="space-y-3 relative pl-6 border-l-2 border-amber-200">
            {data.timeline.map((item, idx) => (
              <div key={idx} className="relative space-y-1">
                <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-white shadow-xs" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.date}</span>
                <p className="text-xs text-slate-800 font-medium">{item.event}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
