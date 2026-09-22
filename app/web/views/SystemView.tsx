import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Database,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DeploymentReadiness, ControlOverview } from '../types.ts';
import { Card, StatusBadge } from '../components/UIElements.tsx';
import {
  getFriendlyCheckName,
  componentMap,
} from '../translations.ts';

export function SystemView({
  readiness,
  overview,
}: {
  readiness: DeploymentReadiness | null;
  overview: ControlOverview | null;
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const checks = readiness?.checks ?? {};
  const passedChecksCount = Object.values(checks).filter(Boolean).length;
  const totalChecksCount = Object.keys(checks).length;

  const components = overview?.components ?? [];

  return (
    <div id="view-system" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Kesehatan & Keandalan Studio
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Pemeriksaan menyeluruh untuk memastikan data cerita, aturan alur, dan penyimpanan naskah selalu dalam keadaan optimal.
        </p>
      </div>

      {/* Primary Readiness Card */}
      <Card className="p-6 border-stone-800 bg-stone-950/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold text-stone-100">
                Pemeriksaan Integritas Sistem
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                {passedChecksCount} dari {totalChecksCount} pengujian mutu terpenuhi dengan sempurna.
              </div>
            </div>
          </div>
          <StatusBadge status={readiness?.status ?? 'READY'} />
        </div>
      </Card>

      {/* System Checks Grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          Daftar Jaminan Kualitas
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(checks).map(([key, passed]) => (
            <Card
              key={key}
              className="p-4 flex items-center justify-between border-stone-800 bg-stone-950/70"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`h-4 w-4 ${passed ? 'text-emerald-400' : 'text-stone-500'}`} />
                <span className="text-xs font-medium text-stone-200">
                  {getFriendlyCheckName(key)}
                </span>
              </div>
              <StatusBadge status={passed ? 'READY' : 'UNREADY'} />
            </Card>
          ))}
        </div>
      </div>

      {/* Component Services with Friendly Descriptions */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          Layanan Pendukung Studio
        </h3>
        <div className="space-y-2.5">
          {components.map(comp => {
            const mapped = componentMap[comp.id];
            return (
              <Card
                key={comp.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-stone-800 bg-stone-950/60"
              >
                <div>
                  <div className="text-xs font-semibold text-stone-200">
                    {mapped?.name ?? comp.name}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {mapped?.simpleDetail ?? comp.detail}
                  </div>
                </div>
                <StatusBadge status={comp.status} />
              </Card>
            );
          })}
        </div>
      </div>

      {/* Important Creative Rules */}
      <Card className="p-6 border-stone-800 bg-stone-950/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-3">
          <Lock className="h-4 w-4" />
          <span>Aturan Keamanan Data Cerita</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 text-xs text-stone-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-amber-400">•</span>
            <span>Naskah dan karakter tidak akan ditimpa tanpa konfirmasi pengguna.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">•</span>
            <span>Semua peristiwa disimpan dalam arsip berkas lokal yang tahan gangguan.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">•</span>
            <span>Asisten AI dilarang mengubah fakta cerita secara sepihak.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">•</span>
            <span>Jadwal penerbitan selalu mengacu pada kronologi waktu cerita aktif.</span>
          </div>
        </div>
      </Card>

      {/* Optional Technical Subsystem details for advanced users */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-300 transition"
        >
          {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showTechnicalDetails ? 'Sembunyikan Jalur Penyimpanan Teknis' : 'Tampilkan Jalur Penyimpanan Teknis'}
        </button>

        {showTechnicalDetails && readiness?.subsystems && (
          <div className="mt-3 space-y-2 rounded-xl border border-stone-800 bg-stone-950 p-4 font-mono text-[11px] text-stone-400">
            {Object.entries(readiness.subsystems).map(([subName, sub]) => (
              <div key={subName} className="flex justify-between py-1 border-b border-stone-900 last:border-0">
                <span className="text-stone-500">{subName}:</span>
                <span className="text-stone-300">{sub.detail ?? sub.rootDir ?? sub.jobStoreRoot ?? sub.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
