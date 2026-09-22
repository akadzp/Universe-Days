import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  FileText,
  BookOpen,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
  Loader2,
  Copy,
  Check,
  Download,
  Share2,
} from 'lucide-react';
import { ControlOverview, ProductionRunRecord } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge, InfoCallout } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  formatFriendlyTime,
  getFriendlyPurpose,
  purposeMap,
} from '../translations.ts';

export function ProductionView({
  overview,
  runs,
  latestRun,
  onRunProduction,
  onNavigateToUniverse,
  busy,
}: {
  overview: ControlOverview;
  runs: ProductionRunRecord[];
  latestRun: ProductionRunRecord | null;
  onRunProduction: (kind: 'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION', instruction: string) => Promise<void>;
  onNavigateToUniverse: () => void;
  busy: boolean;
}) {
  const isMounted = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const isSandbox = overview.universe.universeScope === 'SANDBOX';

  const [selectedKind, setSelectedKind] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');
  const [instruction, setInstruction] = useState('');
  const [copied, setCopied] = useState(false);

  const samplePrompts: Record<string, string[]> = {
    DAILY_STORY: [
      'Gambarkan suasana pagi hari di kota dan pertemuan tak terduga antara dua tokoh.',
      'Fokuskan pada dialog mendalam mengenai rahasia masa lalu yang baru terungkap.',
      'Tuliskan adegan penuh ketegangan saat tokoh utama mengambil keputusan sulit.',
    ],
    DAILY_PAGE: [
      'Terbitkan kronik peristiwa yang merangkum dinamika kelompok hari ini.',
      'Buat ringkasan kabar tokoh mengenai siapa yang kini menjadi sekutu baru.',
      'Sajikan tinjauan alur cerita yang menyoroti konsistensi peristiwa.',
    ],
    GENERAL_PRODUCTION: [
      'Eksplorasi sudut pandang tokoh pendukung saat peristiwa besar terjadi.',
      'Buat catatan monolog batin karakter sebelum pertempuran dimulai.',
    ],
  };

  const activeRun = latestRun ?? runs[0] ?? null;

  const handleSubmit = () => {
    void onRunProduction(selectedKind, instruction);
  };

  const extractReadableStory = (run: ProductionRunRecord | null): string => {
    if (!run?.output) return '';
    if (typeof run.output === 'string') return run.output;
    if (typeof run.output.storyText === 'string') return run.output.storyText;
    if (typeof run.output.summary === 'string') return run.output.summary;
    if (typeof run.output.text === 'string') return run.output.text;
    if (run.output.storyProduction?.narrative) return run.output.storyProduction.narrative;
    return JSON.stringify(run.output, null, 2);
  };

  const storyText = extractReadableStory(activeRun);

  const handleCopy = () => {
    if (!storyText) return;
    navigator.clipboard.writeText(storyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!storyText) return;
    const blob = new Blob([storyText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Naskah_Pocer_${universeDate || 'Draf'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="view-production" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Studio Penulisan Naskah
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Pilih jenis naskah yang ingin dibuat. Asisten AI menulis narasi dengan mematuhi karakter dan sejarah dunia cerita Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Warning if Universe not mounted */}
      {!isMounted && (
        <Card variant="ambient" className="border-amber-300 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-amber-950">
                Dunia Cerita Belum Dibuka
              </h4>
              <p className="text-xs leading-relaxed text-slate-700">
                Sebelum asisten AI dapat menulis naskah yang konsisten, Anda perlu membuka Dunia Cerita terlebih dahulu agar latar dan para tokoh terbaca dengan utuh.
              </p>
              <div>
                <Button size="sm" kind="primary" onClick={onNavigateToUniverse}>
                  Buka Dunia Cerita
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Workshop Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Writing Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" />
              <span>Format & Arah Cerita</span>
            </h3>

            {/* Purpose Selector */}
            <div className="space-y-2.5 mb-5">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Jenis Karya:
              </label>
              <div className="space-y-2">
                {(Object.keys(purposeMap) as Array<keyof typeof purposeMap>).map(key => {
                  const item = purposeMap[key];
                  const isSelected = selectedKind === key;
                  return (
                    <button
                      key={key}
                      id={`purpose-select-${key.toLowerCase()}`}
                      type="button"
                      onClick={() => setSelectedKind(key as any)}
                      className={`w-full rounded-2xl p-3.5 text-left transition-all border-2 cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50/90 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">{item.title}</div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-600">{item.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instruction input */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Instruksi / Arahan Khusus:
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Opsional</span>
              </div>
              <textarea
                id="production-instruction-input"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="Contoh: Fokuskan adegan pada ketegangan negosiasi di istana raja..."
                rows={3}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {/* Prompt suggestions */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span>Rekomendasi Ide Naskah Sekali Klik:</span>
              </div>
              <div className="space-y-1.5">
                {samplePrompts[selectedKind]?.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInstruction(prompt)}
                    className="w-full rounded-xl bg-slate-100 hover:bg-amber-100/60 border border-slate-200 p-2.5 text-left text-[11px] text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {/* Action button */}
            <Button
              id="production-submit-btn"
              kind="primary"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={busy || !isMounted}
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Asisten AI Sedang Mengarang...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Mulai Tulis Cerita</span>
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Side: Reading Desk & Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 min-h-[520px] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeRun ? getFriendlyPurpose(activeRun.purpose) : 'Meja Baca Naskah'}
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      {activeRun ? `Selesai ditulis: ${formatFriendlyTime(activeRun.timestamp)}` : 'Hasil naskah akan tampil di sini'}
                    </div>
                  </div>
                </div>

                {activeRun && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" kind="secondary" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                    </Button>
                    <Button size="sm" kind="secondary" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh TXT</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Story Content Area */}
              <div className="mt-5">
                {busy ? (
                  <div className="clay-inset p-12 text-center space-y-4">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-900">Merangkai Alur Cerita...</div>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Asisten AI sedang menyusun dialog dan adegan yang selaras dengan sejarah dunia cerita Anda.
                      </p>
                    </div>
                  </div>
                ) : storyText ? (
                  <div className="rounded-2xl border-2 border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-serif">
                      {storyText}
                    </div>
                  </div>
                ) : (
                  <div className="clay-inset p-12 text-center space-y-3">
                    <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="text-sm font-bold text-slate-700">Belum Ada Naskah Aktif</div>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Pilih jenis karya dan klik "Mulai Tulis Cerita" untuk memproduksi naskah bab baru.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {activeRun && (
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Panjang naskah: <strong>~{Math.round((activeRun.outputTokens || 0) * 0.75)} kata</strong></span>
                <StatusBadge status={activeRun.status} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
