import React, { useState } from 'react';
import type { UniverseData } from '../types.ts';
import {
  History,
  FileCheck,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  Clock,
  ArrowRight,
  Database
} from 'lucide-react';
import { TruthBadge } from './StatusBadges.tsx';

interface AuditLedgerViewProps {
  universe: UniverseData | null;
}

export function AuditLedgerView({ universe }: AuditLedgerViewProps) {
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect provenance items across all entities
  const items: Array<{
    id: string;
    entityType: string;
    displayName: string;
    domainId: string;
    ownerSystem: string;
    authorityLevel: string;
    validationStatus: string;
    revision: string;
    recordedTimestamp: number;
    effectiveTime?: string;
    revisionsCount: number;
  }> = [];

  const addEntity = (entity: any, type: string, nameField = 'displayName') => {
    if (!entity) return;
    const id = entity.identity?.id || entity[Object.keys(entity).find(k => k.endsWith('Id')) || 'id'] || 'UNKNOWN';
    const name = entity.identity?.[nameField] || entity.objectName || entity.title || id;
    const prov = entity.provenance || {};
    const hist = entity.history || {};

    items.push({
      id,
      entityType: type,
      displayName: name,
      domainId: prov.domainId || type,
      ownerSystem: prov.ownerSystem || '-',
      authorityLevel: prov.authorityLevel || 'CANON',
      validationStatus: prov.validationStatus || 'VALID',
      revision: prov.revision || (hist.currentRevision ? `REV_${hist.currentRevision}` : '-'),
      recordedTimestamp: prov.recordedTimestamp || 0,
      effectiveTime: entity.temporalValidity?.effectiveFrom,
      revisionsCount: hist.revisions?.length || hist.currentRevision || 1
    });
  };

  Object.values(universe?.characters || {}).forEach(e => addEntity(e, 'CHARACTER'));
  Object.values(universe?.locations || {}).forEach(e => addEntity(e, 'LOCATION'));
  Object.values(universe?.objects || {}).forEach(e => addEntity(e, 'OBJECT'));
  Object.values(universe?.relationships || {}).forEach(e => addEntity(e, 'RELATIONSHIP'));
  Object.values(universe?.knowledge || {}).forEach(e => addEntity(e, 'KNOWLEDGE'));
  Object.values(universe?.states || {}).forEach(e => addEntity(e, 'STATE'));
  Object.values(universe?.events || {}).forEach(e => addEntity(e, 'EVENT'));
  Object.values(universe?.processes || {}).forEach(e => addEntity(e, 'PROCESS'));
  Object.values(universe?.unresolvedConditions || {}).forEach(e => addEntity(e, 'UNRESOLVED_CONDITION'));

  const filteredItems = items.filter(item => {
    if (domainFilter !== 'ALL' && item.domainId !== domainFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q) ||
        item.ownerSystem.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const domains = ['ALL', 'CHARACTER', 'LOCATION', 'OBJECT', 'RELATIONSHIP', 'KNOWLEDGE', 'STATE', 'ENGINE', 'DAILY_UNIVERSE'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            SISTEM UTAMA: AUDIT & PROVENANCE
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            IMMUTABLE REVISION LEDGER
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
          Buku Catatan Audit, Provenance & Riwayat Revisi
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
          Arsip jejak audit seluruh entitas semesta dengan pelacakan sistem pemilik (ownerSystem), tingkat otoritas (authorityLevel), dan riwayat revisi deterministik.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari ID entitas, nama, atau owner system..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors ${
                domainFilter === d
                  ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-500 uppercase text-[10px]">
                <th className="py-3 px-4">Entity ID & Nama</th>
                <th className="py-3 px-3">Domain</th>
                <th className="py-3 px-3">Owner System</th>
                <th className="py-3 px-3">Authority</th>
                <th className="py-3 px-3">Revision</th>
                <th className="py-3 px-3">Effective Time</th>
                <th className="py-3 px-4 text-right">Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Tidak ada entitas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-100">{item.displayName}</div>
                      <div className="text-[10px] text-neutral-500">{item.id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                        {item.domainId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-400">{item.ownerSystem}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {item.authorityLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-neutral-200">
                      {item.revision} ({item.revisionsCount} rev)
                    </td>
                    <td className="py-3 px-3 text-neutral-400 text-[11px]">
                      {item.effectiveTime || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] font-bold text-emerald-400">
                        ✓ {item.validationStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
