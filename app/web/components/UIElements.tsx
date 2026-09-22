import React from 'react';
import { CheckCircle2, AlertCircle, CircleDot, Info } from 'lucide-react';
import { getFriendlyStatus, getStatusTone } from '../translations.ts';

export function StatusBadge({
  status,
  customLabel,
  showIcon = true,
}: {
  status: string;
  customLabel?: string;
  showIcon?: boolean;
}) {
  const isPositive = ['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED', 'WIRED'].includes(status);
  const isWarning = ['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'NO_UNIVERSE', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status);

  return (
    <span
      id={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${getStatusTone(status)}`}
    >
      {showIcon && (
        isPositive ? (
          <CheckCircle2 className="h-3 w-3 shrink-0" />
        ) : isWarning ? (
          <AlertCircle className="h-3 w-3 shrink-0" />
        ) : (
          <CircleDot className="h-3 w-3 shrink-0" />
        )
      )}
      <span>{customLabel ?? getFriendlyStatus(status)}</span>
    </span>
  );
}

export function Card({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-stone-800/80 bg-stone-900/60 shadow-sm backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled = false,
  kind = 'secondary',
  size = 'md',
  className = '',
  id,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-xs rounded-xl font-medium',
    lg: 'px-5 py-3 text-sm rounded-xl font-semibold',
  }[size];

  const kindClasses = {
    primary:
      'border-amber-400/80 bg-amber-400 text-stone-950 hover:bg-amber-300 font-semibold shadow-sm hover:shadow active:scale-[0.98]',
    secondary:
      'border-stone-700/80 bg-stone-900 text-stone-200 hover:bg-stone-800 hover:border-stone-600 active:scale-[0.98]',
    danger:
      'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 active:scale-[0.98]',
    ghost:
      'border-transparent bg-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900',
  }[kind];

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${kindClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function InfoCallout({
  title,
  children,
  tone = 'amber',
  icon,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: 'amber' | 'blue' | 'emerald';
  icon?: React.ReactNode;
}) {
  const styles = {
    amber: 'border-amber-400/20 bg-amber-400/[0.04] text-amber-200/90',
    blue: 'border-sky-400/20 bg-sky-400/[0.04] text-sky-200/90',
    emerald: 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-200/90',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 text-xs leading-relaxed ${styles}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 opacity-80">
          {icon ?? <Info className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          {title && <div className="font-semibold mb-1 text-stone-100">{title}</div>}
          <div className="text-stone-300/80 text-[11px] leading-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
