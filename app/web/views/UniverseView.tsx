import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Layers,
  FolderArchive,
  TestTube,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  MapPin,
  Sparkles,
  ShieldAlert,
  Plus,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { ControlOverview, UniverseStorage, UniverseDetails } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge, InfoCallout } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  getFriendlyScope,
  getFriendlyLocationType,
  getFriendlyLocationAccessibility,
  getFriendlyObjectType,
  getFriendlyObjectCondition,
  getFriendlyPossessionStatus,
} from '../translations.ts';

export function UniverseView({
  overview,
  storage,
  onLoadCurrentUniverse,
  onLoadSandbox,
  onUnmount,
  onNavigateToSandbox,
  busy,
}: {
  overview: ControlOverview;
  storage: UniverseStorage | null;
  onLoadCurrentUniverse: () => Promise<void>;
  onLoadSandbox: () => Promise<void>;
  onUnmount: () => Promise<void>;
  onNavigateToSandbox: () => void;
  busy: boolean;
}) {
  const isMounted = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const isSandbox = overview.universe.universeScope === 'SANDBOX';

  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'objects' | 'mysteries'>('characters');
  const [details, setDetails] = useState<UniverseDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch universe details when mounted
  useEffect(() => {
    if (isMounted) {
      setLoadingDetails(true);
      fetch('/api/control/universe/details')
        .then(async res => {
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return await res.json();
          }
          return null;
        })
        .then(data => {
          if (data) {
            setDetails(data);
          }
          setLoadingDetails(false);
        })
        .catch(() => setLoadingDetails(false));
    } else {
      setDetails(null);
    }
  }, [isMounted, overview.universe.universeId]);

  return (
    <div id="view-universe" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Ensiklopedia Dunia Cerita
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Panggung utama semesta cerita Anda. Memuat seluruh tokoh, wilayah, benda pusaka, dan misteri yang sedang berlangsung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Active Story Card */}
      <Card variant={isSandbox ? 'sandbox' : 'production'} className="p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-600">Status Dunia:</span>
              <StatusBadge status={overview.universe.status} />
              {isMounted && (
                <span className="inline-flex items-center rounded-full bg-white/90 border border-slate-200 px-3 py-0.5 text-xs font-semibold text-slate-700 shadow-sm">
                  {getFriendlyScope(overview.universe.universeScope)}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {overview.universe.universeId
                  ? overview.universe.universeId.replace(/_/g, ' ')
                  : 'Belum Ada Cerita yang Dibuka'}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                {isMounted
                  ? 'Dunia cerita ini sedang aktif menjadi acuan latar, kepribadian tokoh, dan konsistensi naskah yang ditulis asisten AI.'
                  : 'Buka dunia cerita yang tersimpan agar asisten AI memiliki konteks lengkap sebelum mulai menulis.'}
              </p>
            </div>

            {isMounted && (
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span>Tanggal Alur: <strong className="text-slate-900 font-bold">{formatFriendlyDate(universeDate)}</strong></span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <Layers className="h-4 w-4 text-sky-500" />
                  <span>Kategori: <strong className="text-slate-900 font-bold">{isSandbox ? 'Uji Coba Draf (Sandbox)' : 'Arsip Resmi (Canon)'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isMounted ? (
              <Button
                id="universe-load-btn"
                kind="primary"
                size="md"
                onClick={() => void onLoadCurrentUniverse()}
                disabled={busy}
              >
                <BookOpen className="h-4 w-4" />
                Buka Cerita Terakhir
              </Button>
            ) : (
              <>
                {!isSandbox && (
                  <Button
                    id="universe-open-sandbox-btn"
                    kind="indigo"
                    size="md"
                    onClick={onNavigateToSandbox}
                    disabled={busy}
                  >
                    <TestTube className="h-4 w-4" />
                    Uji di Lab Sandbox
                  </Button>
                )}
                <Button
                  id="universe-unmount-btn"
                  kind="danger"
                  size="md"
                  onClick={() => void onUnmount()}
                  disabled={busy}
                >
                  Tutup Cerita Sementara
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Ensiklopedia Sub-Tabs if Mounted */}
      {isMounted && (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-300/60">
            <button
              type="button"
              onClick={() => setActiveTab('characters')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4 text-amber-500" />
              <span>Tokoh & Karakter ({details?.characters.length ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'locations'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span>Wilayah & Peta ({details?.locations.length ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objects')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'objects'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>Benda & Pusaka ({details?.objects.length ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mysteries')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'mysteries'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Misteri & Kondisi Terbuka ({details?.unresolvedConditions.length ?? 0})</span>
            </button>
          </div>

          {/* Tab 1: Characters */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Daftar Tokoh Cerita</h3>
                  <p className="text-xs text-slate-600">Tokoh-tokoh yang hidup dan berperan dalam alur kisah Anda.</p>
                </div>
                {isSandbox && (
                  <Button size="sm" kind="indigo" onClick={onNavigateToSandbox}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Tokoh di Sandbox
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {details?.characters.map(char => (
                  <Card key={char.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
                          {char.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <StatusBadge status={char.alive ? 'ALIVE' : 'DECEASED'} customLabel={char.alive ? 'Hidup' : 'Gugur'} />
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{char.displayName}</h4>
                      <div className="text-[11px] font-semibold text-amber-700 mb-2">{char.role}</div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">
                        {char.background || 'Karakter utama yang berpetualang dalam dunia ini.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex flex-wrap gap-1">
                        {char.traits.map((trait, idx) => (
                          <span key={idx} className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}

                {(!details?.characters || details.characters.length === 0) && (
                  <div className="col-span-full clay-inset p-8 text-center text-slate-600 text-xs">
                    Belum ada tokoh terdaftar dalam dunia cerita ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Locations */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Peta & Wilayah Dunia</h3>
                  <p className="text-xs text-slate-600">Lokasi-lokasi penting tempat peristiwa dan kisah berlangsung.</p>
                </div>
                {isSandbox && (
                  <Button size="sm" kind="indigo" onClick={onNavigateToSandbox}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Lokasi di Sandbox
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {details?.locations.map(loc => (
                  <Card key={loc.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {getFriendlyLocationAccessibility(loc.accessibilityStatus)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{loc.displayName}</h4>
                      <div className="text-[11px] font-semibold text-emerald-700 mb-2">
                        {getFriendlyLocationType(loc.locationType)}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {loc.parentLocationRef
                          ? `Bagian dari wilayah: ${loc.parentLocationRef.replace(/_/g, ' ')}`
                          : 'Wilayah utama dalam semesta cerita.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                      Sub-lokasi: <strong className="text-slate-800">{loc.containedLocationRefs?.length ?? 0} area</strong>
                    </div>
                  </Card>
                ))}

                {(!details?.locations || details.locations.length === 0) && (
                  <div className="col-span-full clay-inset p-8 text-center text-slate-600 text-xs">
                    Belum ada lokasi terdaftar dalam dunia cerita ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Objects */}
          {activeTab === 'objects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Benda & Artefak Pusaka</h3>
                  <p className="text-xs text-slate-600">Barang peninggalan, senjata legenda, dan benda berharga dalam cerita.</p>
                </div>
                {isSandbox && (
                  <Button size="sm" kind="indigo" onClick={onNavigateToSandbox}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Benda di Sandbox
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {details?.objects.map(obj => (
                  <Card key={obj.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-800 font-bold">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          {getFriendlyPossessionStatus(obj.possessionStatus)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{obj.displayName}</h4>
                      <div className="text-[11px] font-semibold text-violet-700 mb-2">
                        {getFriendlyObjectType(obj.objectType)}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Kondisi: <strong className="text-slate-800 font-semibold">{getFriendlyObjectCondition(obj.condition)}</strong>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                      Pemilik: <strong className="text-slate-800">{obj.holderActorRef?.replace(/_/g, ' ') ?? 'Belum dimiliki'}</strong>
                    </div>
                  </Card>
                ))}

                {(!details?.objects || details.objects.length === 0) && (
                  <div className="col-span-full clay-inset p-8 text-center text-slate-600 text-xs">
                    Belum ada benda atau artefak terdaftar dalam dunia cerita ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Mysteries */}
          {activeTab === 'mysteries' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Misteri & Peristiwa yang Belum Usai</h3>
                <p className="text-xs text-slate-600">Ketegangan alur cerita yang sedang berlangsung dan membutuhkan kelanjutan bab cerita.</p>
              </div>

              <div className="space-y-3">
                {details?.unresolvedConditions.map(uc => (
                  <Card key={uc.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{uc.title}</h4>
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Tingkat Ketegangan: {uc.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{uc.description}</p>
                      </div>
                      <StatusBadge status={uc.status} />
                    </div>
                  </Card>
                ))}

                {(!details?.unresolvedConditions || details.unresolvedConditions.length === 0) && (
                  <div className="clay-inset p-8 text-center text-slate-600 text-xs">
                    Semua peristiwa saat ini berjalan damai tanpa ketegangan misteri yang terbuka.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Storage & Archive Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 mb-3">
            <FolderArchive className="h-4 w-4 text-amber-500" />
            <span>Koleksi Arsip Dokumen Cerita</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {storage?.storedUniverseIds?.length ?? overview.universe.storedCount ?? 1} Dokumen Tersimpan
          </div>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Semua naskah, karakter, dan peristiwa tersimpan aman secara permanen di komputer lokal Anda.
          </p>
        </Card>

        {/* Sandbox Quick Access */}
        <Card variant="sandbox" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
              <TestTube className="h-4 w-4 text-indigo-600" />
              <span>Laboratorium Eksperimen & Draf Bebas</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Ingin mencoba ide alur baru atau memajukan hari cerita tanpa memengaruhi arsip resmi? Masuk ke Laboratorium Sandbox.
          </p>
          <div className="mt-4">
            <Button
              id="universe-sandbox-btn"
              size="sm"
              kind="indigo"
              onClick={onNavigateToSandbox}
              disabled={busy}
            >
              Buka Laboratorium Sandbox
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
