import React from 'react';
import { CheckCircle2, AlertCircle, CircleDot, Info, Sparkles, TestTube, X, HelpCircle } from 'lucide-react';
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
  const isPositive = ['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED', 'WIRED', 'ALIVE', 'KONSISTEN', 'VALID'].includes(status);
  const isWarning = ['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'NO_UNIVERSE', 'DEGRADED', 'CACHED', 'DISPATCHED', 'CARRYOVER'].includes(status);

  return (
    <span
      id={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs transition-all ${getStatusTone(status)}`}
    >
      {showIcon && (
        isPositive ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : isWarning ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        ) : (
          <CircleDot className="h-3.5 w-3.5 shrink-0 text-rose-600" />
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
  variant = 'standard',
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: 'standard' | 'ambient' | 'production' | 'sandbox' | 'inset';
}) {
  const variantClasses = {
    standard: 'clay-card',
    ambient: 'clay-card-ambient',
    production: 'clay-card-active-production',
    sandbox: 'clay-card-active-sandbox',
    inset: 'clay-inset',
  }[variant];

  return (
    <div
      id={id}
      className={`${variantClasses} transition-all duration-200 ${className}`}
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
  kind?: 'primary' | 'secondary' | 'indigo' | 'emerald' | 'danger' | 'ghost' | 'clay';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-medium',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl font-semibold',
    lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl font-bold',
  }[size];

  const kindClasses = {
    primary: 'clay-button-amber',
    secondary: 'clay-button-neutral',
    indigo: 'clay-button-indigo',
    emerald: 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white border-2 border-emerald-200 shadow-[0_6px_14px_rgba(16,185,129,0.35),inset_0_2px_2px_rgba(255,255,255,0.6)] hover:brightness-105 active:scale-[0.98]',
    danger: 'clay-button-danger',
    clay: 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 border-2 border-amber-200 shadow-[0_8px_16px_rgba(245,158,11,0.3),inset_0_2px_2px_rgba(255,255,255,0.7)] hover:brightness-105 active:scale-[0.98]',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl',
  }[kind];

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${sizeClasses} ${kindClasses} ${className}`}
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
  tone?: 'amber' | 'blue' | 'emerald' | 'indigo';
  icon?: React.ReactNode;
}) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50/80 text-amber-900 shadow-sm',
    blue: 'border-sky-200 bg-sky-50/80 text-sky-900 shadow-sm',
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-sm',
    indigo: 'border-indigo-200 bg-indigo-50/80 text-indigo-900 shadow-sm',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 text-xs leading-relaxed ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {icon ?? <Info className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          {title && <div className="font-bold mb-1 text-slate-900 text-sm">{title}</div>}
          <div className="text-slate-700 text-xs leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ModeBadge({
  isSandbox,
}: {
  isSandbox: boolean;
}) {
  if (isSandbox) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 px-3.5 py-1.5 text-xs font-bold text-purple-900 shadow-[0_4px_12px_rgba(147,51,234,0.15)]">
        <TestTube className="h-4 w-4 text-purple-600 animate-pulse" />
        <span>RUANG EKSPERIMEN (SANDBOX)</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-[0_4px_12px_rgba(245,158,11,0.15)]">
      <Sparkles className="h-4 w-4 text-amber-600" />
      <span>KANUN RESMI (CANONICAL)</span>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full ${maxWidth} clay-card max-h-[90vh] flex flex-col overflow-hidden bg-white shadow-2xl border-2 border-slate-100 rounded-3xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
