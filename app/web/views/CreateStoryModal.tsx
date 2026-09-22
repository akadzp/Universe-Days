import React, { useState } from 'react';
import { Sparkles, BookOpen, Compass, Users, AlertCircle, Wand2, ArrowRight } from 'lucide-react';
import { Modal, Button, InfoCallout } from '../components/UIElements.tsx';

export function CreateStoryModal({
  isOpen,
  onClose,
  onCreateStory,
  onAiAssist,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateStory: (storyData: any) => Promise<void>;
  onAiAssist: (capability: string, input: any) => Promise<any>;
}) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [theme, setTheme] = useState('');
  const [premise, setPremise] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [initialLocation, setInitialLocation] = useState('');
  const [initialCharacterName, setInitialCharacterName] = useState('');
  const [initialConflict, setInitialConflict] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [universeScope, setUniverseScope] = useState<'CANONICAL' | 'SANDBOX'>('CANONICAL');

  const handleAiDevelop = async () => {
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('STORY_PREMISE', {
        genre: genre || undefined,
        userIdea: title || genre || undefined,
      });
      if (res?.proposal) {
        if (!title && res.proposal.title) setTitle(res.proposal.title);
        if (res.proposal.premise) setPremise(res.proposal.premise);
        if (res.proposal.synopsis) setSynopsis(res.proposal.synopsis);
        if (res.proposal.theme) setTheme(res.proposal.theme);
        if (res.proposal.initialLocation) setInitialLocation(res.proposal.initialLocation);
        if (res.proposal.initialConflict) setInitialConflict(res.proposal.initialConflict);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        genre: genre.trim() || undefined,
        theme: theme.trim() || undefined,
        premise: premise.trim() || undefined,
        synopsis: synopsis.trim() || undefined,
        initialLocation: initialLocation.trim() || undefined,
        initialConflict: initialConflict.trim() || undefined,
        universeScope,
      };

      if (initialCharacterName.trim()) {
        payload.initialCharacter = {
          displayName: initialCharacterName.trim(),
        };
      }

      await onCreateStory(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Cerita"
      subtitle="Definisikan fondasi dunia cerita, tokoh permulaan, dan premis naskah Anda."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Scope selector */}
        <div className="flex items-center gap-3 p-3 bg-slate-100/80 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">Tujuan Pembuatan:</span>
          <button
            type="button"
            onClick={() => setUniverseScope('CANONICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              universeScope === 'CANONICAL'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌟 Kanun Resmi (Canonical)
          </button>
          <button
            type="button"
            onClick={() => setUniverseScope('SANDBOX')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              universeScope === 'SANDBOX'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧪 Ruang Eksperimen (Sandbox)
          </button>
        </div>

        {/* AI Generator banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Bantuan Usulan AI</span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5">
              Usulkan premis, sinopsis, dan konflik awal berdasarkan judul atau genre yang Anda tentukan.
            </p>
          </div>
          <Button
            type="button"
            kind="clay"
            size="sm"
            onClick={handleAiDevelop}
            disabled={isAiLoading}
            className="shrink-0"
          >
            <Wand2 className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Memproses...' : 'Usulkan Ide Alur'}</span>
          </Button>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Judul Cerita *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kronik Tanah Selatan"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Genre</label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Contoh: Fantasi / Misteri"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Tema Utama</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Contoh: Keberanian & Penemuan Diri"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Premis Cerita</label>
            <textarea
              rows={2}
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="Garis besar pokok cerita yang menjadi penggerak alur..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Sinopsis Awal</label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Gambaran umum peristiwa pembuka dan latar belakang dunia..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Lokasi Permulaan</label>
            <input
              type="text"
              value={initialLocation}
              onChange={(e) => setInitialLocation(e.target.value)}
              placeholder="Contoh: Lembah Kabut"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nama Tokoh Awal</label>
            <input
              type="text"
              value={initialCharacterName}
              onChange={(e) => setInitialCharacterName(e.target.value)}
              placeholder="Contoh: Kaelen"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Konflik / Misteri Permulaan</label>
            <input
              type="text"
              value={initialConflict}
              onChange={(e) => setInitialConflict(e.target.value)}
              placeholder="Contoh: Penemuan artefak kuno tak bertuan di perbatasan"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" kind="secondary" size="md" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            kind="clay"
            size="md"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? 'Membangun Dunia...' : 'Mulai Cerita'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
