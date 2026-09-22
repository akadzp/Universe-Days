import React, { useState } from 'react';
import {
  TestTube,
  FastForward,
  RotateCcw,
  Sparkles,
  Layers,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  ChevronRight,
  ArrowRightLeft
} from 'lucide-react';
import { Card, Button, InfoCallout, ModeBadge } from '../components/UIElements.tsx';
import type { UniverseDetails } from '../types.ts';

export function SandboxView({
  universe,
  onAdvanceDay,
  onCloneToSandbox,
  onAiAssist,
}: {
  universe: UniverseDetails | null;
  onAdvanceDay: (days: number) => Promise<void>;
  onCloneToSandbox: () => Promise<void>;
  onAiAssist: (capability: string, input: any) => Promise<any>;
}) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [hypothesisPrompt, setHypothesisPrompt] = useState('');
  const [hypothesisResult, setHypothesisResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleAdvance = async (days: number) => {
    setIsAdvancing(true);
    try {
      await onAdvanceDay(days);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      await onCloneToSandbox();
    } finally {
      setIsCloning(false);
    }
  };

  const handleSimulateHypothesis = async () => {
    if (!hypothesisPrompt.trim()) return;
    setIsSimulating(true);
    try {
      const res = await onAiAssist('STORY_PREMISE', {
        genre: universe?.storyMetadata?.genre || 'Fantasi',
        userIdea: hypothesisPrompt,
      });
      setHypothesisResult(res?.proposal || null);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sandbox Header with Distinct Experimental Theme */}
      <Card className="p-6 bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-purple-100/50 border-2 border-purple-300 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-200 text-purple-900 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <TestTube className="h-3.5 w-3.5 text-purple-700" />
                <span>Ruang Simulasi & Eksperimen</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-purple-900 text-[11px] font-bold border border-purple-200">
                Aman & Terisolasi
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Laboratorium Sandbox Bebas Eksperimen
            </h2>
            <p className="text-xs text-slate-600 font-medium max-w-2xl">
              Uji coba loncatan garis waktu, buat simulasi alur alternatif tanpa merusak kebenaran Kanun Resmi (Canonical).
            </p>
          </div>

          <Button
            kind="indigo"
            size="md"
            onClick={handleClone}
            disabled={isCloning}
            className="shrink-0"
          >
            <Copy className={`h-4 w-4 ${isCloning ? 'animate-spin' : ''}`} />
            <span>{isCloning ? 'Mengkroning...' : 'Kloning dari Kanon ke Sandbox'}</span>
          </Button>
        </div>
      </Card>

      {/* Time Machine & Timeline Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 bg-white border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FastForward className="h-4 w-4 text-purple-600" />
              <span>Mesin Loncatan Waktu (Time Machine)</span>
            </h3>
            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 text-xs font-mono font-bold">
              📅 {universe?.temporal?.currentUniverseDate || '2024-01-01'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Majukan garis waktu cerita untuk mengamati perubahan kondisi tokoh dan status semesta.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button
              kind="secondary"
              size="md"
              onClick={() => handleAdvance(1)}
              disabled={isAdvancing}
              className="flex flex-col py-3 border-purple-200 hover:bg-purple-50"
            >
              <span className="text-sm font-black text-purple-900">+1 Hari</span>
              <span className="text-[10px] text-slate-500 font-medium">Lompat esok hari</span>
            </Button>

            <Button
              kind="secondary"
              size="md"
              onClick={() => handleAdvance(3)}
              disabled={isAdvancing}
              className="flex flex-col py-3 border-purple-200 hover:bg-purple-50"
            >
              <span className="text-sm font-black text-purple-900">+3 Hari</span>
              <span className="text-[10px] text-slate-500 font-medium">Lompat 3 hari</span>
            </Button>

            <Button
              kind="indigo"
              size="md"
              onClick={() => handleAdvance(7)}
              disabled={isAdvancing}
              className="flex flex-col py-3"
            >
              <span className="text-sm font-black text-white">+1 Minggu</span>
              <span className="text-[10px] text-purple-100 font-medium">Lompat 7 hari</span>
            </Button>
          </div>
        </Card>

        {/* Narrative Simulation Sandbox */}
        <Card className="p-6 space-y-4 bg-white border-2 border-indigo-200">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Simulasi Ide & Alur Hipotetis</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Uji coba skenario "Bagaimana jika..." sebelum memasukkannya ke dalam kanun cerita.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={hypothesisPrompt}
              onChange={(e) => setHypothesisPrompt(e.target.value)}
              placeholder="cth. Bagaimana jika artefak dicuri oleh sahabat sang tokoh?"
              className="clay-input w-full px-3.5 py-2.5 text-xs rounded-xl"
            />
            <Button
              kind="indigo"
              size="sm"
              onClick={handleSimulateHypothesis}
              disabled={isSimulating || !hypothesisPrompt.trim()}
              className="w-full"
            >
              <Wand2 className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Memproyeksikan Alur...' : 'Simulasikan Dampak Naratif'}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Hypothesis Results */}
      {hypothesisResult && (
        <Card className="p-6 space-y-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-2 border-purple-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-purple-950 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <span>Hasil Proyeksi Alur Hipotetis</span>
            </h4>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Draf Simulasi
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-white/90 rounded-xl border border-purple-200 font-bold text-slate-900">
              {hypothesisResult.title}
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-purple-200 text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-1">Premis Simulasi:</strong>
              {hypothesisResult.premise}
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-purple-200 text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-1">Konflik yang Terpicu:</strong>
              {hypothesisResult.initialConflict}
            </div>
          </div>
        </Card>
      )}

      <InfoCallout title="Perbedaan Hakiki: Produksi vs Sandbox" tone="indigo">
        Segala eksperimen di dalam ruang Sandbox tidak memengaruhi naskah terbitan di Kanun Resmi. Anda bebas menguji konsekuensi tanpa rasa khawatir!
      </InfoCallout>
    </div>
  );
}
