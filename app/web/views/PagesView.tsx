import React from 'react';
import {
  FileText,
  Layers,
  Sparkles,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  Power,
  Play,
} from 'lucide-react';
import { PageDefinition } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge } from '../components/UIElements.tsx';
import {
  getFriendlyPageTitle,
  getFriendlyPageDescription,
  getFriendlyScope,
} from '../translations.ts';

export function PagesView({
  pages,
  onSeedPages,
  onTogglePage,
  onRunPage,
  isMounted,
  isSandbox,
  busy,
}: {
  pages: PageDefinition[];
  onSeedPages: () => Promise<void>;
  onTogglePage: (pageId: string, currentStatus: string) => Promise<void>;
  onRunPage?: (pageDefinitionId: string) => Promise<void>;
  isMounted: boolean;
  isSandbox: boolean;
  busy: boolean;
}) {
  const enabledCount = pages.filter(p => p.status === 'ENABLED').length;

  const getPageIcon = (key: string) => {
    if (key.includes('CHRONICLE')) return BookOpen;
    if (key.includes('FACTION')) return Users;
    if (key.includes('CONTINUITY')) return ShieldCheck;
    return FileText;
  };

  return (
    <div id="view-pages" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Katalog Format Halaman Cerita
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Format dokumen dan lembar bacaan khusus yang dapat diterbitkan studio untuk melengkapi kisah Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Overview Bar */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-base font-bold text-slate-900">
              Format Publikasi Terdaftar
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              {enabledCount} format aktif dari total {pages.length} format bacaan.
            </div>
          </div>

          <Button
            id="seed-pages-btn"
            kind="primary"
            onClick={() => void onSeedPages()}
            disabled={busy || !isMounted}
          >
            <Layers className="h-4 w-4" />
            Muat Format Standar
          </Button>
        </div>
      </Card>

      {/* Pages Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map(page => {
          const Icon = getPageIcon(page.pageKey);
          const isEnabled = page.status === 'ENABLED';
          return (
            <Card
              key={page.pageDefinitionId}
              className={`p-5 flex flex-col justify-between transition-all ${
                isEnabled ? 'bg-white' : 'bg-slate-100/70 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold border-2 border-amber-200 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <StatusBadge status={page.status} />
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  {getFriendlyPageTitle(page.pageKey)}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed min-h-[3rem]">
                  {getFriendlyPageDescription(page.pageKey)}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    Fokus: {getFriendlyScope(page.pageScope)}
                  </span>
                  {page.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                <Button
                  id={`toggle-page-${page.pageDefinitionId}`}
                  size="sm"
                  kind={isEnabled ? 'secondary' : 'primary'}
                  onClick={() => void onTogglePage(page.pageDefinitionId, page.status)}
                  disabled={busy}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{isEnabled ? 'Nonaktifkan' : 'Aktifkan'}</span>
                </Button>
              </div>
            </Card>
          );
        })}

        {pages.length === 0 && (
          <div className="col-span-full clay-inset p-10 text-center space-y-3">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <div className="text-sm font-bold text-slate-800">Belum Ada Format Terdaftar</div>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Klik "Muat Format Standar" di atas untuk menambahkan format Kronik Harian, Kabar Tokoh, dan Laporan Konsistensi Alur.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
