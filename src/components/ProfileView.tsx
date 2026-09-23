import React from 'react';
import { UserCircle, Shield, Sliders, CheckCircle2, Key } from 'lucide-react';

export const ProfileView: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-neutral-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <UserCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Profil Pengguna & Akun</h2>
          <p className="text-xs text-neutral-400 font-mono">
            Slot Navigasi Utama #05 • Konteks Sesi Klien
          </p>
        </div>
      </div>

      {/* User Information Card */}
      <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 font-bold text-xl">
              OP
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Operator Pocer</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Sesi: Klien UI Otoritatif
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-mono font-medium">
                  Sesi Aktif
                </span>
              </div>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 rounded-lg">
            Klien Terhubung
          </span>
        </div>

        {/* Permissions & Contract Boundary */}
        <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Hak Akses Pengguna & Batasan Kontrak UI:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center space-x-2 text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Membaca data kanonikal semesta</span>
            </div>
            <div className="flex items-center space-x-2 text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Mengirimkan perintah aksi eksplisit</span>
            </div>
            <div className="flex items-center space-x-2 text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Melihat cerita naratif & histori</span>
            </div>
            <div className="flex items-center space-x-2 text-neutral-300">
              <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Perubahan data tunduk pada validasi sistem</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Preferences Section (Section 28) */}
      <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-neutral-800">
          <Sliders className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-bold text-neutral-200">Preferensi Pengguna</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-1">
            <span className="text-neutral-400 block">Bahasa Antarmuka</span>
            <div className="text-neutral-200 font-semibold">
              Bahasa Indonesia
            </div>
          </div>
          <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-1">
            <span className="text-neutral-400 block">Tema Tampilan</span>
            <div className="text-neutral-200 font-semibold font-mono text-[11px]">
              Gelap (Dark Mode Canonical)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
