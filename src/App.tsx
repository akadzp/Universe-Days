import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ActorActressView } from './components/ActorActressView';
import { CeritaView } from './components/CeritaView';
import { ReservedView } from './components/ReservedView';
import { ProfileView } from './components/ProfileView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import type { AuthoritativeUniverse, DeploymentReadinessReport } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mode, setMode] = useState<'PRODUCTION' | 'SANDBOX'>('PRODUCTION');
  const [universe, setUniverse] = useState<AuthoritativeUniverse | null>(null);
  const [readiness, setReadiness] = useState<DeploymentReadinessReport | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  // Fetch Authoritative Universe Data
  const fetchUniverse = useCallback(async () => {
    try {
      const res = await fetch('/api/universe');
      if (res.ok) {
        const data = await res.json();
        setUniverse(data);
      }
    } catch (err) {
      console.warn('Gagal memuat state universe:', err);
    }
  }, []);

  // Fetch Deployment Readiness
  const fetchReadiness = useCallback(async () => {
    try {
      const res = await fetch('/api/readiness');
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (err) {
      console.warn('Gagal memuat readiness report:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUniverse();
    fetchReadiness();
  }, [fetchUniverse, fetchReadiness]);

  // Advance Time Action
  const handleAdvanceTime = async () => {
    setLoadingAction('advance');
    try {
      const res = await fetch('/api/time/advance', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Waktu Universe dimajukan: ${data.newUniverseDate} (${data.newUniverseTime})`);
        await fetchUniverse();
      } else {
        showToast(`Gagal memajukan waktu: ${data.error}`);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memajukan waktu.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset Universe Action
  const handleResetUniverse = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mengatur ulang Universe ke status awal (Seed)?')) {
      return;
    }
    setLoadingAction('reset');
    try {
      const res = await fetch('/api/universe/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Universe berhasil diatur ulang ke Seed awal!');
        await fetchUniverse();
        await fetchReadiness();
      } else {
        showToast(`Gagal mereset: ${data.error}`);
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mereset semesta.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Refresh All Data
  const handleRefresh = async () => {
    setLoadingAction('refresh');
    await Promise.all([fetchUniverse(), fetchReadiness()]);
    setLoadingAction(null);
    showToast('Data semesta berhasil disinkronkan.');
  };

  // Toggle Mode (Production vs Sandbox)
  const handleToggleMode = () => {
    const nextMode = mode === 'PRODUCTION' ? 'SANDBOX' : 'PRODUCTION';
    setMode(nextMode);
    showToast(
      nextMode === 'PRODUCTION'
        ? 'Beralih ke Mode Utama (Production): Operasi langsung mempengaruhi data Canon resmi.'
        : 'Beralih ke Ruang Uji (Sandbox): Eksplorasi aman tanpa mempengaruhi data Canon.'
    );
  };

  const characterCount = universe?.statistics?.charactersCount ?? 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 antialiased">
      {/* Sidebar with Contextual Utilities and Mode Switch (README Bagian 29 & 30) */}
      <Sidebar
        mode={mode}
        onToggleMode={handleToggleMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Context Header with 5 Primary Navigation Slots (README Bagian 23 & 35) */}
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          universe={universe}
          readiness={readiness}
          mode={mode}
          onAdvanceTime={handleAdvanceTime}
          onResetUniverse={handleResetUniverse}
          onRefresh={handleRefresh}
          onOpenSearch={() => setSearchOpen(true)}
          loadingAction={loadingAction}
          characterCount={characterCount}
        />

        {/* Workspace Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              universe={universe}
              readiness={readiness}
              onNavigate={setActiveTab}
              onAdvanceTime={handleAdvanceTime}
              loadingAction={loadingAction}
            />
          )}

          {activeTab === 'actor-actress' && (
            <ActorActressView
              universe={universe}
              onCharacterCreated={fetchUniverse}
            />
          )}

          {activeTab === 'cerita' && <CeritaView universe={universe} />}

          {activeTab === 'reserved' && <ReservedView />}

          {activeTab === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Global Search Modal (Locator) */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        universe={universe}
        onNavigate={setActiveTab}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
