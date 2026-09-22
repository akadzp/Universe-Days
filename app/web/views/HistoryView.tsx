import React, { useEffect, useState } from 'react';
import { Clock, BookOpen, FileText, CheckCircle2, Copy, Check, Filter } from 'lucide-react';
import { Card, StatusBadge, Button, InfoCallout } from '../components/UIElements.tsx';
import type { ProductionRunRecord } from '../types.ts';

export function HistoryView({
  runs,
  onRefresh,
}: {
  runs: ProductionRunRecord[];
  onRefresh: () => void;
}) {
  const [selectedRun, setSelectedRun] = useState<ProductionRunRecord | null>(runs[0] || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedRun(runs[0] || null);
  }, [runs]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Pustaka & Arsip Naskah
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Arsip seluruh naskah bab yang telah diterbitkan dan riwayat proses penulisan.
          </p>
        </div>

        <Button kind="secondary" size="sm" onClick={onRefresh}>
          Segarkan Arsip
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: List of Runs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Daftar Terbitan ({runs.length})</span>
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto">
            {runs.map((r) => (
              <div
                key={r.runId}
                onClick={() => setSelectedRun(r)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedRun?.runId === r.runId
                    ? 'bg-amber-100/70 border-amber-400 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                    {r.purpose}
                  </h4>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                  <span>📅 {r.timestamp?.slice(0, 10) || 'Belum tercatat'}</span>
                  <span>{r.outputTokens || 0} Token</span>
                </div>
              </div>
            ))}

            {runs.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                Belum ada naskah tersimpan di pustaka.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Reader & Run Info */}
        <div className="md:col-span-2">
          {selectedRun ? (
            <Card className="p-6 space-y-6 bg-white border border-slate-200 shadow-xs min-h-[550px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    ID Run: {selectedRun.runId}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {selectedRun.purpose}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                    <span>Terbit: {selectedRun.timestamp}</span>
                    <span>•</span>
                    <span>Tokens: {selectedRun.outputTokens}</span>
                    <span>•</span>
                    <StatusBadge status={selectedRun.status} />
                  </div>
                </div>

                <Button
                  kind="secondary"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(selectedRun.output, null, 2))}
                  className="gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Tersalin' : 'Salin Naskah'}</span>
                </Button>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 font-serif text-sm leading-relaxed text-slate-900 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {typeof selectedRun.output === 'string'
                  ? selectedRun.output
                  : JSON.stringify(selectedRun.output, null, 2)}
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Pilih salah satu bab di sebelah kiri untuk membaca arsip naskah.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
