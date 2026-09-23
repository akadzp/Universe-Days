import React from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Cpu,
} from 'lucide-react';
import { ControlOverview, ProviderHealthInfo } from '../types.ts';
import { Card, StatusBadge, ModeBadge, Button } from '../components/UIElements.tsx';

export function AiView({
  overview,
  providerHealth,
  isSandbox,
}: {
  overview: ControlOverview;
  providerHealth: Record<string, ProviderHealthInfo>;
  isSandbox: boolean;
}) {
  const providers = overview.ai.providers;

  return (
    <div id="view-ai" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Asisten AI & Rekan Penulis
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Model kecerdasan buatan membantu mengarang dialog, adegan, dan narasi berdasarkan dunia cerita yang Anda bangun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Core Principle Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-200 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Prinsip Keaslian & Konsistensi Alur Cerita
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Asisten AI bertindak sebagai rekan kreatif. Sistem studio memeriksa setiap usulan naskah agar tokoh tidak melakukan hal-hal yang bertentangan dengan kepribadian atau sejarah masa lalunya.
            </p>
          </div>
        </div>
      </Card>

      {/* Models List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Model Asisten yang Tersambung
          </h3>
          <StatusBadge status={overview.ai.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map(provider => {
            const health = providerHealth[provider.providerId];
            return (
              <Card key={provider.providerId} className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {provider.providerId.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-amber-700 font-mono font-semibold">
                        {provider.modelId}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={health?.status ?? 'HEALTHY'} />
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-200 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Kecepatan Respons:</span>
                    <span className="text-slate-900 font-bold">Tinggi (Realtime)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format Hasil Cerita:</span>
                    <span className="text-slate-900 font-bold">
                      {provider.structuredOutput ? 'Terstruktur & Rapi' : 'Standar'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status Koneksi:</span>
                    <span className="text-emerald-700 font-bold">Aktif Siap Pakai</span>
                  </div>
                </div>
              </Card>
            );
          })}

          {providers.length === 0 && (
            <div className="col-span-full clay-inset p-8 text-center text-xs text-slate-600">
              Belum ada model eksternal terhubung. Asisten AI berjalan dalam mode simulasi terstandar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
