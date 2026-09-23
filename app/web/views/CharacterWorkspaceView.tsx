import React, { useState, useEffect } from 'react';
import {
  User,
  Heart,
  Brain,
  Shield,
  Compass,
  Package,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
  ArrowLeft,
  Activity,
  Layers,
  Award,
  Edit3,
  MessageSquare,
  Zap,
  PlusCircle,
  Wand2,
  Check,
  ShieldAlert,
  HelpCircle,
  Tag,
  Search
} from 'lucide-react';
import { Card, StatusBadge, Button, InfoCallout, Modal } from '../components/UIElements.tsx';
import type { CharacterWorkspaceData, UniverseCharacter } from '../types.ts';

export function CharacterWorkspaceView({
  characterId,
  onBack,
  onSelectCharacter,
  allCharacters,
  fetchCharacterWorkspace,
  onEditCharacter,
  onUpdateState,
  onUpdateBehavior,
  onUpdateStyle,
  onAddKnowledge,
  onAddCharacter,
  onAiAssist,
}: {
  characterId: string | null;
  onBack: () => void;
  onSelectCharacter: (id: string) => void;
  allCharacters: UniverseCharacter[];
  fetchCharacterWorkspace: (id: string) => Promise<CharacterWorkspaceData | null>;
  onEditCharacter?: (charId: string, data: any) => Promise<void>;
  onUpdateState?: (charId: string, data: any) => Promise<void>;
  onUpdateBehavior?: (charId: string, data: any) => Promise<void>;
  onUpdateStyle?: (charId: string, data: any) => Promise<void>;
  onAddKnowledge?: (charId: string, data: any) => Promise<void>;
  onAddCharacter?: (data: any) => Promise<void>;
  onAiAssist?: (capability: string, input: any) => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profile' | 'actor' | 'state' | 'behavior' | 'style' | 'knowledge' | 'relationships' | 'possessions' | 'location' | 'timeline' | 'continuity'
  >('overview');
  const [data, setData] = useState<CharacterWorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [characterQuery, setCharacterQuery] = useState('');

  // Modals
  const [isCreateCharModalOpen, setIsCreateCharModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

  // Create Character form
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('');
  const [newCharPersonality, setNewCharPersonality] = useState('');
  const [newCharTraits, setNewCharTraits] = useState('');
  const [newCharOccupation, setNewCharOccupation] = useState('');
  const [newCharGoal, setNewCharGoal] = useState('');
  const [createStep, setCreateStep] = useState(0);

  // Edit Form states
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editAge, setEditAge] = useState<string>('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editZodiac, setEditZodiac] = useState('');
  const [editShio, setEditShio] = useState('');
  const [editPhysicalBuild, setEditPhysicalBuild] = useState('');
  const [editDistinctFeatures, setEditDistinctFeatures] = useState('');
  const [editClothingStyle, setEditClothingStyle] = useState('');
  const [editPersonalityType, setEditPersonalityType] = useState('');
  const [editTraits, setEditTraits] = useState('');
  const [editFlaws, setEditFlaws] = useState('');
  const [editHabits, setEditHabits] = useState('');
  const [editFears, setEditFears] = useState('');
  const [editValues, setEditValues] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editDailyRoutine, setEditDailyRoutine] = useState('');
  const [editSocialOrientation, setEditSocialOrientation] = useState('');
  const [editInnerWound, setEditInnerWound] = useState('');
  const [editPrimaryGoal, setEditPrimaryGoal] = useState('');
  const [editAspiration, setEditAspiration] = useState('');
  const [editSecretBackstory, setEditSecretBackstory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRole, setEditRole] = useState('');

  // State Modal form
  const [stateMood, setStateMood] = useState('');
  const [stateActivity, setStateActivity] = useState('');
  const [stateCondition, setStateCondition] = useState('');
  const [stateGoal, setStateGoal] = useState('');
  const [stateVitality, setStateVitality] = useState('');

  // Behavior Modal form
  const [behPattern, setBehPattern] = useState('');
  const [behContext, setBehContext] = useState('');
  const [behFrequency, setBehFrequency] = useState('');
  const [behTriggers, setBehTriggers] = useState('');
  const [behTypicalResponse, setBehTypicalResponse] = useState('');
  const [behIntensity, setBehIntensity] = useState('');

  // Style Modal form
  const [styleLanguage, setStyleLanguage] = useState('');
  const [styleWordChoice, setStyleWordChoice] = useState('');
  const [styleFormality, setStyleFormality] = useState('');
  const [styleSentencePattern, setStyleSentencePattern] = useState('');
  const [styleVerbalSignature, setStyleVerbalSignature] = useState('');
  const [styleCommonExpressions, setStyleCommonExpressions] = useState('');

  // Knowledge Modal form
  const [knowStatement, setKnowStatement] = useState('');
  const [knowSubject, setKnowSubject] = useState('');
  const [knowCertainty, setKnowCertainty] = useState('FACT');
  const [knowSource, setKnowSource] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchCharacterWorkspace(id);
      setData(res);
      if (res) {
        setEditDisplayName(res.identity.displayName || '');
        setEditNickname(res.identity.nickname || '');
        setEditAge(res.identity.age ? String(res.identity.age) : '');
        setEditBirthDate(res.identity.birthDate || '');
        setEditZodiac(res.identity.zodiac || '');
        setEditShio(res.identity.shio || '');
        setEditPhysicalBuild(res.appearance.physicalBuild || '');
        setEditDistinctFeatures(res.appearance.distinctFeatures || '');
        setEditClothingStyle(res.appearance.clothingStyle || '');
        setEditPersonalityType(res.personality.personalityType || '');
        setEditTraits((res.personality.traits || []).join(', '));
        setEditFlaws((res.personality.flaws || []).join(', '));
        setEditHabits((res.personality.habits || []).join(', '));
        setEditFears((res.personality.fears || []).join(', '));
        setEditValues((res.personality.values || []).join(', '));
        setEditOccupation(res.life.occupation || '');
        setEditDailyRoutine(res.life.dailyRoutine || '');
        setEditSocialOrientation(res.social.socialOrientation || '');
        setEditInnerWound(res.narrative.innerWound || '');
        setEditPrimaryGoal(res.narrative.primaryGoal || '');
        setEditAspiration(res.narrative.aspiration || '');
        setEditSecretBackstory(res.narrative.secretBackstory || '');
        setEditNotes(res.narrative.notes || '');
        setEditRole(res.actor.role || '');

        setStateMood(res.currentState.mood || '');
        setStateActivity(res.currentState.activity || '');
        setStateCondition(res.currentState.condition || '');
        setStateGoal(res.currentState.goal || '');
        setStateVitality(res.currentState.vitality || '');

        if (res.behavior) {
          setBehPattern(res.behavior.behaviorPattern || '');
          setBehContext(res.behavior.behaviorContext || '');
          setBehFrequency(res.behavior.behaviorFrequency || '');
          setBehTriggers((res.behavior.triggers || []).join(', '));
          setBehTypicalResponse(res.behavior.typicalResponse || '');
          setBehIntensity(res.behavior.responseIntensity || '');
        }

        if (res.style) {
          setStyleLanguage(res.style.languageStyle || '');
          setStyleWordChoice(res.style.wordChoice || '');
          setStyleFormality(res.style.formalityLevel || '');
          setStyleSentencePattern(res.style.sentencePattern || '');
          setStyleVerbalSignature(res.style.verbalSignature || '');
          setStyleCommonExpressions((res.style.commonExpressions || []).join(', '));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (characterId) {
      void loadData(characterId);
    } else {
      setData(null);
    }
  }, [characterId]);

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim() || !onAddCharacter) return;
    setIsSubmitting(true);
    try {
      await onAddCharacter({
        displayName: newCharName.trim(),
        role: newCharRole.trim() || undefined,
        personalityType: newCharPersonality.trim() || undefined,
        traits: newCharTraits ? newCharTraits.split(',').map((s) => s.trim()).filter(Boolean) : [],
        occupation: newCharOccupation.trim() || undefined,
        goal: newCharGoal.trim() || undefined,
      });
      setNewCharName('');
      setNewCharRole('');
      setNewCharPersonality('');
      setNewCharTraits('');
      setNewCharOccupation('');
      setNewCharGoal('');
      setCreateStep(0);
      setIsCreateCharModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no character is selected, render the clean Character List View directly
  if (!characterId) {
    const normalizedQuery = characterQuery.trim().toLocaleLowerCase('id-ID');
    const visibleCharacters = normalizedQuery
      ? allCharacters.filter((c) => {
          const haystack = [c.displayName, c.role, c.occupation, c.personalityType, ...(c.traits || [])]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('id-ID');
          return haystack.includes(normalizedQuery);
        })
      : allCharacters;
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header with direct + Buat Tokoh button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Tokoh Semesta Cerita
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelola tokoh, sifat, hubungan, dan kondisi dalam dunia cerita.
            </p>
          </div>

          <Button
            kind="clay"
            size="sm"
            onClick={() => setIsCreateCharModalOpen(true)}
            className="flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Buat Tokoh</span>
          </Button>
        </div>

        {allCharacters.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={characterQuery}
              onChange={(e) => setCharacterQuery(e.target.value)}
              placeholder="Cari nama, peran, pekerjaan, atau sifat..."
              aria-label="Cari tokoh"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-400"
            />
          </div>
        )}

        {allCharacters.length > 0 ? (
          visibleCharacters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCharacters.map((c) => (
              <Card
                key={c.id}
                className="p-5 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
              >
                <div onClick={() => onSelectCharacter(c.id)} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-900 font-black text-base shadow-inner shrink-0">
                        {c.displayName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition truncate max-w-[150px]">
                          {c.displayName}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {c.role || 'Belum ditentukan'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Tipe: </span>
                    <span>{c.personalityType || 'Belum diisi'}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {c.traits && c.traits.length > 0 ? (
                      c.traits.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-lg border border-amber-200"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Belum ada sifat yang tercatat
                      </span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>Buka Ruang Profil Tokoh</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          ) : (
            <Card className="p-10 text-center border-slate-200 bg-white shadow-xs">
              <Search className="h-6 w-6 mx-auto text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">Tokoh tidak ditemukan</h3>
              <p className="mt-1 text-xs text-slate-500">Tidak ada tokoh yang cocok dengan pencarian saat ini.</p>
            </Card>
          )
        ) : (
          <Card className="p-12 text-center space-y-4 max-w-lg mx-auto border border-slate-200 bg-white shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-xs">
              <User className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Belum Ada Tokoh</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Tokoh yang Anda buat akan menjadi bagian dari dunia cerita aktif.
              </p>
            </div>
            <div className="pt-2">
              <Button kind="clay" size="md" onClick={() => setIsCreateCharModalOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                <span>+ Buat Tokoh</span>
              </Button>
            </div>
          </Card>
        )}

        {/* Modal: Character Builder */}
        <Modal
          isOpen={isCreateCharModalOpen}
          onClose={() => { setIsCreateCharModalOpen(false); setCreateStep(0); }}
          title="Buat Tokoh"
          subtitle="Susun identitas dan karakterisasi tokoh tanpa mengisi fakta yang belum Anda tentukan."
        >
          <form onSubmit={handleCreateCharacter} className="space-y-5 text-xs">
            <div className="grid grid-cols-4 gap-1.5">
              {['Identitas', 'Karakter', 'Narasi', 'Review'].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => index <= createStep && setCreateStep(index)}
                  className={`rounded-xl px-2 py-2 text-[11px] font-bold transition ${index === createStep
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : index < createStep
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  <span className="block text-[10px] opacity-60">{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            {createStep === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="font-black text-slate-900">Mulai dari siapa tokoh ini?</p>
                  <p className="mt-1 leading-relaxed text-slate-600">
                    Nama adalah satu-satunya informasi wajib. Peran, pekerjaan, dan informasi lain dapat ditentukan nanti.
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Nama Tokoh *</label>
                  <input autoFocus type="text" required value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="Masukkan nama tokoh" className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-400" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Peran Naratif</label>
                    <input type="text" value={newCharRole} onChange={(e) => setNewCharRole(e.target.value)} placeholder="Belum ditentukan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Pekerjaan / Peran</label>
                    <input type="text" value={newCharOccupation} onChange={(e) => setNewCharOccupation(e.target.value)} placeholder="Belum ditentukan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400" />
                  </div>
                </div>
              </div>
            )}

            {createStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Karakterisasi</p>
                  <p className="mt-1 leading-relaxed text-slate-600">Isi hanya karakteristik yang sudah Anda ketahui. Tidak ada tipe kepribadian atau sifat yang dipilih otomatis.</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Tipe Kepribadian</label>
                  <input type="text" value={newCharPersonality} onChange={(e) => setNewCharPersonality(e.target.value)} placeholder="Belum ditentukan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Sifat & Karakter</label>
                  <input type="text" value={newCharTraits} onChange={(e) => setNewCharTraits(e.target.value)} placeholder="Pisahkan beberapa sifat dengan koma" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400" />
                  <p className="mt-1 text-[11px] text-slate-400">Contoh format: sabar, teliti, keras kepala. Contoh ini tidak akan disimpan.</p>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Narasi</p>
                  <p className="mt-1 leading-relaxed text-slate-600">Tujuan pribadi bersifat opsional dan dapat ditambahkan atau diubah setelah tokoh dibuat.</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Tujuan Pribadi</label>
                  <textarea rows={4} value={newCharGoal} onChange={(e) => setNewCharGoal(e.target.value)} placeholder="Belum ditentukan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-amber-400 resize-none" />
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="font-black text-slate-900">Review sebelum dibuat</p>
                  <p className="mt-1 leading-relaxed text-slate-600">Periksa nilai yang akan dikirim. Field yang kosong tidak akan diisi secara otomatis.</p>
                </div>
                {[
                  ['Nama', newCharName], ['Peran naratif', newCharRole], ['Pekerjaan / peran', newCharOccupation],
                  ['Tipe kepribadian', newCharPersonality], ['Sifat & karakter', newCharTraits], ['Tujuan pribadi', newCharGoal],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-3.5 py-3">
                    <span className="font-bold text-slate-500">{label}</span>
                    <span className={`text-right font-semibold ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>{value || 'Belum ditentukan'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <Button type="button" kind="secondary" size="sm" onClick={() => createStep > 0 ? setCreateStep(createStep - 1) : setIsCreateCharModalOpen(false)}>{createStep > 0 ? 'Kembali' : 'Batal'}</Button>
              {createStep < 3 ? (
                <Button type="button" kind="clay" size="sm" disabled={createStep === 0 && !newCharName.trim()} onClick={() => setCreateStep(createStep + 1)}>Lanjut <ChevronRight className="h-4 w-4" /></Button>
              ) : (
                <Button type="submit" kind="clay" size="sm" disabled={isSubmitting || !newCharName.trim()}>{isSubmitting ? 'Mendaftarkan...' : 'Buat Tokoh'}</Button>
              )}
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium">
        Memuat profil tokoh...
      </div>
    );
  }

  // Handle Edit Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onEditCharacter || !data) return;
    setIsSubmitting(true);
    try {
      await onEditCharacter(data.id, {
        displayName: editDisplayName.trim(),
        nickname: editNickname.trim() || undefined,
        age: editAge ? Number(editAge) : undefined,
        birthDate: editBirthDate.trim() || undefined,
        zodiac: editZodiac.trim() || undefined,
        shio: editShio.trim() || undefined,
        physicalBuild: editPhysicalBuild.trim() || undefined,
        distinctFeatures: editDistinctFeatures.trim() || undefined,
        clothingStyle: editClothingStyle.trim() || undefined,
        personalityType: editPersonalityType.trim() || undefined,
        traits: editTraits ? editTraits.split(',').map((s) => s.trim()).filter(Boolean) : [],
        flaws: editFlaws ? editFlaws.split(',').map((s) => s.trim()).filter(Boolean) : [],
        habits: editHabits ? editHabits.split(',').map((s) => s.trim()).filter(Boolean) : [],
        fears: editFears ? editFears.split(',').map((s) => s.trim()).filter(Boolean) : [],
        coreValues: editValues ? editValues.split(',').map((s) => s.trim()).filter(Boolean) : [],
        occupation: editOccupation.trim() || undefined,
        dailyRoutine: editDailyRoutine.trim() || undefined,
        socialOrientation: editSocialOrientation,
        innerWound: editInnerWound.trim() || undefined,
        primaryGoal: editPrimaryGoal.trim() || undefined,
        aspiration: editAspiration.trim() || undefined,
        secretBackstory: editSecretBackstory.trim() || undefined,
        notes: editNotes.trim() || undefined,
        role: editRole,
      });
      setIsEditModalOpen(false);
      await loadData(data.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle State Submit
  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateState || !data) return;
    setIsSubmitting(true);
    try {
      await onUpdateState(data.id, {
        mood: stateMood.trim() || undefined,
        activity: stateActivity.trim() || undefined,
        condition: stateCondition.trim() || undefined,
        goal: stateGoal.trim() || undefined,
        vitality: stateVitality,
      });
      setIsStateModalOpen(false);
      await loadData(data.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Behavior Submit
  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBehavior || !data) return;
    setIsSubmitting(true);
    try {
      await onUpdateBehavior(data.id, {
        behaviorPattern: behPattern.trim(),
        behaviorContext: behContext.trim() || undefined,
        behaviorFrequency: behFrequency,
        triggers: behTriggers ? behTriggers.split(',').map((s) => s.trim()).filter(Boolean) : [],
        typicalResponse: behTypicalResponse.trim() || undefined,
        responseIntensity: behIntensity,
      });
      setIsBehaviorModalOpen(false);
      await loadData(data.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Style Submit
  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateStyle || !data) return;
    setIsSubmitting(true);
    try {
      await onUpdateStyle(data.id, {
        languageStyle: styleLanguage.trim() || undefined,
        wordChoice: styleWordChoice.trim() || undefined,
        formalityLevel: styleFormality.trim() || undefined,
        sentencePattern: styleSentencePattern.trim() || undefined,
        verbalSignature: styleVerbalSignature.trim() || undefined,
        commonExpressions: styleCommonExpressions
          ? styleCommonExpressions.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      });
      setIsStyleModalOpen(false);
      await loadData(data.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Knowledge Submit
  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddKnowledge || !data) return;
    setIsSubmitting(true);
    try {
      await onAddKnowledge(data.id, {
        statement: knowStatement.trim(),
        referencedSubject: knowSubject.trim() || 'Fakta Semesta',
        certainty: knowCertainty,
        acquisitionSource: knowSource.trim() || undefined,
      });
      setKnowStatement('');
      setKnowSubject('');
      setIsKnowledgeModalOpen(false);
      await loadData(data.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiProfileAssist = async () => {
    if (!onAiAssist) return;
    setIsAiLoading(true);
    try {
      const res = await onAiAssist('CHARACTER_PROFILE', {
        name: editDisplayName || data.identity.displayName,
        archetype: editRole,
      });
      if (res?.proposal) {
        const p = res.proposal;
        if (!editDisplayName && p.displayName) setEditDisplayName(p.displayName);
        if (p.nickname) setEditNickname(p.nickname);
        if (p.age) setEditAge(String(p.age));
        if (p.birthDate) setEditBirthDate(p.birthDate);
        if (p.zodiac) setEditZodiac(p.zodiac);
        if (p.shio) setEditShio(p.shio);
        if (p.distinctFeatures) setEditDistinctFeatures(p.distinctFeatures);
        if (p.physicalBuild) setEditPhysicalBuild(p.physicalBuild);
        if (p.clothingStyle) setEditClothingStyle(p.clothingStyle);
        if (p.personalityType) setEditPersonalityType(p.personalityType);
        if (p.traits) setEditTraits(p.traits.join(', '));
        if (p.flaws) setEditFlaws(p.flaws.join(', '));
        if (p.habits) setEditHabits(p.habits.join(', '));
        if (p.fears) setEditFears(p.fears.join(', '));
        if (p.coreValues) setEditValues(p.coreValues.join(', '));
        if (p.occupation) setEditOccupation(p.occupation);
        if (p.dailyRoutine) setEditDailyRoutine(p.dailyRoutine);
        if (p.socialOrientation) setEditSocialOrientation(p.socialOrientation);
        if (p.innerWound) setEditInnerWound(p.innerWound);
        if (p.primaryGoal) setEditPrimaryGoal(p.primaryGoal);
        if (p.aspiration) setEditAspiration(p.aspiration);
        if (p.secretBackstory) setEditSecretBackstory(p.secretBackstory);
        if (p.notes) setEditNotes(p.notes);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button kind="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span>Semua Tokoh</span>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-xs text-slate-500 font-bold">Profil Tokoh:</span>
          <span className="text-xs text-slate-900 font-black">{data.identity.displayName}</span>
        </div>

        {/* Character switcher dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold hidden sm:inline">Pilih Tokoh:</span>
          <select
            value={data.id}
            onChange={(e) => onSelectCharacter(e.target.value)}
            className="px-3 py-1.5 text-xs text-slate-900 font-bold rounded-xl border border-slate-200 bg-white"
          >
            {allCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Character Card */}
      <Card className="p-6 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 border border-amber-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl shadow-xs border border-amber-200">
              {data.identity.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  {data.identity.displayName}
                </h3>
                {data.identity.nickname && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                    "{data.identity.nickname}"
                  </span>
                )}
                <StatusBadge status={data.identity.status} />
              </div>

              <p className="text-xs text-slate-600 font-semibold mt-1">
                {data.actor.role || 'Belum ditentukan'} • {data.life.occupation || 'Belum diisi'} {data.identity.age ? `• ${data.identity.age} Tahun` : ''}
              </p>

              <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-600 font-medium flex-wrap">
                <span>📍 <strong className="text-slate-800">{data.location?.displayName || 'Belum ditentukan'}</strong></span>
                <span>•</span>
                <span>✨ Vitalitas: <strong className="text-slate-800">{data.currentState.vitality}</strong></span>
                <span>•</span>
                <span>🛡️ Kontinuitas: <strong className="text-emerald-700">{data.continuity.status}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <Button
              kind="clay"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Profil</span>
            </Button>
            <Button
              kind="secondary"
              size="sm"
              onClick={() => setIsStateModalOpen(true)}
              className="gap-1.5"
            >
              <Activity className="h-4 w-4 text-amber-600" />
              <span>Perbarui Kondisi</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Workspace Navigation */}
      <div className="space-y-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="Bagian utama profil tokoh">
          {[
            { id: 'overview', label: 'Ringkasan', icon: Eye },
            { id: 'profile', label: 'Profil', icon: User },
            { id: 'state', label: 'Kondisi', icon: Activity },
            { id: 'relationships', label: `Relasi (${data.relationships.length})`, icon: Heart },
            { id: 'timeline', label: 'Riwayat', icon: Clock },
            { id: 'continuity', label: 'Kontinuitas', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-xs border border-amber-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Detail</span>
          <select
            aria-label="Bagian detail profil tokoh"
            value={['actor','behavior','style','knowledge','possessions','location'].includes(activeTab) ? activeTab : ''}
            onChange={(e) => e.target.value && setActiveTab(e.target.value as any)}
            className="min-w-0 flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-400"
          >
            <option value="">Pilih bagian detail…</option>
            <option value="actor">Pemeran</option>
            <option value="behavior">Pola Perilaku</option>
            <option value="style">Gaya Bahasa</option>
            <option value="knowledge">Pengetahuan ({data.knowledge.length})</option>
            <option value="possessions">Benda ({data.possessions.length})</option>
            <option value="location">Lokasi</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Ringkasan */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              <span>Esensi Karakter</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tipe Kepribadian</span>
                <span className="font-bold text-slate-800">{data.personality.personalityType || 'Belum diisi'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Orientasi Sosial</span>
                <span className="font-bold text-slate-800">{data.social.socialOrientation || 'Belum ditentukan'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Pekerjaan / Peran</span>
                <span className="font-bold text-slate-800">{data.life.occupation || 'Belum diisi'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tujuan Utama</span>
                <span className="font-bold text-slate-800">{data.narrative.primaryGoal || 'Belum dicatat'}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-2">Sifat & Karakter Utama:</div>
              <div className="flex flex-wrap gap-1.5">
                {data.personality.traits && data.personality.traits.length > 0 ? (
                  data.personality.traits.map((trait, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold rounded-xl border border-amber-200"
                    >
                      {trait}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Belum ada sifat yang tercatat</span>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Status & Suasana Terkini</span>
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kondisi Vitalitas:</span>
                <span className="font-bold text-slate-900">{data.currentState.vitality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Suasana Hati (Mood):</span>
                <span className="font-bold text-slate-800">{data.currentState.mood || 'Belum dicatat'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Aktivitas Saat Ini:</span>
                <span className="font-bold text-slate-800">{data.currentState.activity || 'Belum dicatat'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lokasi Keberadaan:</span>
                <span className="font-bold text-slate-800">{data.location?.displayName || 'Belum ditentukan'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold">Luka Batin / Motif Terdalam:</div>
              <div className="italic">{data.narrative.innerWound || 'Belum ada luka batin yang tercatat.'}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Profil & Fisik */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Identitas & Kelahiran</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Lengkap</span>
                <span className="font-bold text-slate-900">{data.identity.displayName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Panggilan</span>
                <span className="font-bold text-slate-900">{data.identity.nickname || 'Tidak ada'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Usia</span>
                <span className="font-bold text-slate-900">{data.identity.age ? `${data.identity.age} Tahun` : 'Belum tercatat'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tanggal Lahir</span>
                <span className="font-bold text-slate-900">{data.identity.birthDate || 'Belum tercatat'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Zodiak / Shio</span>
                <span className="font-bold text-slate-900">
                  {data.identity.zodiac || 'Belum tercatat'} {data.identity.shio ? `(${data.identity.shio})` : ''}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Penampilan & Fisik</h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Ciri Khas / Fitur Khusus:</span>
                <span className="text-slate-800">{data.appearance.distinctFeatures || 'Belum ada ciri khusus yang dicatat.'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Bentuk Fisik & Postur:</span>
                <span className="text-slate-800">{data.appearance.physicalBuild || 'Belum tercatat'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Gaya Busana & Pakaian:</span>
                <span className="text-slate-800">{data.appearance.clothingStyle || 'Belum tercatat'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Pemeran / Aktor */}
      {activeTab === 'actor' && (
        <Card className="p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Klasifikasi Aktor & Struktur Penokohan</h4>
              <p className="text-xs text-slate-500">Posisi tokoh dalam hierarki narasi.</p>
            </div>
            <Award className="h-6 w-6 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] uppercase font-bold text-amber-700">Peran Aktor (Role)</div>
              <div className="text-sm font-black text-amber-950 mt-1">{data.actor.role || 'Belum ditentukan'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Tingkat Pengalaman (Level)</div>
              <div className="text-sm font-black text-slate-900 mt-1">{data.actor.level || 'Belum ditentukan'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Afiliasi / Kelompok</div>
              <div className="text-sm font-black text-slate-900 mt-1">{data.actor.group || 'Belum ditentukan'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Sumber Data</div>
              <div className="text-sm font-black text-slate-900 mt-1">{data.actor.source || 'USER_DEFINED'}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Kondisi Dinamis */}
      {activeTab === 'state' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Keadaan Dinamis Tokoh</h4>
              <p className="text-xs text-slate-500">Kondisi fisik, emosional, dan aktivitas saat ini.</p>
            </div>
            <Button kind="clay" size="sm" onClick={() => setIsStateModalOpen(true)} className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span>Perbarui Kondisi</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Vitalitas</span>
              <div className="text-base font-black text-emerald-700">{data.currentState.vitality}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Suasana Hati (Mood)</span>
              <div className="text-base font-black text-slate-800">{data.currentState.mood || 'Belum dicatat'}</div>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Aktivitas Terkini</span>
              <div className="text-base font-black text-slate-800">{data.currentState.activity || 'Belum dicatat'}</div>
            </Card>
          </div>

          <Card className="p-5 space-y-3">
            <h5 className="text-xs font-bold text-slate-700">Tujuan Langsung (Immediate Goal)</h5>
            <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {data.currentState.goal || data.narrative.primaryGoal || 'Belum dicatat.'}
            </p>
          </Card>
        </div>
      )}

      {/* Tab 5: Pola Perilaku */}
      {activeTab === 'behavior' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Pola Perilaku & Tindakan Khas</h4>
              <p className="text-xs text-slate-500">Kebiasaan aksi, reaksi terhadap pemicu, dan intensitas respons.</p>
            </div>
            <Button kind="clay" size="sm" onClick={() => setIsBehaviorModalOpen(true)} className="gap-1.5">
              <Zap className="h-4 w-4" />
              <span>{data.behavior ? 'Perbarui Perilaku' : 'Tambah Perilaku'}</span>
            </Button>
          </div>

          {data.behavior ? (
            <Card className="p-6 space-y-4">
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-800 font-bold block mb-1">Pola Perilaku Utama:</span>
                  <span className="text-slate-900 font-medium">{data.behavior.behaviorPattern}</span>
                </div>
                {data.behavior.behaviorContext && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">Konteks Munculnya:</span>
                    <span className="text-slate-800">{data.behavior.behaviorContext}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">Frekuensi:</span>
                    <span className="font-bold text-slate-900">{data.behavior.behaviorFrequency || 'Belum ditentukan'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">Intensitas Respons:</span>
                    <span className="font-bold text-slate-900">{data.behavior.responseIntensity || 'Belum ditentukan'}</span>
                  </div>
                </div>
                {data.behavior.typicalResponse && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">Respons Tipikal:</span>
                    <span className="text-slate-800">{data.behavior.typicalResponse}</span>
                  </div>
                )}
                {data.behavior.triggers && data.behavior.triggers.length > 0 && (
                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Faktor Pemicu (Triggers):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.behavior.triggers.map((tr, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg">
                          {tr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-xs text-slate-500">
              Belum ada pola perilaku terstruktur yang dicatat untuk tokoh ini.
            </Card>
          )}
        </div>
      )}

      {/* Tab 6: Gaya Bahasa */}
      {activeTab === 'style' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Gaya Bahasa & Komunikasi Khas</h4>
              <p className="text-xs text-slate-500">Pilihan diksi, formalitas, ciri bicara, dan ekspresi khas.</p>
            </div>
            <Button kind="clay" size="sm" onClick={() => setIsStyleModalOpen(true)} className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>{data.style ? 'Perbarui Gaya Bahasa' : 'Atur Gaya Bahasa'}</span>
            </Button>
          </div>

          {data.style ? (
            <Card className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-1">Gaya Tutur Bahasa:</span>
                  <span className="font-bold text-slate-900">{data.style.languageStyle || 'Belum tercatat'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-1">Pilihan Diksi:</span>
                  <span className="font-bold text-slate-900">{data.style.wordChoice || 'Belum tercatat'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-1">Tingkat Formalitas:</span>
                  <span className="font-bold text-slate-900">{data.style.formalityLevel || 'Belum diisi'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-1">Pola Kalimat:</span>
                  <span className="font-bold text-slate-900">{data.style.sentencePattern || 'Belum tercatat'}</span>
                </div>
              </div>

              {data.style.verbalSignature && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block mb-1">Ciri Khas Verbal (Verbal Signature):</span>
                  <span className="italic text-amber-950 font-medium">"{data.style.verbalSignature}"</span>
                </div>
              )}

              {data.style.commonExpressions && data.style.commonExpressions.length > 0 && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Ungkapan / Frasa Khas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.style.commonExpressions.map((exp, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200">
                        "{exp}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 text-center text-xs text-slate-500">
              Belum ada gaya bahasa khas yang dicatat untuk tokoh ini.
            </Card>
          )}
        </div>
      )}

      {/* Tab 7: Pengetahuan */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Kumpulan Pengetahuan & Fakta Tokoh</h4>
              <p className="text-xs text-slate-500">Fakta, keyakinan, dan rahasia yang diketahui oleh tokoh ini.</p>
            </div>
            <Button kind="clay" size="sm" onClick={() => setIsKnowledgeModalOpen(true)} className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>Tambah Pengetahuan</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.knowledge.map((k) => (
              <Card key={k.id} className="p-4 space-y-2 text-xs border border-slate-200 hover:border-amber-400 transition">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    {k.certainty === 1 || k.certainty === 'FACT' ? 'Fakta Pasti' : 'Keyakinan'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{k.acquisitionSource || 'Langsung'}</span>
                </div>
                <p className="text-slate-900 font-bold">{k.statement}</p>
                {k.subject && (
                  <div className="text-[11px] text-slate-500">Subjek terkait: <strong>{k.subject}</strong></div>
                )}
              </Card>
            ))}
            {data.knowledge.length === 0 && (
              <div className="col-span-2 p-8 text-center text-xs text-slate-500">
                Belum ada catatan pengetahuan khusus untuk tokoh ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 8: Relasi */}
      {activeTab === 'relationships' && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Jejaring Relasi Antartokoh</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.relationships.map((rel) => (
              <Card key={rel.id} className="p-4 space-y-2 text-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-slate-900">{rel.otherCharacterName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    {rel.relationshipType}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                  <div className="font-semibold text-slate-800">{rel.dynamic || 'Dinamika belum tercatat.'}</div>
                  {rel.narrativeBasis && (
                    <div className="text-slate-500 text-[11px] mt-0.5">{rel.narrativeBasis}</div>
                  )}
                </div>
              </Card>
            ))}
            {data.relationships.length === 0 && (
              <div className="col-span-2 p-8 text-center text-xs text-slate-500">
                Belum ada relasi yang terhubung dengan tokoh ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 9: Benda Bawaan */}
      {activeTab === 'possessions' && (
        <div className="space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Benda & Pusaka yang Dimiliki</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.possessions.map((item) => (
              <Card key={item.id} className="p-4 space-y-2 text-xs border border-slate-200">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="font-bold text-slate-900">{item.displayName}</span>
                </div>
                <div className="space-y-1 text-slate-600 text-[11px]">
                  <div>Tipe: <strong className="text-slate-800">{item.objectType}</strong></div>
                  <div>Kondisi: <strong className="text-slate-800">{item.condition}</strong></div>
                  <div>Status: <strong className="text-slate-800">{item.possessionStatus}</strong></div>
                </div>
              </Card>
            ))}
            {data.possessions.length === 0 && (
              <div className="col-span-3 p-8 text-center text-xs text-slate-500">
                Tokoh ini belum membawa atau memiliki benda pusaka.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 10: Lokasi */}
      {activeTab === 'location' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Lokasi & Konteks Spasial Saat Ini</h4>
          {data.location ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{data.location.displayName}</span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-lg">
                  {data.location.locationType}
                </span>
              </div>
              {data.location.description && (
                <p className="text-slate-600">{data.location.description}</p>
              )}
              {data.location.accessibilityStatus && (
                <div className="text-[11px] text-slate-500">Aksesibilitas: <strong>{data.location.accessibilityStatus}</strong></div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              Lokasi tokoh belum ditentukan.
            </div>
          )}
        </Card>
      )}

      {/* Tab 11: Garis Waktu */}
      {activeTab === 'timeline' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <h4 className="text-sm font-black text-slate-900">Garis Waktu Peristiwa Tokoh</h4>
          {data.timeline.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
              {data.timeline.map((event, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-6 text-xs">
                  <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white shadow-xs" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 block">{event.date}</span>
                    <p className="text-slate-800 font-medium mt-0.5">{event.event}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              Belum ada catatan linimasa untuk tokoh ini.
            </div>
          )}
        </Card>
      )}

      {/* Tab 12: Kontinuitas */}
      {activeTab === 'continuity' && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Status Kontinuitas Kanun</h4>
              <p className="text-xs text-slate-500">Keselarasan data tokoh terhadap hukum dunia cerita.</p>
            </div>
            <Shield className="h-6 w-6 text-emerald-600" />
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs text-emerald-950 font-bold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Seluruh status identitas, peran, dan relasi valid dalam kanun.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-0.5">Status Validasi:</span>
              <span className="font-bold text-emerald-700">{data.continuity.status}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold block mb-0.5">Tanggal Verifikasi Terakhir:</span>
              <span className="font-bold text-slate-800">{data.continuity.lastCheckedDate || 'Belum tercatat'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL: Edit Profile */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profil Tokoh"
        subtitle="Ubah atribut karakter secara mendalam."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex justify-end">
            <Button
              type="button"
              kind="secondary"
              size="sm"
              onClick={handleAiProfileAssist}
              disabled={isAiLoading}
              className="gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5 text-amber-600" />
              <span>{isAiLoading ? 'Menyusun Usulan...' : 'Bantuan Usulan AI'}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Tokoh *</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Panggilan</label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="Contoh: Sang Tabib"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Usia</label>
              <input
                type="number"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="text"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                placeholder="Contoh: 14 Bulan Sabit"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Zodiak</label>
              <input
                type="text"
                value={editZodiac}
                onChange={(e) => setEditZodiac(e.target.value)}
                placeholder="Aries"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Shio</label>
              <input
                type="text"
                value={editShio}
                onChange={(e) => setEditShio(e.target.value)}
                placeholder="Naga"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipe Kepribadian</label>
              <input
                type="text"
                value={editPersonalityType}
                onChange={(e) => setEditPersonalityType(e.target.value)}
                placeholder="Contoh: Cermat & Rasional"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pekerjaan / Profesi</label>
              <input
                type="text"
                value={editOccupation}
                onChange={(e) => setEditOccupation(e.target.value)}
                placeholder="Contoh: Penjaga Arsip"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sifat Positif (Pisahkan koma)</label>
              <input
                type="text"
                value={editTraits}
                onChange={(e) => setEditTraits(e.target.value)}
                placeholder="Contoh: Gigih, Jujur"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kelemahan Karakter</label>
              <input
                type="text"
                value={editFlaws}
                onChange={(e) => setEditFlaws(e.target.value)}
                placeholder="Contoh: Keras kepala, Ceroboh"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tujuan Utama</label>
              <input
                type="text"
                value={editPrimaryGoal}
                onChange={(e) => setEditPrimaryGoal(e.target.value)}
                placeholder="Contoh: Memecahkan teka-teki prasasti"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Luka Batin</label>
              <input
                type="text"
                value={editInnerWound}
                onChange={(e) => setEditInnerWound(e.target.value)}
                placeholder="Contoh: Rasa bersalah kegagalan masa lalu"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Update State */}
      <Modal
        isOpen={isStateModalOpen}
        onClose={() => setIsStateModalOpen(false)}
        title="Perbarui Kondisi Dinamis Tokoh"
        subtitle="Ubah suasana hati, aktivitas, atau vitalitas saat ini."
      >
        <form onSubmit={handleSaveState} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Vitalitas</label>
            <select
              value={stateVitality}
              onChange={(e) => setStateVitality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="">Belum ditentukan</option>
              <option value="NORMAL">NORMAL & BUGAR</option>
              <option value="TIRED">LELAH</option>
              <option value="INJURED">TERLUKA</option>
              <option value="EXHAUSTED">KRITIS</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Suasana Hati (Mood)</label>
            <input
              type="text"
              value={stateMood}
              onChange={(e) => setStateMood(e.target.value)}
              placeholder="Contoh: Waspada"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Aktivitas Terkini</label>
            <input
              type="text"
              value={stateActivity}
              onChange={(e) => setStateActivity(e.target.value)}
              placeholder="Contoh: Meneliti gulungan perkamen"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tujuan Langsung</label>
            <input
              type="text"
              value={stateGoal}
              onChange={(e) => setStateGoal(e.target.value)}
              placeholder="Contoh: Mencari jalur rahasia"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsStateModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Perbarui Status'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Update Behavior */}
      <Modal
        isOpen={isBehaviorModalOpen}
        onClose={() => setIsBehaviorModalOpen(false)}
        title="Atur Pola Perilaku Karakter"
        subtitle="Tetapkan pola aksi, pemicu, dan intensitas reaksi."
      >
        <form onSubmit={handleSaveBehavior} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pola Perilaku *</label>
            <input
              type="text"
              value={behPattern}
              onChange={(e) => setBehPattern(e.target.value)}
              placeholder="Contoh: Selalu memeriksa pintu keluar saat memasuki ruangan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              required
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Konteks Munculnya</label>
            <input
              type="text"
              value={behContext}
              onChange={(e) => setBehContext(e.target.value)}
              placeholder="Contoh: Di tempat asing"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Frekuensi</label>
              <select
                value={behFrequency}
                onChange={(e) => setBehFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="">Belum ditentukan</option>
                <option value="ALWAYS">SELALU</option>
                <option value="FREQUENT">SERING</option>
                <option value="OCCASIONAL">KADANG-KADANG</option>
                <option value="RARE">JARANG</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Intensitas Respons</label>
              <select
                value={behIntensity}
                onChange={(e) => setBehIntensity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="">Belum ditentukan</option>
                <option value="HIGH">TINGGI</option>
                <option value="MODERATE">SEDANG</option>
                <option value="LOW">RENDAH</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Faktor Pemicu (Triggers)</label>
            <input
              type="text"
              value={behTriggers}
              onChange={(e) => setBehTriggers(e.target.value)}
              placeholder="Contoh: Suara langkah mencurigakan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsBehaviorModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perilaku'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Update Style */}
      <Modal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        title="Atur Gaya Bahasa & Bicara"
        subtitle="Tetapkan gaya komunikasi khas untuk penulisan dialog."
      >
        <form onSubmit={handleSaveStyle} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Gaya Tutur Bahasa</label>
            <input
              type="text"
              value={styleLanguage}
              onChange={(e) => setStyleLanguage(e.target.value)}
              placeholder="Contoh: Ringkas dan analitis"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilihan Diksi</label>
              <input
                type="text"
                value={styleWordChoice}
                onChange={(e) => setStyleWordChoice(e.target.value)}
                placeholder="Contoh: Arkais"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Formalitas</label>
              <input
                type="text"
                value={styleFormality}
                onChange={(e) => setStyleFormality(e.target.value)}
                placeholder="Contoh: Formal"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Ciri Khas Verbal (Verbal Signature)</label>
            <input
              type="text"
              value={styleVerbalSignature}
              onChange={(e) => setStyleVerbalSignature(e.target.value)}
              placeholder="Contoh: 'Bintang tidak pernah berbohong...'"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsStyleModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Gaya Bicara'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Knowledge */}
      <Modal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
        title="Tambah Pengetahuan Tokoh"
        subtitle="Daftarkan informasi atau fakta yang diketahui karakter ini."
      >
        <form onSubmit={handleSaveKnowledge} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pernyataan Pengetahuan / Fakta *</label>
            <textarea
              value={knowStatement}
              onChange={(e) => setKnowStatement(e.target.value)}
              rows={3}
              placeholder="Pernyataan fakta atau keyakinan yang diketahui..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Subjek Terkait</label>
              <input
                type="text"
                value={knowSubject}
                onChange={(e) => setKnowSubject(e.target.value)}
                placeholder="Contoh: Pusaka Kuno"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tingkat Kepastian</label>
              <select
                value={knowCertainty}
                onChange={(e) => setKnowCertainty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="FACT">FAKTA PASTI (FACT)</option>
                <option value="BELIEF">KEYAKINAN (BELIEF)</option>
                <option value="SUSPICION">KECURIGAAN (SUSPICION)</option>
                <option value="RUMOR">KABAR ANGIN (RUMOR)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Sumber Perolehan</label>
            <input
              type="text"
              value={knowSource}
              onChange={(e) => setKnowSource(e.target.value)}
              placeholder="Contoh: Membaca manuskrip kuno"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" kind="secondary" size="sm" onClick={() => setIsKnowledgeModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" kind="clay" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Tambah Pengetahuan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
