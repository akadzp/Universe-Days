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
import { Card, Button, StatusBadge } from '../components/UIElements.tsx';
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
  busy,
}: {
  universeDate: string | null;
  schedules: ScheduleDefinition[];
  scheduledJobs: ScheduledJobRecord[];
  onExecuteScheduler: () => Promise<void>;
  busy: boolean;
}) {
  const completedJobs = scheduledJobs.filter(j => j.status === 'COMPLETED').length;
  const pendingJobs = scheduledJobs.filter(j => !['COMPLETED', 'SKIPPED'].includes(j.status)).length;

  return (
    <div id="view-scheduler" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Jadwal Penerbitan Cerita
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Penerbitan otomatis mengikuti tanggal dalam alur cerita Anda. Setiap kali tanggal cerita bertambah, bab dan format bacaan dapat diterbitkan seketika.
        </p>
      </div>

      {/* Primary Status Card */}
      <Card className="p-6 border-stone-800 bg-stone-950/70">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
              <CalendarCheck className="h-4 w-4 text-amber-300" />
              <span>Tanggal Alur Cerita Saat Ini:</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-stone-100">
              {formatFriendlyDate(universeDate)}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              {universeDate
                ? 'Semua jadwal di bawah disinkronkan dengan tanggal ini.'
                : 'Buka dunia cerita untuk menetapkan tanggal alur.'}
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
              <Play className="h-4 w-4" />
              Jalankan Penerbitan Terjadwal
            </Button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-stone-800/70">
          <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3.5 text-center">
            <div className="text-xl font-bold text-stone-100">{schedules.length}</div>
            <div className="mt-1 text-[11px] text-stone-400">Total Format Terjadwal</div>
          </div>
          <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3.5 text-center">
            <div className="text-xl font-bold text-emerald-400">{completedJobs}</div>
            <div className="mt-1 text-[11px] text-stone-400">Telah Selesai Terbit</div>
          </div>
          <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3.5 text-center">
            <div className="text-xl font-bold text-amber-300">{pendingJobs}</div>
            <div className="mt-1 text-[11px] text-stone-400">Menunggu Terbit</div>
          </div>
        </div>
      </Card>

      {/* Schedule Definitions List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Daftar Jadwal Aktif</h3>
            <p className="mt-0.5 text-xs text-stone-500">Format dokumen yang disiapkan untuk diterbitkan secara berkala.</p>
          </div>
          <Layers className="h-4 w-4 text-stone-500" />
        </div>

        <div className="space-y-3">
          {schedules.map(schedule => (
            <div
              key={schedule.scheduleId}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-stone-800/80 bg-stone-950/60 p-4"
            >
              <div>
                <div className="text-sm font-semibold text-stone-200">
                  {getFriendlyPageTitle(schedule.pageDefinitionId)}
                </div>
                <div className="mt-1 text-xs text-stone-400">
                  Frekuensi: <span className="text-amber-300 font-medium">{getFriendlyCadence(schedule.cadence)}</span>
                  {schedule.priority ? ` · Prioritas ${schedule.priority > 5 ? 'Tinggi' : 'Standar'}` : ''}
                </div>
              </div>
              <StatusBadge status={schedule.enabled ? 'ENABLED' : 'DISABLED'} />
            </div>
          ))}

          {schedules.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-500">
              Belum ada jadwal yang didaftarkan.
            </div>
          )}
        </div>
      </Card>

      {/* Jobs for current story date */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Tugas Penerbitan untuk Tanggal Ini</h3>
            <p className="mt-0.5 text-xs text-stone-500">Catatan eksekusi penerbitan pada {formatFriendlyDate(universeDate)}.</p>
          </div>
          <Clock className="h-4 w-4 text-stone-500" />
        </div>

        <div className="space-y-3">
          {scheduledJobs.map(job => (
            <div
              key={job.jobId}
              className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-stone-200">
                    {getFriendlyPageTitle(job.pageDefinitionId)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-stone-400">
                    Waktu alur: {job.universeTime || 'Awal hari'} {job.attempt > 1 ? `· Percobaan ke-${job.attempt}` : ''}
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
              {job.reason && (
                <div className="mt-2 text-xs text-stone-400 bg-stone-900/60 rounded-lg p-2">
                  {job.reason}
                </div>
              )}
            </div>
          ))}

          {scheduledJobs.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-500">
              Belum ada tugas penerbitan yang dicatat untuk tanggal cerita ini.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
