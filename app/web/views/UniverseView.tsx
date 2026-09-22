import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Layers,
  FolderArchive,
  TestTube,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ControlOverview, UniverseStorage } from '../types.ts';
import { Card, Button, StatusBadge, InfoCallout } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  getFriendlyScope,
} from '../translations.ts';

export function UniverseView({
  overview,
  storage,
  onLoadCurrentUniverse,
  onLoadSandbox,
  onUnmount,
  busy,
}: {
  overview: ControlOverview;
  storage: UniverseStorage | null;
  onLoadCurrentUniverse: () => Promise<void>;
  onLoadSandbox: () => Promise<void>;
  onUnmount: () => Promise<void>;
  busy: boolean;
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const isMounted = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const isSandbox = overview.universe.universeScope === 'SANDBOX';

  return (
    <div id="view-universe" className="space-y-6">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Dunia Cerita (Universe)
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Dunia Cerita adalah panggung utama kisah Anda. Memuat latar, karakter, fakta sejarah, dan tanggal alur cerita yang sedang berjalan.
        </p>
      </div>

      {/* Active Story Card */}
      <Card className="p-6 sm:p-7 border-stone-800 bg-stone-950/70">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-stone-400">Status Dunia:</span>
              <StatusBadge status={overview.universe.status} />
              {isMounted && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                  isSandbox
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                    : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                }`}>
                  {getFriendlyScope(overview.universe.universeScope)}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-stone-100">
                {overview.universe.universeId
                  ? overview.universe.universeId.replace(/_/g, ' ')
                  : 'Belum Ada Cerita yang Dibuka'}
              </h3>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed max-w-xl">
                {isMounted
                  ? 'Dunia cerita ini sedang aktif menjadi acuan latar, karakter, dan konsistensi bagi setiap naskah yang dibuat.'
                  : 'Buka dunia cerita yang tersimpan agar asisten AI memiliki konteks lengkap sebelum mulai menulis.'}
              </p>
            </div>

            {isMounted && (
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-stone-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span>Tanggal Alur: <strong className="text-stone-100 font-semibold">{formatFriendlyDate(universeDate)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-sky-400" />
                  <span>Kategori: <strong className="text-stone-100 font-semibold">{isSandbox ? 'Uji Coba Draf' : 'Arsip Resmi (Canon)'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            {!isMounted ? (
              <Button
                id="universe-load-btn"
                kind="primary"
                onClick={() => void onLoadCurrentUniverse()}
                disabled={busy}
              >
                <BookOpen className="h-4 w-4" />
                Buka Cerita Terakhir
              </Button>
            ) : (
              <Button
                id="universe-unmount-btn"
                kind="danger"
                onClick={() => void onUnmount()}
                disabled={busy}
              >
                Tutup Cerita Sementara
              </Button>
            )}
          </div>
        </div>

        {/* Story state explanation */}
        <div className="mt-6 rounded-xl border border-stone-800/80 bg-stone-900/40 p-4 text-xs text-stone-400 leading-relaxed">
          <div className="flex items-center gap-2 font-semibold text-stone-200 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Penyimpanan Aman Terjamin</span>
          </div>
          Menutup cerita sementara tidak akan menghapus data ataupun naskah yang pernah dibuat. Semua riwayat tersimpan aman di berkas arsip lokal Anda.
        </div>
      </Card>

      {/* Storage & Archive Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-stone-300 mb-3">
            <FolderArchive className="h-4 w-4 text-amber-400" />
            <span>Koleksi Arsip Cerita</span>
          </div>
          <div className="text-2xl font-bold text-stone-100">
            {storage?.storedUniverseIds?.length ?? overview.universe.storedCount ?? 1} Dokumen
          </div>
          <p className="mt-1 text-xs text-stone-400 leading-relaxed">
            Koleksi semesta dan snapshot cerita yang tersimpan dalam arsip lokal Anda.
          </p>
        </Card>

        {/* Sandbox / Playground info card */}
        <Card className="p-5 border-amber-400/20 bg-amber-400/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <TestTube className="h-4 w-4 text-amber-300" />
              <span>Ruang Draf & Eksperimen (Sandbox)</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-stone-400">
            Ingin bereksperimen dengan alur cerita tanpa takut merusak arsip cerita resmi Anda? Anda dapat membuka Ruang Draf Bebas.
          </p>
          <div className="mt-4">
            <Button
              id="universe-sandbox-btn"
              size="sm"
              kind="secondary"
              onClick={() => void onLoadSandbox()}
              disabled={busy}
            >
              Buka Ruang Draf Bebas
            </Button>
          </div>
        </Card>
      </div>

      {/* Advanced Technical Details Collapsible */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-300 transition"
        >
          {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showTechnicalDetails ? 'Sembunyikan Informasi Teknis Sistem' : 'Tampilkan Informasi Teknis Sistem'}
        </button>

        {showTechnicalDetails && (
          <div className="mt-3 rounded-xl border border-stone-800 bg-stone-950/80 p-4 text-[11px] font-mono text-stone-400 space-y-2">
            <div><span className="text-stone-500">Universe ID Asli:</span> {overview.universe.universeId ?? 'null'}</div>
            <div><span className="text-stone-500">Scope Internal:</span> {overview.universe.universeScope ?? 'null'}</div>
            <div><span className="text-stone-500">Direktori Penyimpanan:</span> {storage?.storageRootDir ?? overview.universe.storageRoot ?? '-'}</div>
            {overview.universe.startupLoadError && (
              <div className="text-rose-400">
                <span className="text-stone-500">Pesan Kesalahan:</span> {overview.universe.startupLoadError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
