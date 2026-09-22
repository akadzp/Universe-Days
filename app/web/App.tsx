import React, { useCallback, useEffect, useState } from 'react';
import {
  Menu,
  X,
  RefreshCw,
  Sparkles,
  TestTube,
  BookOpen,
  Compass,
  Users,
  Clock,
  Sliders,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

import {
  ControlOverview,
  UniverseDetails,
  CharacterWorkspaceData,
  DailyContextData,
  DevelopmentData,
  TimelineData,
  PageDefinition,
  ProductionRunRecord,
  ProviderHealthInfo,
  DeploymentReadiness,
  UsageSummary,
  ToastState,
  View,
} from './types.ts';

import { decodeFriendlyError, formatFriendlyDate } from './translations.ts';
import { Button, ModeBadge, StatusBadge } from './components/UIElements.tsx';
import { Sidebar } from './components/Navigation.tsx';
import { StoryView } from './views/StoryView.tsx';
import { UniverseView } from './views/UniverseView.tsx';
import { CharacterWorkspaceView } from './views/CharacterWorkspaceView.tsx';
import { SandboxView } from './views/SandboxView.tsx';
import { HistoryView } from './views/HistoryView.tsx';
import { StudioCenterView } from './views/StudioCenterView.tsx';
import { CreateStoryModal } from './views/CreateStoryModal.tsx';
import { GuideModal } from './views/GuideModal.tsx';

async function safeFetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') ?? '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(`Permintaan ke ${url} gagal (${response.status})`);
      }
      return {} as T;
    }
  }
  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? data?.reason ?? `Gagal memproses (${response.status})`);
  }
  return data;
}

export const App: React.FC = () => {
  const [view, setView] = useState<View>('story');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [overview, setOverview] = useState<ControlOverview | null>(null);
  const [universe, setUniverse] = useState<UniverseDetails | null>(null);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [runs, setRuns] = useState<ProductionRunRecord[]>([]);
  const [readiness, setReadiness] = useState<DeploymentReadiness | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const isSandbox =
    overview?.universe?.universeScope === 'SANDBOX' ||
    universe?.universeScope === 'SANDBOX';

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current?.message === next.message ? null : current));
    }, 4000);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, un, pg, rn, rd, us] = await Promise.all([
        safeFetchJson<ControlOverview>('/api/control/overview'),
        safeFetchJson<UniverseDetails>('/api/control/universe/details'),
        safeFetchJson<{ definitions: PageDefinition[] }>('/api/control/pages'),
        safeFetchJson<{ runs: ProductionRunRecord[] }>('/api/production/runs?limit=25'),
        safeFetchJson<DeploymentReadiness>('/api/production/readiness'),
        safeFetchJson<UsageSummary>('/api/control/production/usage'),
      ]);

      setOverview(ov);
      setUniverse(un);
      setPages(pg.definitions ?? []);
      setRuns(rn.runs ?? []);
      setReadiness(rd);
      setUsage(us);

      // Default selected character if not set
      if (un.characters && un.characters.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(un.characters[0].id);
      }
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedCharacterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Context & workspace fetchers
  const fetchDailyContext = useCallback(async () => {
    try {
      return await safeFetchJson<DailyContextData>('/api/control/universe/daily-context');
    } catch {
      return null;
    }
  }, []);

  const fetchDevelopment = useCallback(async () => {
    try {
      return await safeFetchJson<DevelopmentData>('/api/control/universe/developments');
    } catch {
      return null;
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    try {
      return await safeFetchJson<TimelineData>('/api/control/universe/timeline');
    } catch {
      return null;
    }
  }, []);

  const fetchCharacterWorkspace = useCallback(async (id: string) => {
    try {
      return await safeFetchJson<CharacterWorkspaceData>(`/api/control/universe/character/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }, []);

  // Action Handlers
  const handleCreateStory = async (storyData: any) => {
    setBusy(true);
    try {
      const result = await safeFetchJson('/api/control/story/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });
      showToast({
        tone: 'ok',
        message: `Kisah "${storyData.title}" berhasil dibuat dan dibuka di ${storyData.universeScope === 'SANDBOX' ? 'Sandbox' : 'Kanon Resmi'}!`,
      });
      setView('story');
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
      const result = await safeFetchJson<ProductionRunRecord>('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || { purpose: 'DAILY_STORY' }),
      });
      showToast({
        tone: 'ok',
        message: `Naskah bab hari ini berhasil diterbitkan!`,
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

  return (
    <div className={`min-h-screen font-sans ${isSandbox ? 'theme-sandbox' : 'theme-production'} text-slate-900 flex flex-col md:flex-row bg-[#FAF8F5]`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
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
          onNavigate={(nextView) => setView(nextView)}
          systemStatus={overview?.runtime?.status || 'INITIALIZED'}
          onOpenGuide={() => setGuideOpen(true)}
          isSandbox={isSandbox}
          onOpenCreateStory={() => setCreateStoryOpen(true)}
          activeStoryTitle={universe?.storyMetadata?.title || overview?.universe?.storyMetadata?.title}
          currentDate={universe?.temporal?.currentUniverseDate || overview?.universe?.universeDate || '2024-01-01'}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {view === 'story' && 'Kisah & Alur Cerita'}
                  {view === 'universe' && 'Ensiklopedia Dunia Cerita'}
                  {view === 'character' && 'Ruang Kerja Tokoh Holistik'}
                  {view === 'sandbox' && 'Laboratorium Sandbox Bebas'}
                  {view === 'history' && 'Pustaka Naskah & Arsip'}
                  {view === 'studio' && 'Pusat Kendali Operasional Studio'}
                </h1>
                <ModeBadge isSandbox={isSandbox} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Semesta POCER • Sistem Penulisan Berdaulat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              kind="secondary"
              size="sm"
              onClick={refresh}
              disabled={loading || busy}
              className="hidden sm:inline-flex"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading || busy ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </Button>

            <Button
              kind="clay"
              size="sm"
              onClick={() => setCreateStoryOpen(true)}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">+ Buat Cerita Baru</span>
              <span className="sm:hidden">+ Cerita</span>
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden p-4 bg-slate-50 border-b border-slate-200 space-y-2 animate-fade-in">
            <Sidebar
              currentView={view}
              onNavigate={(nextView) => {
                setView(nextView);
                setMobileMenuOpen(false);
              }}
              systemStatus={overview?.runtime?.status || 'INITIALIZED'}
              onOpenGuide={() => {
                setGuideOpen(true);
                setMobileMenuOpen(false);
              }}
              isSandbox={isSandbox}
              onOpenCreateStory={() => {
                setCreateStoryOpen(true);
                setMobileMenuOpen(false);
              }}
              activeStoryTitle={universe?.storyMetadata?.title || overview?.universe?.storyMetadata?.title}
              currentDate={universe?.temporal?.currentUniverseDate || overview?.universe?.universeDate || '2024-01-01'}
            />
          </div>
        )}

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
              isSandbox={isSandbox}
            />
          )}

          {view === 'universe' && (
            <UniverseView
              universe={universe}
              onOpenCharacterWorkspace={handleOpenCharacterWorkspace}
              onAddCharacter={handleAddCharacter}
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
              onBack={() => setView('universe')}
              onSelectCharacter={(id) => setSelectedCharacterId(id)}
              allCharacters={universe?.characters || []}
              fetchCharacterWorkspace={fetchCharacterWorkspace}
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
};

export default App;
