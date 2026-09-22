import React from 'react';
import { X, BookOpen, Sparkles, CalendarCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '../components/UIElements.tsx';

export function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      id="guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-stone-800 bg-stone-950 p-6 sm:p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100">
                Panduan Singkat Pocer Universe
              </h2>
              <p className="text-xs text-stone-400">
                Memahami cara kerja studio penulisan cerita dalam bahasa sederhana.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-xs leading-relaxed text-stone-300">
          <Card className="p-4 bg-stone-900/40">
            <div className="flex items-center gap-2 font-semibold text-amber-300 mb-1.5">
              <Sparkles className="h-4 w-4" />
              <span>1. Apa itu "Dunia Cerita" (Universe)?</span>
            </div>
            <p className="text-stone-400 leading-5">
              Dunia Cerita adalah wadah seluruh latar belakang kisah Anda: nama tokoh, hubungan keluarga/pertemanan, lokasi kejadian, peristiwa bersejarah, dan waktu cerita saat ini. Membuka Dunia Cerita memastikan setiap kisah baru yang ditulis oleh asisten AI tetap konsisten dan tidak melupakan peristiwa masa lalu.
            </p>
          </Card>

          <Card className="p-4 bg-stone-900/40">
            <div className="flex items-center gap-2 font-semibold text-sky-300 mb-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>2. Arsip Resmi (Canon) vs Ruang Uji Coba (Sandbox)</span>
            </div>
            <p className="text-stone-400 leading-5">
              • <strong className="text-stone-200">Arsip Resmi (Canon):</strong> Cerita dan peristiwa yang benar-benar diakui dan disimpan secara permanen.<br />
              • <strong className="text-stone-200">Ruang Draf Bebas (Sandbox):</strong> Ruang latihan tanpa beban untuk mencoba adegan alternatif tanpa mengubah sejarah resmi cerita Anda.
            </p>
          </Card>

          <Card className="p-4 bg-stone-900/40">
            <div className="flex items-center gap-2 font-semibold text-emerald-300 mb-1.5">
              <BookOpen className="h-4 w-4" />
              <span>3. Format Halaman & Bab Cerita</span>
            </div>
            <p className="text-stone-400 leading-5">
              Selain narasi cerita utama, studio dapat menerbitkan format khusus seperti <strong>Kronik Peristiwa</strong> (rangkuman kejadian hari ini) atau <strong>Kabar Hubungan Tokoh</strong> (siapa berkawan dengan siapa). Format-format ini bisa Anda aktifkan atau nonaktifkan sesuai kebutuhan publikasi.
            </p>
          </Card>

          <Card className="p-4 bg-stone-900/40">
            <div className="flex items-center gap-2 font-semibold text-violet-300 mb-1.5">
              <CalendarCheck className="h-4 w-4" />
              <span>4. Jadwal Terbit Otomatis</span>
            </div>
            <p className="text-stone-400 leading-5">
              Jadwal di sini mengikuti <em>hari dalam cerita</em>, bukan jam dinding di dunia nyata. Ketika Anda melompat ke tanggal cerita berikutnya, tugas-tugas penulisan yang jatuh tempo dapat langsung diterbitkan dengan satu klik.
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
