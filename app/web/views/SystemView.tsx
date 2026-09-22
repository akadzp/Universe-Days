import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Cpu,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ComponentStatus, ControlOverview, DeploymentReadiness } from '../types.ts';
import { Card, StatusBadge, ModeBadge } from '../components/UIElements.tsx';
import { componentMap } from '../translations.ts';

export function SystemView({
  overview,
  readiness,
  isSandbox,
}: {
  overview: ControlOverview;
  readiness: DeploymentReadiness | null;
  isSandbox: boolean;
}) {
  const components = overview.components;

  return (
    <div id="view-system" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Keandalan & Cadangan Studio
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Sistem pengawasan terpadu untuk memastikan seluruh dokumen, karakter, dan naskah cerita terlindungi dengan aman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Main Health Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 border-2 border-emerald-200 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                Kondisi Studio: Sangat Baik & Terlindungi
              </div>
              <div className="text-xs text-slate-600">
                Semua sub-sistem beroperasi normal dan siap memproduksi cerita.
              </div>
            </div>
          </div>

          <StatusBadge status="HEALTHY" />
        </div>
      </Card>

      {/* Components Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">
          Sub-Sistem Studio Cerita
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {components.map((comp: ComponentStatus) => {
            const mapped = componentMap[comp.id];
            const name = mapped?.name ?? comp.name;
            const desc = mapped?.simpleDetail ?? comp.detail;

            return (
              <Card key={comp.id} className="p-5 flex flex-col justify-between bg-white">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{name}</span>
                    <StatusBadge status={comp.status} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[2.5rem]">
                    {desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
