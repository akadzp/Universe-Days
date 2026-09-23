import React from 'react';
import { X, BookOpen, Sparkles, CalendarCheck, ShieldCheck, CheckCircle2, TestTube } from 'lucide-react';
import { Card, Button } from '../components/UIElements.tsx';

export function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      id="guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-white bg-white p-6 sm:p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-200 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Panduan Singkat Pocer Universe
              </h2>
              <p className="text-xs text-slate-600">
                Memahami cara kerja studio penulisan cerita dalam bahasa sederhana.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-xs leading-relaxed text-slate-700">
          <Card className="p-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-amber-800 mb-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>1. Apa itu "Dunia Cerita" (Universe)?</span>
            </div>
            <p className="text-slate-600 leading-5">
              Dunia Cerita adalah wadah seluruh latar belakang kisah Anda: nama tokoh, hubungan keluarga/pertemanan, lokasi kejadian, peristiwa bersejarah, dan waktu cerita saat ini. Membuka Dunia Cerita memastikan setiap kisah baru yang ditulis oleh asisten AI tetap konsisten dan tidak melupakan peristiwa masa lalu.
            </p>
          </Card>

          <Card className="p-4 bg-indigo-50/50 border border-indigo-200">
            <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1.5">
              <TestTube className="h-4 w-4 text-indigo-600" />
              <span>2. Mode Produksi (Kanun) vs Mode Sandbox (Lab)</span>
            </div>
            <p className="text-slate-600 leading-5">
              • <strong className="text-slate-900">Mode Produksi (Kanun Resmi):</strong> Cerita dan peristiwa yang diakui resmi dan disimpan secara permanen di arsip cerita Anda.<br />
              • <strong className="text-slate-900">Mode Sandbox (Lab Eksperimen):</strong> Ruang latihan bebas risiko untuk menguji coba tanggal alur masa depan, menambah tokoh baru, dan tes prompt AI tanpa memengaruhi arsip resmi.
            </p>
          </Card>

          <Card className="p-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1.5">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>3. Format Halaman & Bab Cerita</span>
            </div>
            <p className="text-slate-600 leading-5">
              Selain narasi cerita utama, studio dapat menerbitkan format khusus seperti <strong>Kronik Peristiwa</strong> (rangkuman kejadian hari ini) atau <strong>Kabar Hubungan Tokoh</strong> (siapa berkawan dengan siapa). Format-format ini bisa Anda aktifkan atau nonaktifkan sesuai kebutuhan publikasi.
            </p>
          </Card>

          <Card className="p-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-teal-800 mb-1.5">
              <CalendarCheck className="h-4 w-4 text-teal-600" />
              <span>4. Jadwal Terbit Otomatis</span>
            </div>
            <p className="text-slate-600 leading-5">
              Jadwal di sini mengikuti <em>hari dalam alur cerita</em>, bukan jam dinding dunia nyata. Ketika Anda memajukan tanggal cerita, tugas-tugas penulisan yang jatuh tempo dapat langsung diterbitkan secara teratur.
            </p>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button kind="primary" onClick={onClose}>
            <CheckCircle2 className="h-4 w-4" />
            Saya Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
}
