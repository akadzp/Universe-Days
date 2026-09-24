import React from 'react';
import type { NavTab } from '../types';
export type { NavTab };
import {
  ShieldCheck,
  FlaskConical,
  Sparkles,
  Layers
} from 'lucide-react';

interface SidebarProps {
  mode: 'PRODUCTION' | 'SANDBOX';
  onToggleMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  onToggleMode
}) => {
  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-neutral-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-100 tracking-wide">POCER</h1>
              <p className="text-[11px] text-neutral-400 font-mono">Universe Days</p>
            </div>
          </div>
        </div>

        {/* Contextual Utilities Area (README Bagian 29) */}
        {/* Catatan: Sidebar bukan duplikasi dari lima workspace utama dan tidak mengarang fitur. */}
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            <Layers className="w-3.5 h-3.5" />
            <span>Utilitas Sistem</span>
          </div>
          
          <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed space-y-1.5">
            <span className="font-semibold text-neutral-300 block">Area Kontekstual</span>
            <p className="text-neutral-500 text-[10.5px]">
              Sesuai baseline (Bagian 29), navigasi utama berada pada 5 slot kanonikal di bilah atas.
              Utilitas sidebar tambahan belum ditentukan oleh keputusan produk.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switch at the Very Bottom of Sidebar (README Bagian 30 & 31) */}
      <div className="p-3 border-t border-neutral-800/80 space-y-2.5">
        <div className="rounded-xl p-3 bg-neutral-900/70 border border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Mode Sistem
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                mode === 'PRODUCTION'
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}
            >
              {mode === 'PRODUCTION' ? 'MODE UTAMA' : 'RUANG UJI'}
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 leading-relaxed">
            {mode === 'PRODUCTION' ? (
              <p>
                <strong className="text-neutral-200">Mode Utama:</strong> Bekerja langsung dengan
                data semesta resmi (Canon) yang tervalidasi dan tersimpan permanen.
              </p>
            ) : (
              <p>
                <strong className="text-amber-300">Ruang Uji (Sandbox):</strong> Eksplorasi aman.
                Operasi pengujian tidak menggantikan data utama semesta secara diam-diam.
              </p>
            )}
          </div>

          <button
            onClick={onToggleMode}
            className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              mode === 'PRODUCTION'
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                : 'bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold border-amber-500'
            }`}
          >
            {mode === 'PRODUCTION' ? (
              <>
                <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                <span>Pindah ke Ruang Uji</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-950" />
                <span>Kembali ke Mode Utama</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
