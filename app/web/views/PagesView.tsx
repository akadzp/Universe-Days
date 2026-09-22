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
} from 'lucide-react';
import { PageDefinition } from '../types.ts';
import { Card, Button, StatusBadge } from '../components/UIElements.tsx';
import {
  getFriendlyPageTitle,
  getFriendlyPageDescription,
  getFriendlyScope,
} from '../translations.ts';

export function PagesView({
  pages,
  onSeedPages,
  onTogglePage,
  isMounted,
  busy,
}: {
  pages: PageDefinition[];
  onSeedPages: () => Promise<void>;
  onTogglePage: (pageId: string, currentStatus: string) => Promise<void>;
  isMounted: boolean;
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
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Katalog Format Halaman Cerita
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Format dokumen khusus yang dapat diterbitkan studio untuk memperkaya dunia cerita Anda.
        </p>
      </div>

      {/* Overview bar */}
      <Card className="p-6 border-stone-800 bg-stone-950/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-stone-100">
              Format Publikasi Terdaftar
            </div>
            <div className="mt-0.5 text-xs text-stone-400">
              {enabledCount} format aktif dari total {pages.length} format bacaan.
            </div>
          </div>

          <Button
            id="seed-pages-btn"
            kind="secondary"
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
              className={`p-5 flex flex-col justify-between transition border-stone-800 ${
                isEnabled ? 'bg-stone-950/80' : 'bg-stone-950/40 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <StatusBadge status={page.status} />
                </div>

                <h3 className="text-sm font-semibold text-stone-100">
                  {getFriendlyPageTitle(page.pageKey)}
                </h3>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed min-h-[3rem]">
                  {getFriendlyPageDescription(page.pageKey)}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-stone-800 bg-stone-900 px-2 py-0.5 text-[10px] text-stone-300">
                    Kategori: {getFriendlyScope(page.pageScope)}
                  </span>
                  {page.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full border border-stone-800/80 bg-stone-900/60 px-2 py-0.5 text-[10px] text-stone-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-400">
                  {isEnabled ? 'Diterbitkan saat jadwal tiba' : 'Sementara dinonaktifkan'}
                </span>
                <Button
                  size="sm"
                  kind={isEnabled ? 'danger' : 'primary'}
                  onClick={() => void onTogglePage(page.pageDefinitionId, page.status)}
                  disabled={busy}
                >
                  <Power className="h-3.5 w-3.5" />
                  {isEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              </div>
            </Card>
          );
        })}

        {pages.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-stone-800 p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-stone-600 mb-2" />
            <div className="text-sm font-semibold text-stone-300">
              Katalog format belum diisi
            </div>
            <div className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              Buka dunia cerita dan klik tombol "Muat Format Standar" di atas untuk menambahkan template format bacaan bawaan.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
