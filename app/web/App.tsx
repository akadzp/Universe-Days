import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Compass,
  Users,
  TestTube,
  Clock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlusCircle,
  Menu,
  X,
  HelpCircle,
  MoreHorizontal
} from 'lucide-react';
import { Sidebar, MobileBottomNav, MobileMoreSheet } from './components/Navigation.tsx';
import { StoryView } from './views/StoryView.tsx';
import { UniverseView } from './views/UniverseView.tsx';
import { CharacterWorkspaceView } from './views/CharacterWorkspaceView.tsx';
import { SandboxView } from './views/SandboxView.tsx';
import { HistoryView } from './views/HistoryView.tsx';
import { StudioCenterView } from './views/StudioCenterView.tsx';
import { CreateStoryModal } from './views/CreateStoryModal.tsx';
import { GuideModal } from './views/GuideModal.tsx';
import { ModeBadge, Button } from './components/UIElements.tsx';
import type {
  View,
  UniverseDetails,
  ControlOverview,
  PageDefinition,
  DeploymentReadiness,
  UsageSummary,
  ProductionRunRecord,
  DailyContextData,
  DevelopmentData,
  TimelineData,
  CharacterWorkspaceData,
} from './types.ts';

function decodeFriendlyError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Terjadi gangguan internal. Silakan coba kembali.';
}

function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return 'Belum tercatat';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  } catch {}
  return dateStr;
}

export function App() {
  const [view, setView] = useState<View>('story');
  const [universe, setUniverse] = useState<UniverseDetails | null>(null);
  const [overview, setOverview] = useState<ControlOverview | null>(null);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [readiness, setReadiness] = useState<DeploymentReadiness | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<ProductionRunRecord[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error' | 'info'; message: string } | null>(null);

  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const isSandbox = universe?.mode === 'SANDBOX' || overview?.runtime?.status?.includes('SANDBOX');

  const showToast = useCallback((t: { tone: 'ok' | 'error' | 'info'; message: string }) => {
    setToast(t);
    setTimeout(() => {
      setToast((prev) => (prev?.message === t.message ? null : prev));
    }, 4000);
  }, []);

  const safeFetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      if (contentType && contentType.includes('application/json')) {
        const errJson = await res.json();
        msg = errJson.message || errJson.error || msg;
      }
      throw new Error(msg);
    }
    return (await res.json()) as T;
  };

  const refresh = useCallback(async () => {
    try {
      const [uData, oData, pData, rData, uSummary, runsData] = await Promise.all([
        safeFetchJson<UniverseDetails>('/api/control/universe').catch(() => null),
        safeFetchJson<ControlOverview>('/api/control/overview').catch(() => null),
        safeFetchJson<PageDefinition[]>('/api/control/pages').catch(() => []),
        safeFetchJson<DeploymentReadiness>('/api/control/deployment-readiness').catch(() => null),
        safeFetchJson<UsageSummary>('/api/control/usage').catch(() => null),
        safeFetchJson<ProductionRunRecord[]>('/api/control/runs').catch(() => []),
      ]);

      if (uData) setUniverse(uData);
      if (oData) setOverview(oData);
      if (pData) setPages(pData);
      if (rData) setReadiness(rData);
      if (uSummary) setUsage(uSummary);
      if (runsData) setRuns(runsData);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Specific Domain Fetchers
  const fetchDailyContext = useCallback(async (): Promise<DailyContextData | null> => {
    try {
      return await safeFetchJson<DailyContextData>('/api/control/story/daily-context');
    } catch {
      return null;
    }
  }, []);

  const fetchDevelopment = useCallback(async (): Promise<DevelopmentData | null> => {
    try {
      return await safeFetchJson<DevelopmentData>('/api/control/story/development');
    } catch {
      return null;
    }
  }, []);

  const fetchTimeline = useCallback(async (): Promise<TimelineData | null> => {
    try {
      return await safeFetchJson<TimelineData>('/api/control/story/timeline');
    } catch {
      return null;
    }
  }, []);

  const fetchCharacterWorkspace = useCallback(async (id: string): Promise<CharacterWorkspaceData | null> => {
    try {
      return await safeFetchJson<CharacterWorkspaceData>(`/api/control/universe/character/${encodeURIComponent(id)}/workspace`);
    } catch {
      return null;
    }
  }, []);

  // Mutation Handlers
  const handleCreateStory = async (storyData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/story/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });
      showToast({
        tone: 'ok',
        message: `Dunia cerita "${storyData.title}" berhasil dibuat!`,
      });
      await refresh();
      setView('story');
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleEditCharacter = async (charId: string, charData: any) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/universe/character/${encodeURIComponent(charId)}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charData),
      });
      showToast({ tone: 'ok', message: 'Profil tokoh berhasil diperbarui!' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCharacterState = async (charId: string, stateData: any) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/universe/character/${encodeURIComponent(charId)}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateData),
      });
      showToast({ tone: 'ok', message: 'Kondisi tokoh berhasil diperbarui!' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCharacterBehavior = async (charId: string, behData: any) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/universe/character/${encodeURIComponent(charId)}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(behData),
      });
      showToast({ tone: 'ok', message: 'Pola perilaku tokoh berhasil disimpan!' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCharacterStyle = async (charId: string, styleData: any) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/universe/character/${encodeURIComponent(charId)}/style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(styleData),
      });
      showToast({ tone: 'ok', message: 'Gaya bahasa tokoh berhasil disimpan!' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddCharacterKnowledge = async (charId: string, knowData: any) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/universe/character/${encodeURIComponent(charId)}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowData),
      });
      showToast({ tone: 'ok', message: 'Pengetahuan baru berhasil dicatat!' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleProduceStory = async (options?: any) => {
    setBusy(true);
    try {
      await safeFetchJson<ProductionRunRecord>('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || { purpose: 'DAILY_STORY' }),
      });
      showToast({
        tone: 'ok',
        message: 'Naskah bab hari ini berhasil diterbitkan!',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddCharacter = async (charData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/character/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charData),
      });
      showToast({
        tone: 'ok',
        message: `Tokoh "${charData.displayName}" berhasil didaftarkan ke dunia cerita!`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddLocation = async (locData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/location/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locData),
      });
      showToast({
        tone: 'ok',
        message: `Wilayah "${locData.displayName}" berhasil ditambahkan!`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddObject = async (objData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/object/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData),
      });
      showToast({
        tone: 'ok',
        message: `Pusaka "${objData.displayName}" berhasil dicatat!`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddRelationship = async (relData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/relationship/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relData),
      });
      showToast({
        tone: 'ok',
        message: 'Ikatan relasi antartokoh berhasil diperbarui!',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddMystery = async (mysteryData: any) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/unresolved-condition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mysteryData),
      });
      showToast({
        tone: 'ok',
        message: 'Misteri cerita baru berhasil dicatat!',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceDay = async (days: number) => {
    setBusy(true);
    try {
      const result = await safeFetchJson<{ currentDate?: string }>('/api/control/sandbox/advance-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      showToast({
        tone: 'ok',
        message: `Garis waktu berhasil dimajukan ${days} hari ke ${formatFriendlyDate(result.currentDate)}.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleCloneToSandbox = async () => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/sandbox/clone-from-canon', { method: 'POST' });
      showToast({
        tone: 'info',
        message: 'Semesta cerita Kanun berhasil dikloning ke Ruang Eksperimen (Sandbox)!',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleAiAssist = async (capability: string, input: any) => {
    return await safeFetchJson('/api/control/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability, input }),
    });
  };

  const handleTogglePage = async (pageId: string) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/pages/${encodeURIComponent(pageId)}/toggle`, {
        method: 'POST',
      });
      showToast({ tone: 'ok', message: 'Status format halaman diperbarui.' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenCharacterWorkspace = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setView('character');
  };

  const handleNavigate = (nextView: View) => {
    if (nextView === 'character' && view !== 'character') {
      setSelectedCharacterId(null);
    }
    setView(nextView);
  };

  const activeTitle = universe?.storyMetadata?.title || overview?.universe?.storyMetadata?.title;

  return (
    <div className={`min-h-screen font-sans ${isSandbox ? 'theme-sandbox' : 'theme-production'} text-slate-900 flex flex-col md:flex-row bg-[#FAF8F5] overflow-x-hidden`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border-2 text-xs font-bold ${
              toast.tone === 'ok'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : toast.tone === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            {toast.tone === 'ok' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : toast.tone === 'error' ? (
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentView={view}
          onNavigate={handleNavigate}
          systemStatus={overview?.runtime?.status || 'INITIALIZED'}
          onOpenGuide={() => setGuideOpen(true)}
          isSandbox={Boolean(isSandbox)}
          activeStoryTitle={activeTitle}
          currentDate={universe?.temporal?.currentUniverseDate || overview?.universe?.universeDate || 'Belum tercatat'}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand Logo */}
            <div className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shrink-0">
              P
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                  {view === 'story' && 'Cerita & Naskah'}
                  {view === 'universe' && 'Dunia & Entitas'}
                  {view === 'character' && (selectedCharacterId ? 'Profil Tokoh' : 'Daftar Tokoh')}
                  {view === 'sandbox' && 'Ruang Eksperimen (Sandbox)'}
                  {view === 'history' && 'Pustaka & Arsip'}
                  {view === 'studio' && 'Pusat Operasional Studio'}
                </h1>
                <ModeBadge isSandbox={Boolean(isSandbox)} />
              </div>

              {activeTitle && (
                <p className="text-[11px] text-slate-500 font-medium truncate hidden sm:block">
                  Cerita Aktif: <strong className="text-slate-700">{activeTitle}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              kind="secondary"
              size="sm"
              onClick={() => setGuideOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5"
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Panduan</span>
            </Button>
          </div>
        </header>

        {/* View Canvas */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {view === 'story' && (
            <StoryView
              universe={universe}
              onOpenCreateStory={() => setCreateStoryOpen(true)}
              onProduceStory={handleProduceStory}
              fetchDailyContext={fetchDailyContext}
              fetchDevelopment={fetchDevelopment}
              fetchTimeline={fetchTimeline}
              latestRuns={runs}
              isSandbox={Boolean(isSandbox)}
            />
          )}

          {view === 'universe' && (
            <UniverseView
              universe={universe}
              onOpenCharacterWorkspace={handleOpenCharacterWorkspace}
              onOpenCharacterList={() => { setSelectedCharacterId(null); setView('character'); }}
              onAddLocation={handleAddLocation}
              onAddObject={handleAddObject}
              onAddRelationship={handleAddRelationship}
              onAddMystery={handleAddMystery}
              onAiAssist={handleAiAssist}
            />
          )}

          {view === 'character' && (
            <CharacterWorkspaceView
              characterId={selectedCharacterId}
              onBack={() => setSelectedCharacterId(null)}
              onSelectCharacter={(id) => setSelectedCharacterId(id || null)}
              allCharacters={universe?.characters || []}
              fetchCharacterWorkspace={fetchCharacterWorkspace}
              onEditCharacter={handleEditCharacter}
              onUpdateState={handleUpdateCharacterState}
              onUpdateBehavior={handleUpdateCharacterBehavior}
              onUpdateStyle={handleUpdateCharacterStyle}
              onAddKnowledge={handleAddCharacterKnowledge}
              onAiAssist={handleAiAssist}
            />
          )}

          {view === 'sandbox' && (
            <SandboxView
              universe={universe}
              onAdvanceDay={handleAdvanceDay}
              onCloneToSandbox={handleCloneToSandbox}
              onAiAssist={handleAiAssist}
            />
          )}

          {view === 'history' && (
            <HistoryView
              runs={runs}
              onRefresh={refresh}
            />
          )}

          {view === 'studio' && (
            <StudioCenterView
              overview={overview}
              pages={pages}
              onTogglePage={handleTogglePage}
              onRefresh={refresh}
              readiness={readiness}
              usage={usage}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={view}
        onNavigate={handleNavigate}
        onOpenMore={() => setMobileMoreOpen(true)}
        isSandbox={Boolean(isSandbox)}
      />

      {/* Mobile More Sheet */}
      <MobileMoreSheet
        isOpen={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        onNavigate={handleNavigate}
        onOpenGuide={() => setGuideOpen(true)}
        systemStatus={overview?.runtime?.status || 'INITIALIZED'}
        isSandbox={Boolean(isSandbox)}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onCreateStory={handleCreateStory}
        onAiAssist={handleAiAssist}
      />

      {/* Blueprint Guide Modal */}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
    </div>
  );
}

export default App;
