import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  Bot,
  CalendarCheck,
  FileText,
  DollarSign,
  Activity,
  Layers,
  Cpu,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Card, StatusBadge, Button, InfoCallout } from '../components/UIElements.tsx';
import type {
  ControlOverview,
  PageDefinition,
  ScheduleDefinition,
  DeploymentReadiness,
  UsageSummary,
} from '../types.ts';

export function StudioCenterView({
  overview,
  pages,
  onTogglePage,
  onRefresh,
  readiness,
  usage,
}: {
  overview: ControlOverview | null;
  pages: PageDefinition[];
  onTogglePage: (pageId: string) => Promise<void>;
  onRefresh: () => void;
  readiness?: DeploymentReadiness | null;
  usage?: UsageSummary | null;
}) {
  const [activeTab, setActiveTab] = useState<'system' | 'ai' | 'pages' | 'scheduler' | 'usage'>('system');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Pusat Kendali Operasional Studio
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manajemen keandalan sistem, koneksi model AI, format halaman, dan efisiensi produksi.
          </p>
        </div>

        <Button kind="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          <span>Segarkan Status</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'system', label: 'Kesiapan Sistem', icon: ShieldCheck },
          { id: 'ai', label: `Model AI (${overview?.ai.providers.length || 0})`, icon: Bot },
          { id: 'pages', label: `Format Halaman (${pages.length})`, icon: FileText },
          { id: 'scheduler', label: 'Penjadwal Otomatis', icon: CalendarCheck },
          { id: 'usage', label: 'Penggunaan Token', icon: DollarSign },
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

      {/* System Health */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-emerald-50/50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Status Runtime</span>
              <p className="text-base font-black text-emerald-950 mt-1">{overview?.runtime.status || 'INITIALIZED'}</p>
            </Card>
            <Card className="p-4 bg-amber-50/50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-800">Arsitektur Fase</span>
              <p className="text-base font-black text-amber-950 mt-1">Fase 34 (Production Root)</p>
            </Card>
            <Card className="p-4 bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-600">Penyimpanan Aman</span>
              <p className="text-base font-black text-slate-900 mt-1">Atomik & Persisten</p>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Komponen Subsistem Mesin</h3>
            <div className="divide-y divide-slate-100">
              {overview?.components.map((comp) => (
                <div key={comp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{comp.name}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{comp.detail}</p>
                  </div>
                  <StatusBadge status={comp.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* AI Models */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Model AI Terhubung</h3>
            <p className="text-xs text-slate-500">
              Mesin penulisan mendukung multi-model secara netral (Gemini, Claude, OpenAI) dengan perutean pintar.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {overview?.ai.providers.map((p, idx) => (
                <Card key={idx} className="p-4 space-y-2 bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{p.modelId}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg">
                      {p.tier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Provider: <strong className="text-slate-700">{p.providerId}</strong> • Output Terstruktur: {p.structuredOutput ? 'Aktif' : 'Standar'}
                  </div>
                </Card>
              ))}
              {(!overview?.ai.providers || overview.ai.providers.length === 0) && (
                <div className="p-6 text-center text-xs text-slate-400 col-span-2">
                  Menggunakan generator internal deterministik.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Page Catalog */}
      {activeTab === 'pages' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h3 className="text-sm font-black text-slate-900">Katalog Format Halaman Cerita</h3>
          <div className="space-y-3">
            {pages.map((p) => (
              <div
                key={p.pageDefinitionId}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{p.pageKey}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
                      {p.pageScope}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>Prioritas: {p.priority}</span>
                    <span>•</span>
                    <span>Tag: {p.tags.join(', ')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePage(p.pageDefinitionId)}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <StatusBadge status={p.status} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scheduler */}
      {activeTab === 'scheduler' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h3 className="text-sm font-black text-slate-900">Penjadwal Penerbitan Otomatis</h3>
          <p className="text-xs text-slate-500">
            Penjadwalan otomatis mengeksekusi kompilasi halaman cerita harian secara terjadwal.
          </p>
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs text-amber-900">
            ✅ Penjadwal beroperasi dalam status siap dengan pemantauan otomatis.
          </div>
        </Card>
      )}

      {/* Usage & Tokens */}
      {activeTab === 'usage' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h3 className="text-sm font-black text-slate-900">Pemantauan Alokasi Token & Biaya</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Input Token</span>
              <p className="text-lg font-black text-slate-900 mt-1">{usage?.inputTokens || 0}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Output Token</span>
              <p className="text-lg font-black text-slate-900 mt-1">{usage?.outputTokens || 0}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Efisiensi Biaya</span>
              <p className="text-lg font-black text-emerald-950 mt-1">${(usage?.cost || 0).toFixed(4)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
