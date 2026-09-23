import React from 'react';

export function TruthBadge({ level }: { level?: string }) {
  const l = (level || 'CANON').toUpperCase();
  switch (l) {
    case 'CANON':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono tracking-wider">
          CANON
        </span>
      );
    case 'DERIVED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono tracking-wider">
          DERIVED
        </span>
      );
    case 'PROJECTION':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono tracking-wider">
          PROJECTION
        </span>
      );
    case 'PROPOSAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono tracking-wider">
          PROPOSAL
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-900 text-neutral-400 border border-neutral-700 font-mono tracking-wider">
          UNKNOWN
        </span>
      );
  }
}

export function UnknownSafetyBadge({ status }: { status: 'UNKNOWN' | 'NOT_RECORDED' | 'NOT_APPLICABLE' | 'UNRESOLVED' | string }) {
  const s = status.toUpperCase();
  let color = 'bg-neutral-800 text-neutral-300 border-neutral-700';
  if (s === 'UNRESOLVED') color = 'bg-rose-950/80 text-rose-300 border-rose-800';
  if (s === 'NOT_RECORDED') color = 'bg-zinc-900 text-zinc-400 border-zinc-700';
  if (s === 'NOT_APPLICABLE') color = 'bg-slate-900 text-slate-400 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${color}`}>
      {s}
    </span>
  );
}

export function EntityLifecycleBadge({ status }: { status?: string }) {
  const st = (status || 'ACTIVE').toUpperCase();
  const isAct = st === 'ACTIVE' || st === 'VALID' || st === 'OPEN';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border ${
        isAct
          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
          : 'bg-amber-950/50 text-amber-400 border-amber-800/40'
      }`}
    >
      {st}
    </span>
  );
}
