import React from 'react';
import { Lock, Shield, AlertCircle } from 'lucide-react';

export const ReservedView: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-neutral-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-100 italic">[Reserved / Empty]</h2>
          <p className="text-xs text-neutral-400 font-mono">Slot Navigasi Utama #04</p>
        </div>
      </div>

      {/* Formal Architecture Notice */}
      <div className="p-6 bg-neutral-900/60 rounded-2xl border border-neutral-800 space-y-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-200">
              Dokumentasi Spesifikasi Baseline UI Canonical (Bagian 27)
            </h3>
            <blockquote className="border-l-2 border-indigo-500/50 pl-3 py-1 text-xs text-neutral-300 italic font-mono bg-neutral-950/60 rounded-r">
              &ldquo;Slot nomor 4 sengaja kosong. Belum memiliki workspace/menu yang ditentukan. UI
              tidak boleh mengisinya sendiri dengan fitur lain. Slot tersebut reserved sampai
              keputusan produk menentukan workspace yang benar.&rdquo;
            </blockquote>
          </div>
        </div>

        <div className="p-4 bg-neutral-950/70 rounded-xl border border-neutral-800/80 space-y-2 text-xs text-neutral-400">
          <div className="flex items-center space-x-2 text-neutral-300 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Ketetapan Tata Kelola:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400 pl-1">
            <li>Slot tetap berstatus dicadangkan (reserved) dan sengaja kosong.</li>
            <li>Tidak diberi label fitur sementara.</li>
            <li>Tidak diisi berdasarkan asumsi developer.</li>
            <li>
              Tidak digunakan sebagai tempat memindahkan fitur yang belum memiliki canonical home.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
