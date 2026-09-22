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
  const [genre, setGenre] = useState('Fantasi / Petualangan');
  const [theme, setTheme] = useState('Keberanian, Pengorbanan, & Penemuan Jati Diri');
  const [premise, setPremise] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [initialLocation, setInitialLocation] = useState('Kota Pelabuhan Oakhaven');
  const [initialCharacterName, setInitialCharacterName] = useState('Kaelen');
  const [initialConflict, setInitialConflict] = useState('Sebuah kapal misterius tanpa awak terdampar membawa pesan peringatan dalam aksara kuno.');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [universeScope, setUniverseScope] = useState<'CANONICAL' | 'SANDBOX'>('CANONICAL');

  const handleAiDevelop = async () => {
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('STORY_PREMISE', {
        genre,
        userIdea: title || genre,
      });
      if (res?.proposal) {
        if (!title) setTitle(res.proposal.title);
        setPremise(res.proposal.premise);
        setSynopsis(res.proposal.synopsis);
        setTheme(res.proposal.theme || theme);
        setInitialLocation(res.proposal.initialLocation || initialLocation);
        setInitialConflict(res.proposal.initialConflict || initialConflict);
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
      await onCreateStory({
        title: title.trim(),
        genre,
        theme,
        premise: premise.trim(),
        synopsis: synopsis.trim(),
        initialLocation: initialLocation.trim(),
        initialCharacter: {
          displayName: initialCharacterName.trim() || 'Tokoh Utama',
          personalityType: 'Pemberani & Penuh Tekad',
          traits: ['Gigih', 'Cerdas', 'Setia'],
          occupation: 'Penjelajah',
        },
        initialConflict: initialConflict.trim(),
        universeScope,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Kisah Cerita Baru"
      subtitle="Definisikan fondasi dunia, tokoh utama, dan konflik permulaan naskah Anda."
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
              <span>Bantuan Imajinasi AI</span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5">
              Klik untuk melengkapi judul, premis, sinopsis, dan konflik secara otomatis.
            </p>
          </div>
          <Button
            kind="clay"
            size="sm"
            onClick={handleAiDevelop}
            disabled={isAiLoading}
            className="shrink-0"
          >
            <Wand2 className={`h-4 w-4 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Menyusun...' : 'Kembangkan Ide dengan AI'}</span>
          </Button>
        </div>

        {/* Basic Story Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Cerita <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth. Rahasia Lembah Kabut Abadi"
              className="clay-input w-full px-3.5 py-2.5 text-xs text-slate-900 font-medium rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="clay-input w-full px-3 py-2.5 text-xs text-slate-900 font-medium rounded-xl"
            >
              <option value="Fantasi / Petualangan">Fantasi / Petualangan</option>
              <option value="Sci-Fi / Fiksi Ilmiah">Sci-Fi / Fiksi Ilmiah</option>
              <option value="Misteri / Detektif">Misteri / Detektif</option>
              <option value="Sejarah / Kolosal">Sejarah / Kolosal</option>
              <option value="Drama / Romansa">Drama / Romansa</option>
              <option value="Thriller / Ketegangan">Thriller / Ketegangan</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tema Cerita</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="cth. Keberanian & Penemuan Kebenaran"
            className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
          />
        </div>

        {/* Premise & Synopsis */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Premis Cerita</label>
          <textarea
            rows={2}
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Ide pokok satu-dua kalimat tentang perjalanan tokoh dan konflik dasarnya..."
            className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Sinopsis Singkat</label>
          <textarea
            rows={3}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Ringkasan latar belakang dunia dan taruhan utama peristiwa..."
            className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
          />
        </div>

        {/* Initial World & Character Anchors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wilayah / Kota Awal
            </label>
            <input
              type="text"
              value={initialLocation}
              onChange={(e) => setInitialLocation(e.target.value)}
              placeholder="cth. Kota Pelabuhan Oakhaven"
              className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Tokoh Utama
            </label>
            <input
              type="text"
              value={initialCharacterName}
              onChange={(e) => setInitialCharacterName(e.target.value)}
              placeholder="cth. Kaelen"
              className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Konflik / Misteri Permulaan
          </label>
          <input
            type="text"
            value={initialConflict}
            onChange={(e) => setInitialConflict(e.target.value)}
            placeholder="cth. Pusaka kuno menghilang dari perbendaharaan kuil..."
            className="clay-input w-full px-3.5 py-2 text-xs text-slate-900 rounded-xl"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button kind="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            kind="clay"
            size="md"
            onClick={() => handleSubmit({ preventDefault: () => {} } as any)}
            disabled={isSubmitting || !title.trim()}
          >
            <span>{isSubmitting ? 'Membangun Dunia...' : '🚀 Buat & Buka Cerita'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
