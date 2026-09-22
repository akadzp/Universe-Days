import React from 'react';
import {
  CalendarCheck,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ScheduleDefinition, ScheduledJobRecord } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  getFriendlyCadence,
  getFriendlyPageTitle,
} from '../translations.ts';

export function SchedulerView({
  universeDate,
  schedules,
  scheduledJobs,
  onExecuteScheduler,
  isSandbox,
  busy,
}: {
  universeDate: string | null;
  schedules: ScheduleDefinition[];
  scheduledJobs: ScheduledJobRecord[];
  onExecuteScheduler: () => Promise<void>;
  isSandbox: boolean;
  busy: boolean;
}) {
  const completedJobs = scheduledJobs.filter(j => j.status === 'COMPLETED').length;
  const pendingJobs = scheduledJobs.filter(j => !['COMPLETED', 'SKIPPED'].includes(j.status)).length;

  return (
    <div id="view-scheduler" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Jadwal Penerbitan Cerita Otomatis
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Penerbitan otomatis mengikuti tanggal dalam alur cerita Anda. Setiap kali tanggal alur bertambah, bab dan format bacaan dapat diterbitkan seketika.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ModeBadge isSandbox={isSandbox} />
        </div>
      </div>

      {/* Primary Status Card */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <CalendarCheck className="h-4 w-4 text-amber-500" />
              <span>Tanggal Alur Cerita Saat Ini:</span>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              {formatFriendlyDate(universeDate)}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              {universeDate
                ? 'Semua jadwal publikasi di bawah disinkronkan dengan tanggal alur ini.'
                : 'Buka dunia cerita untuk menetapkan tanggal alur aktif.'}
            </div>
          </div>

          <div>
            <Button
              id="execute-scheduler-btn"
              kind="primary"
              size="lg"
              onClick={() => void onExecuteScheduler()}
              disabled={busy || !universeDate}
            >
              <Play className="h-5 w-5" />
              Jalankan Penerbitan Terjadwal
            </Button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-slate-200">
          <div className="clay-inset p-4 text-center">
            <div className="text-2xl font-black text-slate-900">{schedules.length}</div>
            <div className="mt-1 text-xs font-bold text-slate-600">Total Format Terjadwal</div>
          </div>
          <div className="clay-inset p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{completedJobs}</div>
            <div className="mt-1 text-xs font-bold text-slate-600">Telah Selesai Terbit</div>
          </div>
          <div className="clay-inset p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{pendingJobs}</div>
            <div className="mt-1 text-xs font-bold text-slate-600">Menunggu Terbit</div>
          </div>
        </div>
      </Card>

      {/* Schedule Definitions List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daftar Jadwal Publikasi Aktif</h3>
            <p className="text-xs text-slate-600">Format yang otomatis diproses saat waktu terbit tiba.</p>
          </div>
        </div>

        <div className="space-y-3">
          {schedules.map(schedule => (
            <div
              key={schedule.scheduleId}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {getFriendlyPageTitle(schedule.pageDefinitionId)}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Siklus: {getFriendlyCadence(schedule.cadence)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={schedule.enabled ? 'ENABLED' : 'DISABLED'} />
              </div>
            </div>
          ))}

          {schedules.length === 0 && (
            <div className="clay-inset p-8 text-center text-xs text-slate-600">
              Belum ada jadwal yang diaktifkan. Anda dapat memuat jadwal dari menu Katalog Format Halaman.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
