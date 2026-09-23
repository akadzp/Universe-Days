import React, { useState } from 'react';
import {
  ShieldAlert,
  FileCheck,
  Scale,
  Layers,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Compass,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge } from './StatusBadges.tsx';

export function TataKelolaView() {
  const [activeTab, setActiveTab] = useState<'konstitusi' | 'epistemik' | 'single_home' | 'ai_boundary'>('konstitusi');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            SISTEM UTAMA: TATA KELOLA
          </span>
          <TruthBadge level="CANON" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
          Tata Kelola, Konstitusi & Aturan Domain Pocer
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
          Dokumen panduan arsitektural resmi yang mengatur kepemilikan kebenaran, epistemik data, batasan AI, dan integritas Universe Canon.
        </p>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('konstitusi')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'konstitusi'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-indigo-400" />
          <span>Prinsip Konstitusi</span>
        </button>

        <button
          onClick={() => setActiveTab('epistemik')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'epistemik'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hierarki Epistemik (Truth Levels)</span>
        </button>

        <button
          onClick={() => setActiveTab('single_home')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'single_home'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Single Home Rule Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_boundary')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'ai_boundary'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Batasan AI & Mutation</span>
        </button>
      </div>

      {/* Tab: Konstitusi */}
      {activeTab === 'konstitusi' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                2.1
              </div>
              <h3 className="text-sm font-bold text-neutral-100">UI Berorientasi Pengguna</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Struktur UI harus mengikuti mental model pengguna, bukan struktur internal backend. UI tidak membebani pengguna dengan istilah internal storage atau internal pipeline yang tidak relevan.
              </p>
            </div>

            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400 font-mono text-xs font-bold">
                2.2
              </div>
              <h3 className="text-sm font-bold text-neutral-100">UI Bukan Pemilik Kebenaran</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                UI tidak memiliki authority atas Canon. UI tidak boleh menentukan kebenaran domain, membuat fakta Canon sendiri, melakukan silent repair, atau menaikkan Proposal/Projection menjadi Canon.
              </p>
            </div>

            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                2.3
              </div>
              <h3 className="text-sm font-bold text-neutral-100">Backend Sebagai Authority</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Seluruh aturan domain, identity, validasi, temporal clock, continuity, dan persistence berasal dari backend engine. Hasil lokal tidak pernah dianggap sebagai keputusan mutlak.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase text-neutral-300">
              Prinsip Unknown Safety (Aturan 18)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                <UnknownSafetyBadge status="UNKNOWN" />
                <p className="text-neutral-400 text-[11px] pt-1">
                  Kebenaran ada namun belum diobservasi atau diketahui oleh sistem.
                </p>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                <UnknownSafetyBadge status="NOT_RECORDED" />
                <p className="text-neutral-400 text-[11px] pt-1">
                  Atribut tidak dicatat secara formal dalam domain kontrak.
                </p>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                <UnknownSafetyBadge status="NOT_APPLICABLE" />
                <p className="text-neutral-400 text-[11px] pt-1">
                  Kategori tidak berlaku untuk jenis entitas yang bersangkutan.
                </p>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                <UnknownSafetyBadge status="UNRESOLVED" />
                <p className="text-neutral-400 text-[11px] pt-1">
                  Kondisi temporal sedang menunggu penyelesaian atau observasi fajar berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Epistemik */}
      {activeTab === 'epistemik' && (
        <div className="space-y-4">
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-neutral-200">
              Tingkat Kebenaran Data (Truth Level Semantics)
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-start gap-4">
                <TruthBadge level="CANON" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200">CANON (Authoritative Universe Truth)</h4>
                  <p className="text-xs text-neutral-400">
                    Fakta mutlak yang telah divalidasi dan tersimpan di Universe Engine. Memiliki authority tertinggi dan dilindungi dari mutasi liar.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-start gap-4">
                <TruthBadge level="DERIVED" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200">DERIVED (Hasil Kalkulasi / Agregasi)</h4>
                  <p className="text-xs text-neutral-400">
                    Informasi turunan yang dihitung secara deterministik dari data Canon. Tidak boleh ditulis ulang sebagai sumber data baru tanpa kalkulasi ulang.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-start gap-4">
                <TruthBadge level="PROJECTION" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200">PROJECTION (Presentasi & Naratif Halaman)</h4>
                  <p className="text-xs text-neutral-400">
                    Lapisan presentasi seperti Daily Story dan Daily Page. Menyajikan cerita kepada pembaca tanpa memodifikasi entitas Canon semesta.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-start gap-4">
                <TruthBadge level="PROPOSAL" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200">PROPOSAL (Ide Kreatif & Draf Belum Tervalidasi)</h4>
                  <p className="text-xs text-neutral-400">
                    Input kreatif dari pengguna atau kurator. Membutuhkan verifikasi resmi sebelum dapat dipromosikan menjadi Canon.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-start gap-4">
                <TruthBadge level="UNKNOWN" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200">UNKNOWN (Kondisi Belum Diketahui)</h4>
                  <p className="text-xs text-neutral-400">
                    Informasi yang tidak boleh diasumsikan secara sepihak. Menghindari "halusinasi fakta" pada UI dan model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Single Home Rule */}
      {activeTab === 'single_home' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-200">
              Single Home Rule: Pemetaan Fitur ke Canonical Home
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Setiap entitas hanya memiliki satu rumah mutasi utama. Area lain hanya menampilkan sebagai referensi.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Fitur / Domain</th>
                  <th className="py-2.5 px-3">Canonical UI Home</th>
                  <th className="py-2.5 px-3">Aturan Reference</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Ringkasan & Kondisi Aktif</td>
                  <td className="py-2.5 px-3 text-indigo-400">Dashboard / Beranda</td>
                  <td className="py-2.5 px-3 text-neutral-400">Read-only aggregate</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Aktor & Karakter</td>
                  <td className="py-2.5 px-3 text-indigo-400">Aktor / Karakter</td>
                  <td className="py-2.5 px-3 text-neutral-400">Satu-satunya editor identitas</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Daily Story & Page</td>
                  <td className="py-2.5 px-3 text-indigo-400">Cerita / Daily Story</td>
                  <td className="py-2.5 px-3 text-neutral-400">Narrative Projection</td>
                  <td className="py-2.5 px-3"><TruthBadge level="PROJECTION" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Audit Konsistensi</td>
                  <td className="py-2.5 px-3 text-indigo-400">Cocokkan / Ringkasan</td>
                  <td className="py-2.5 px-3 text-neutral-400">Pemeriksaan integritas Canon</td>
                  <td className="py-2.5 px-3"><TruthBadge level="DERIVED" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Lokasi Spasial</td>
                  <td className="py-2.5 px-3 text-indigo-400">Dunia / Tempat</td>
                  <td className="py-2.5 px-3 text-neutral-400">Topologi & hierarki spasial</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Benda & Artefak</td>
                  <td className="py-2.5 px-3 text-indigo-400">Dunia / Benda</td>
                  <td className="py-2.5 px-3 text-neutral-400">Kepemilikan dan lokasi fisik</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Hubungan Antar-Aktor</td>
                  <td className="py-2.5 px-3 text-indigo-400">Dunia / Hubungan</td>
                  <td className="py-2.5 px-3 text-neutral-400">Relasi dinamis dua arah</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Pengetahuan & Fakta</td>
                  <td className="py-2.5 px-3 text-indigo-400">Dunia / Pengetahuan</td>
                  <td className="py-2.5 px-3 text-neutral-400">Epistemic certainty register</td>
                  <td className="py-2.5 px-3"><TruthBadge level="CANON" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: AI Boundary */}
      {activeTab === 'ai_boundary' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-neutral-200">
            Batasan AI (AI Boundary Governance)
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Dalam arsitektur Pocer, AI bertindak sebagai mesin render dan asisten kreasi, bukan pembuat hukum mutlak:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <Lock className="w-4 h-4" />
                <span>Hal yang Dilarang (Prohibited)</span>
              </div>
              <ul className="space-y-1.5 text-neutral-400 list-disc list-inside">
                <li>AI mengubah status Canon tanpa validasi resmi backend.</li>
                <li>AI mengasumsikan fakta yang berstatus UNKNOWN sebagai fakta mutlak.</li>
                <li>AI melakukan mutasi silent pada entitas aktor atau lokasi.</li>
                <li>AI menghasilkan kontradiksi temporal (time paradox).</li>
              </ul>
            </div>

            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hal yang Diizinkan (Authorized)</span>
              </div>
              <ul className="space-y-1.5 text-neutral-400 list-disc list-inside">
                <li>Menghasilkan proposal cerita harian (status PROPOSAL).</li>
                <li>Merender representasi artistik dari StoryPackage valid.</li>
                <li>Menyajikan narasi harian yang sejalan dengan Universe Date.</li>
                <li>Menyimpan trace eksekusi untuk audit deterministik.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
