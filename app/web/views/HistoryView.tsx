import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  Sparkles,
  FileText,
  ChevronRight,
  Eye,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { ProductionRunRecord, UsageSummary } from '../types.ts';
import { Card, Button, StatusBadge } from '../components/UIElements.tsx';
import {
  formatFriendlyTime,
  getFriendlyPurpose,
} from '../translations.ts';

export function HistoryView({
  runs,
  usage,
}: {
  runs: ProductionRunRecord[];
  usage: UsageSummary | null;
}) {
  const [selectedRun, setSelectedRun] = useState<ProductionRunRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractReadableText = (output: any): string => {
    if (!output) return 'Tidak ada teks tercatat.';
    if (typeof output === 'string') return output;
    if (typeof output.storyText === 'string') return output.storyText;
    if (typeof output.summary === 'string') return output.summary;
    if (typeof output.text === 'string') return output.text;
    return JSON.stringify(output, null, 2);
  };

  return (
    <div id="view-history" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Pustaka Naskah & Riwayat Cerita
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Semua karya, bab, dan kronik yang pernah ditulis tersimpan di sini dan dapat dibaca kembali kapan saja.
        </p>
      </div>

      {/* Summary Stat bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 bg-stone-950/80">
          <div className="text-xs text-stone-400">Total Naskah Terbuat</div>
          <div className="text-xl font-bold text-stone-100 mt-1">{runs.length} Naskah</div>
        </Card>
        <Card className="p-4 bg-stone-950/80">
          <div className="text-xs text-stone-400">Total Estimasi Kata</div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            ~{Math.round(runs.reduce((acc, r) => acc + (r.outputTokens || 0), 0) * 0.75)} kata
          </div>
        </Card>
        <Card className="p-4 bg-stone-950/80">
          <div className="text-xs text-stone-400">Status Kelestarian Arsip</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">Permanen Lokal</div>
        </Card>
      </div>

      {/* Runs List */}
      <div className="space-y-3">
        {runs.map(run => (
          <Card
            key={run.runId}
            className="p-5 transition hover:border-stone-700 bg-stone-950/70"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-100">
                      {getFriendlyPurpose(run.purpose)}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="mt-1 text-xs text-stone-400">
                    Ditulis pada {formatFriendlyTime(run.timestamp)} · Panjang: ~{Math.round((run.outputTokens || 0) * 0.75)} kata
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  kind="secondary"
                  onClick={() => setSelectedRun(run)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Baca Naskah
                </Button>
              </div>
            </div>

            {run.reason && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
                {run.reason}
              </div>
            )}
          </Card>
        ))}

        {runs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-800 p-12 text-center text-xs text-stone-500">
            Belum ada naskah yang ditulis di studio ini.
          </div>
        )}
      </div>

      {/* Story Reader Modal */}
      {selectedRun && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRun(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-stone-800 bg-stone-950 p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-base font-semibold text-stone-100">
                  {getFriendlyPurpose(selectedRun.purpose)}
                </h3>
                <div className="text-xs text-stone-400 mt-0.5">
                  Dibuat pada {formatFriendlyTime(selectedRun.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(extractReadableText(selectedRun.output))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900 px-3 py-1.5 text-xs text-stone-300 hover:text-stone-100"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-5 text-sm text-stone-200 font-serif leading-relaxed whitespace-pre-wrap">
              {extractReadableText(selectedRun.output)}
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-500">
              <span>Estimasi: ~{Math.round((selectedRun.outputTokens || 0) * 0.75)} kata</span>
              <Button size="sm" onClick={() => setSelectedRun(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
