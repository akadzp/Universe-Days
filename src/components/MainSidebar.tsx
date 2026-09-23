import React, { useState } from 'react';
import type { ActiveView, ReadinessReport, UniverseData } from '../types.ts';
import {
  Scale,
  Cpu,
  Clock,
  Activity,
  Database,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  Layers,
  Sparkles,
  X,
  PanelLeftClose
} from 'lucide-react';

interface MainSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  readiness: ReadinessReport | null;
  universe: UniverseData | null;
  productionRunsCount: number;
}

export function MainSidebar({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  readiness,
  universe,
  productionRunsCount
}: MainSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isOpen) {
    return null;
  }

  const MENU_ITEMS = [
    {
      id: 'tata_kelola' as const,
      title: 'Tata Kelola & Aturan',
      subtitle: 'Konstitusi, Truth Levels & Single Home',
      icon: Scale,
      badge: 'Canon Rules',
      badgeColor: 'text-indigo-400 bg-indigo-950/80 border-indigo-800'
    },
    {
      id: 'mesin_produksi' as const,
      title: 'Mesin Produksi',
      subtitle: '7-Stage Deterministic Pipeline',
      icon: Cpu,
      badge: `${productionRunsCount} Runs`,
      badgeColor: 'text-purple-400 bg-purple-950/80 border-purple-800'
    },
    {
      id: 'waktu_semesta' as const,
      title: 'Kronologi Waktu',
      subtitle: 'Universe Clock & Temporal Scope',
      icon: Clock,
      badge: universe?.universeDate || '-',
      badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800'
    },
    {
      id: 'diagnostik' as const,
      title: 'Diagnostik Mesin',
      subtitle: 'Status 7 Subsistem & Hardening',
      icon: Activity,
      badge: readiness?.status || 'UNKNOWN',
      badgeColor:
        readiness?.status === 'READY'
          ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
          : 'text-amber-400 bg-amber-950/80 border-amber-800'
    },
    {
      id: 'instance_semesta' as const,
      title: 'Snapshot Semesta',
      subtitle: 'Penyimpanan Instance & Raw State',
      icon: Database,
      badge: universe?.universeId || '-',
      badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-800'
    },
    {
      id: 'audit_ledger' as const,
      title: 'Audit & Provenance',
      subtitle: 'Buku Catatan Revisi & Mutasi',
      icon: FileCheck,
      badge: 'Immutable',
      badgeColor: 'text-neutral-400 bg-neutral-900 border-neutral-700'
    }
  ];

  return (
    <aside
      className={`border-r border-neutral-800 bg-neutral-950/95 backdrop-blur transition-all duration-300 flex flex-col shrink-0 z-30 ${
        isCollapsed ? 'w-16' : 'w-64 lg:w-72'
      }`}
    >
      {/* Sidebar Header with Close and Collapse Controls */}
      <div className="p-3 border-b border-neutral-800/80 flex items-center justify-between gap-2">
        {!isCollapsed ? (
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1.5 truncate">
              <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>Sistem Utama Lain</span>
            </span>
            <p className="text-[11px] text-neutral-500 leading-tight truncate">
              Pusat kendali & tata kelola
            </p>
          </div>
        ) : null}

        <div className={`flex items-center gap-1 ${isCollapsed ? 'mx-auto flex-col' : ''}`}>
          {/* Collapse/Expand width button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title={isCollapsed ? 'Lebarkan Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Close Sidebar button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/60 border border-transparent hover:border-rose-800/80 transition-colors flex items-center gap-1"
            title="Tutup Sidebar (Sembunyikan)"
          >
            <X className="w-4 h-4" />
            {!isCollapsed && <span className="text-[11px] font-mono hidden sm:inline">Tutup</span>}
          </button>
        </div>
      </div>

      {/* Menu List */}
      <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full text-left rounded-xl transition-all flex items-center gap-3 ${
                isCollapsed ? 'p-3 justify-center' : 'p-3'
              } ${
                isActive
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
              }`}
              title={isCollapsed ? `${item.title}: ${item.subtitle}` : undefined}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate text-neutral-200">
                      {item.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phase 34 Hardened</span>
          </span>
          <button
            onClick={onClose}
            className="text-[10px] text-neutral-400 hover:text-neutral-200 hover:underline"
          >
            Tutup Sidebar ✕
          </button>
        </div>
      )}
    </aside>
  );
}
