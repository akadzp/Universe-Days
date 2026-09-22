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
  Download,
  Search,
} from 'lucide-react';
import { ProductionRunRecord, UsageSummary } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge } from '../components/UIElements.tsx';
import {
  formatFriendlyTime,
  getFriendlyPurpose,
} from '../translations.ts';

export function HistoryView({
  runs,
  usage,
  isSandbox,
}: {
  runs: ProductionRunRecord[];
  usage: UsageSummary | null;
  isSandbox: boolean;
}) {
  const [selectedRun, setSelectedRun] = useState<ProductionRunRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

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
    if (output.storyProduction?.narrative) return output.storyProduction.narrative;
    return JSON.stringify(output, null, 2);
  };

  const handleDownloadRun = (run: ProductionRunRecord) => {
    const text = extractReadableText(run.output);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pocer_${run.purpose}_${run.runId.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredRuns = runs.filter(run => {
    if (filterType !== 'ALL' && run.purpose !== filterType) return false;
    if (searchQuery.trim()) {
      const text = extractReadableText(run.output).toLowerCase();
      const q = searchQuery.toLowerCase();
      return text.includes(q) || run.purpose.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div id="view-history" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Pustaka Naskah & Arsip Cerita
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Semua karya, bab, dan kronik yang pernah ditulis tersimpan rapi di sini dan dapat dibaca kembali kapan saja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-600">Total Naskah Terbuat</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{runs.length} Naskah</div>
        </Card>
        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-600">Total Estimasi Kata</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ~{Math.round(runs.reduce((acc, r) => acc + (r.outputTokens || 0), 0) * 0.75)} kata
          </div>
        </Card>
        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-600">Status Kelestarian Arsip</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">Permanen Lokal</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari dalam naskah atau alur cerita..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-200/60 rounded-xl">
          {['ALL', 'DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'ALL' ? 'Semua Naskah' : getFriendlyPurpose(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-3">
        {filteredRuns.map(run => (
          <Card
            key={run.runId}
            className="p-5 transition-all hover:border-slate-300 bg-white"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {getFriendlyPurpose(run.purpose)}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Ditulis pada {formatFriendlyTime(run.timestamp)} · Panjang: ~{Math.round((run.outputTokens || 0) * 0.75)} kata
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  id={`read-story-${run.runId}`}
                  size="sm"
                  kind="primary"
                  onClick={() => setSelectedRun(run)}
                >
                  <Eye className="h-4 w-4" />
                  <span>Baca Naskah</span>
                </Button>
                <Button
                  size="sm"
                  kind="secondary"
                  onClick={() => handleDownloadRun(run)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredRuns.length === 0 && (
          <div className="clay-inset p-10 text-center space-y-3">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
            <div className="text-sm font-bold text-slate-800">Belum Ada Naskah yang Sesuai</div>
            <p className="text-xs text-slate-600">
              {runs.length === 0
                ? 'Mulai menulis cerita di menu Tulis Naskah untuk melihat karya pertama Anda di sini.'
                : 'Tidak ada naskah yang cocok dengan kata kunci pencarian Anda.'}
            </p>
          </div>
        )}
      </div>

      {/* Reader Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border-2 border-white bg-white p-6 sm:p-8 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-900">
                    {getFriendlyPurpose(selectedRun.purpose)}
                  </span>
                  <StatusBadge status={selectedRun.status} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Ditulis pada {formatFriendlyTime(selectedRun.timestamp)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  kind="secondary"
                  onClick={() => handleCopyText(extractReadableText(selectedRun.output))}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedRun(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto pr-2">
              <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-800 font-serif whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-200">
                {extractReadableText(selectedRun.output)}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600 font-semibold">
                Estimasi Jumlah Kata: ~{Math.round((selectedRun.outputTokens || 0) * 0.75)} kata
              </div>
              <Button size="sm" kind="secondary" onClick={() => setSelectedRun(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
