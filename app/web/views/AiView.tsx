import React from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { ControlOverview, ProviderHealthInfo } from '../types.ts';
import { Card, StatusBadge } from '../components/UIElements.tsx';

export function AiView({
  overview,
  providerHealth,
}: {
  overview: ControlOverview;
  providerHealth: Record<string, ProviderHealthInfo>;
}) {
  const providers = overview.ai.providers;

  return (
    <div id="view-ai" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Asisten AI & Rekan Penulis
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Model kecerdasan buatan membantu mengarang dialog dan naskah narasi berdasarkan dunia cerita yang Anda bangun.
        </p>
      </div>

      {/* Core Principle Card */}
      <Card className="p-6 border-stone-800 bg-stone-950/70">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-stone-100">
              Prinsip Keaslian Alur Cerita
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
              Asisten AI hanya bertugas memberikan usulan tulisan dan narasi. Sistem studio memverifikasi setiap naskah agar tokoh tidak melakukan hal-hal yang bertentangan dengan kepribadian atau sejarah masa lalunya.
            </p>
          </div>
        </div>
      </Card>

      {/* Models List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Model Asisten yang Tersambung
          </h3>
          <StatusBadge status={overview.ai.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map(provider => {
            const health = providerHealth[provider.providerId];
            return (
              <Card key={provider.providerId} className="p-5 border-stone-800 bg-stone-950/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-violet-400/10 p-2 text-violet-300">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-stone-100">
                        {provider.providerId.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-amber-300/80 font-mono">
                        {provider.modelId}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={health?.status ?? 'HEALTHY'} />
                </div>

                <div className="mt-4 space-y-2 pt-3 border-t border-stone-800/80 text-xs text-stone-400">
                  <div className="flex justify-between">
                    <span>Kecepatan Respons:</span>
                    <span className="text-stone-200 font-medium">Tinggi (Realtime)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format Hasil Cerita:</span>
                    <span className="text-stone-200 font-medium">
                      {provider.structuredOutput ? 'Terstruktur & Rapi' : 'Standar'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status Koneksi:</span>
                    <span className="text-emerald-400 font-medium">Aktif Siap Pakai</span>
                  </div>
                </div>
              </Card>
            );
          })}

          {providers.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-500">
              Belum ada model AI eksternal yang dihubungkan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
