/**
 * Modul pemetaan istilah teknis ke bahasa yang ramah dan mudah dipahami oleh pengguna.
 */

export const statusDictionary: Record<string, { label: string; description: string }> = {
  READY: { label: 'Siap Digunakan', description: 'Semua komponen siap memproses cerita.' },
  CONNECTED: { label: 'Terhubung', description: 'Koneksi aktif dan berjalan lancar.' },
  HEALTHY: { label: 'Normal & Aktif', description: 'Komponen berfungsi dengan sangat baik.' },
  COMPLETED: { label: 'Berhasil Selesai', description: 'Pembuatan cerita berhasil diselesaikan.' },
  ENABLED: { label: 'Aktif', description: 'Pengaturan ini sedang aktif digunakan.' },
  INITIALIZED: { label: 'Telah Siap', description: 'Sistem telah dimuat dengan benar.' },
  WIRED: { label: 'Terhubung Baik', description: 'Jalur sistem saling tersambung.' },
  WAITING_FOR_UNIVERSE: { label: 'Perlu Buka Cerita', description: 'Pilih atau buka dunia cerita terlebih dahulu.' },
  WAITING_FOR_DAILY_CONTEXT: { label: 'Menunggu Alur Harian', description: 'Menunggu penetapan tanggal dan alur cerita harian.' },
  NO_PROVIDER: { label: 'Model AI Belum Aktif', description: 'Asisten AI belum tersambung.' },
  NO_UNIVERSE: { label: 'Belum Ada Cerita Terpilih', description: 'Belum ada dunia cerita yang dibuka.' },
  DEGRADED: { label: 'Perlu Penyesuaian', description: 'Sistem berjalan dengan beberapa pembatasan.' },
  CACHED: { label: 'Tersedia Instan', description: 'Hasil diambil cepat dari arsip sebelumnya.' },
  DISPATCHED: { label: 'Sedang Diproses', description: 'Permintaan sedang dikerjakan sistem.' },
  BLOCKED: { label: 'Tertahan Sementara', description: 'Ada syarat cerita yang belum terpenuhi.' },
  FAILED: { label: 'Belum Berhasil', description: 'Pembuatan cerita mengalami kendala teknis.' },
  UNAVAILABLE: { label: 'Tidak Tersedia', description: 'Layanan belum dapat dihubungi.' },
  UNREADY: { label: 'Belum Siap', description: 'Pemeriksaan sistem belum selesai.' },
  DISABLED: { label: 'Nonaktif', description: 'Bagian ini sedang dinonaktifkan sementara.' },
  EMPTY: { label: 'Belum Ada Data', description: 'Belum ada catatan yang tersimpan.' },
  NOT_RUN: { label: 'Belum Dijalankan', description: 'Belum ada pembuatan cerita yang dimulai.' },
  NOT_INITIALIZED: { label: 'Belum Dimuat', description: 'Dunia cerita belum diaktifkan di memori.' },
  UNKNOWN: { label: 'Memeriksa...', description: 'Sedang memeriksa status...' },
  SKIPPED: { label: 'Dilewati', description: 'Tugas dilewati karena sudah pernah dibuat.' },
};

export function getFriendlyStatus(status: string | null | undefined): string {
  if (!status) return 'Memeriksa...';
  const found = statusDictionary[status];
  if (found) return found.label;
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^| )\S/g, char => char.toUpperCase());
}

export function getStatusTone(status: string): string {
  if (['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED', 'WIRED', 'ALIVE'].includes(status)) {
    return 'text-emerald-700 bg-emerald-50 border-emerald-300 shadow-sm';
  }
  if (['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'NO_UNIVERSE', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status)) {
    return 'text-amber-800 bg-amber-50 border-amber-300 shadow-sm';
  }
  if (['BLOCKED', 'FAILED', 'UNAVAILABLE', 'UNREADY', 'DECEASED'].includes(status)) {
    return 'text-rose-700 bg-rose-50 border-rose-300 shadow-sm';
  }
  return 'text-slate-700 bg-slate-100 border-slate-300 shadow-sm';
}

export const purposeMap: Record<string, { title: string; subtitle: string; hint: string }> = {
  DAILY_STORY: {
    title: 'Kisah Utama Hari Ini',
    subtitle: 'Menulis narasi cerita harian',
    hint: 'Menghasilkan cerita bersambung lengkap berdasarkan kondisi dunia dan tokoh pada tanggal cerita yang aktif.',
  },
  DAILY_PAGE: {
    title: 'Penerbitan Format Halaman',
    subtitle: 'Membuat halaman publikasi khusus',
    hint: 'Menghasilkan dokumen cerita dengan format khusus seperti kronik peristiwa atau kabar hubungan tokoh.',
  },
  GENERAL_PRODUCTION: {
    title: 'Penulisan Bebas (Kustom)',
    subtitle: 'Eksplorasi cerita dengan instruksi sendiri',
    hint: 'Gunakan jika Anda ingin mengarahkan asisten AI dengan instruksi kreatif yang spesifik dan unik.',
  },
};

export function getFriendlyPurpose(purpose: string): string {
  return purposeMap[purpose]?.title ?? purpose.replaceAll('_', ' ');
}

export const pageKeyMap: Record<string, { title: string; description: string; icon: string }> = {
  DAILY_CHRONICLE: {
    title: 'Kronik Peristiwa Harian',
    description: 'Catatan rangkuman peristiwa-peristiwa penting yang terjadi pada hari cerita ini.',
    icon: 'BookOpen',
  },
  FACTION_STATUS_DIGEST: {
    title: 'Kabar Tokoh & Faksi',
    description: 'Dinamika terkini mengenai hubungan antar tokoh, aliansi kelompok, dan perubahan kondisi.',
    icon: 'Users',
  },
  CONTINUITY_LEDGER_REPORT: {
    title: 'Pemeriksaan Konsistensi Alur',
    description: 'Laporan kepatuhan alur untuk memastikan fakta, peristiwa, dan hubungan tokoh tetap konsisten.',
    icon: 'ShieldCheck',
  },
};

export function getFriendlyPageTitle(key: string): string {
  return pageKeyMap[key]?.title ?? key.replaceAll('_', ' ');
}

export function getFriendlyPageDescription(key: string): string {
  return pageKeyMap[key]?.description ?? 'Format penerbitan cerita.';
}

export const scopeMap: Record<string, { label: string; badge: string; description: string }> = {
  CANONICAL: {
    label: 'Arsip Resmi Cerita (Canon)',
    badge: 'Resmi',
    description: 'Koleksi cerita resmi yang menjadi acuan kebenaran alur.',
  },
  SANDBOX: {
    label: 'Ruang Uji Coba (Draf Bebas)',
    badge: 'Draf',
    description: 'Ruang eksperimen aman untuk mencoba ide cerita tanpa memengaruhi arsip resmi.',
  },
  NARRATIVE: {
    label: 'Alur & Cerita',
    badge: 'Narasi',
    description: 'Berfokus pada penyampaian kisah dan peristiwa.',
  },
  STATE: {
    label: 'Kondisi Tokoh & Kelompok',
    badge: 'Status',
    description: 'Berfokus pada dinamika relasi dan keadaan karakter.',
  },
  CONTINUITY: {
    label: 'Konsistensi Fakta',
    badge: 'Log Alur',
    description: 'Berfokus pada menjaga alur cerita agar tidak saling bertentangan.',
  },
};

export function getFriendlyScope(scope: string | null | undefined): string {
  if (!scope) return 'Umum';
  return scopeMap[scope]?.label ?? scope;
}

export const cadenceMap: Record<string, string> = {
  DAILY: 'Setiap Hari Cerita',
  WEEKLY: 'Setiap Pekan',
  MONTHLY: 'Setiap Bulan',
  CUSTOM: 'Jadwal Khusus',
};

export function getFriendlyCadence(cadence: string): string {
  return cadenceMap[cadence] ?? cadence;
}

export const componentMap: Record<string, { name: string; simpleDetail: string }> = {
  universe_authority: {
    name: 'Penjaga Kebenaran Cerita',
    simpleDetail: 'Memastikan semua peristiwa dan karakter sesuai dengan fakta dunia cerita yang berlaku.',
  },
  universe_persistence: {
    name: 'Penyimpanan Aman Cerita',
    simpleDetail: 'Menyimpan dan mengarsipkan kondisi dunia cerita secara permanen.',
  },
  page_catalog: {
    name: 'Katalog Format Cerita',
    simpleDetail: 'Daftar jenis halaman dan dokumen cerita yang dapat diterbitkan.',
  },
  parallel_executor: {
    name: 'Penerbit Berkecepatan Tinggi',
    simpleDetail: 'Memproses pembuatan beberapa halaman cerita secara serentak.',
  },
  context_compiler: {
    name: 'Penyusun Latar Belakang Cerita',
    simpleDetail: 'Mengumpulkan tokoh, tempat, dan fakta relevan sebelum asisten AI mulai menulis.',
  },
  token_budget: {
    name: 'Pengatur Panjang Cerita',
    simpleDetail: 'Menjaga agar cerita yang ditulis proporsional dan terencana dengan baik.',
  },
  context_compressor: {
    name: 'Pengoptimal Ringkasan Konteks',
    simpleDetail: 'Menyaring informasi penting agar asisten AI lebih fokus dan akurat.',
  },
  semantic_cache: {
    name: 'Penyimpan Ingatan Instan',
    simpleDetail: 'Menyimpan hasil yang sering diakses agar dapat dibuka seketika tanpa menunggu.',
  },
  output_validator: {
    name: 'Pemeriksa Mutu Cerita',
    simpleDetail: 'Meninjau hasil tulisan AI agar memenuhi standar cerita dan bebas kesalahan alur.',
  },
  production_runner: {
    name: 'Mesin Penulis Cerita',
    simpleDetail: 'Menjalankan proses pembuatan cerita dari awal hingga siap dibaca.',
  },
  persistence: {
    name: 'Buku Arsip Produksi',
    simpleDetail: 'Mencatat riwayat setiap episode dan naskah yang berhasil dibuat.',
  },
  scheduler: {
    name: 'Pengatur Waktu Terbit',
    simpleDetail: 'Menjadwalkan rilis halaman secara otomatis mengikuti kalender dunia cerita.',
  },
  cost_controller: {
    name: 'Pemantau Efisiensi Penulisan',
    simpleDetail: 'Memantau jumlah teks dan sumber daya penulisan yang digunakan.',
  },
  provider_registry: {
    name: 'Koneksi Asisten AI',
    simpleDetail: 'Menghubungkan aplikasi dengan model kecerdasan buatan pilihan.',
  },
  hardening: {
    name: 'Perlindungan Sistem Otomatis',
    simpleDetail: 'Menjaga keamanan data cerita agar tidak hilang saat terjadi gangguan teknis.',
  },
};

export const checksMap: Record<string, string> = {
  engineAuthoritative: 'Kebenaran Cerita Terjaga Penuh',
  persistenceAccessible: 'Penyimpanan Aman & Siap Digunakan',
  universePersistenceWired: 'Arsip Dunia Cerita Terhubung Normal',
  startupUniverseLoadClean: 'Pemuatan Awal Berjalan Mulus',
  providersAvailable: 'Asisten AI Siap Membantu Menulis',
  outputValidationActive: 'Pemeriksaan Kualitas Cerita Aktif',
  schedulerDispatcherWired: 'Penjadwalan Otomatis Siap Bertugas',
  engine: 'Mesin Cerita',
  persistence: 'Penyimpanan',
  universe: 'Dunia Cerita',
  scheduler: 'Penjadwalan',
  production: 'Pembuatan Cerita',
};

export function getFriendlyCheckName(key: string): string {
  return checksMap[key] ?? key.replaceAll('_', ' ');
}

export function decodeFriendlyError(error: string | Error | unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('UNIVERSE_NOT_MOUNTED') || msg.includes('Mount an authoritative Universe')) {
    return 'Dunia cerita belum dibuka. Silakan klik "Buka Dunia Cerita Terakhir" terlebih dahulu.';
  }
  if (msg.includes('PERSISTED_CURRENT_UNIVERSE_NOT_FOUND')) {
    return 'Belum ada arsip dunia cerita tersimpan sebelumnya. Anda dapat membuat ruang cerita baru.';
  }
  if (msg.includes('PAGE_NOT_FOUND')) {
    return 'Format halaman yang dipilih tidak ditemukan dalam katalog.';
  }
  if (msg.includes('UNIVERSE_ID_REQUIRED')) {
    return 'Nama pengenal dunia cerita wajib diisi.';
  }
  if (msg.includes('DIRECT_CANONICAL_MOUNT_PROHIBITED')) {
    return 'Arsip resmi cerita hanya boleh dibuka melalui penyimpanan yang telah diverifikasi.';
  }
  if (msg.includes('503')) {
    return 'Layanan penyimpanan sedang sibuk. Silakan coba kembali sesaat lagi.';
  }
  if (msg.includes('502')) {
    return 'Asisten AI sedang mengalami gangguan sementara saat memproses naskah.';
  }
  if (msg.includes('409')) {
    return 'Operasi tertunda karena ada kondisi alur cerita yang belum selaras.';
  }
  return msg;
}

export function formatFriendlyDate(value: string | null | undefined): string {
  if (!value) return 'Belum ditentukan';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export function formatFriendlyTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const objectTypeMap: Record<string, string> = {
  ARTIFACT: 'Pusaka / Artefak Keramat',
  WEAPON: 'Senjata Cerita',
  TOOL: 'Alat / Perkakas',
  VEHICLE: 'Kendaraan',
  DOCUMENT: 'Surat / Dokumen Bersejarah',
  CURRENCY: 'Uang / Nilai Tukar',
  CLOTHING: 'Pakaian / Kostum Karakter',
  ACCESSORY: 'Aksesori / Perhiasan',
  CONSUMABLE: 'Konsumsi / Ramuan',
  CONTAINER: 'Wadah Penyimpanan',
  NATURAL: 'Benda / Bahan Alami',
  TECHNOLOGY: 'Perangkat / Mesin Khusus',
  RELIC: 'Benda Bersejarah',
  OTHER: 'Benda Lainnya',
  UNKNOWN: 'Belum Terkategori'
};

export function getFriendlyObjectType(type: string | null | undefined): string {
  if (!type) return 'Benda Cerita';
  return objectTypeMap[type] ?? type.replaceAll('_', ' ');
}

export const objectPossessionMap: Record<string, string> = {
  HELD: 'Sedang Dibawa Tokoh',
  STORED: 'Tersimpan Rapi',
  WORN: 'Sedang Dikenakan',
  UNCLAIMED: 'Bebas / Belum Dimiliki',
  LOST: 'Hilang / Belum Ditemukan'
};

export function getFriendlyPossessionStatus(status: string | null | undefined): string {
  if (!status) return 'Status Tidak Diketahui';
  return objectPossessionMap[status] ?? status.replaceAll('_', ' ');
}

export const objectConditionMap: Record<string, string> = {
  INTACT: 'Kondisi Sempurna & Utuh',
  SLIGHTLY_DAMAGED: 'Sedikit Tergores / Aus',
  DAMAGED: 'Mengalami Kerusakan',
  HEAVILY_DAMAGED: 'Rusak Parah',
  BROKEN: 'Patah / Tidak Berfungsi',
  REPAIRED: 'Telah Diperbaiki',
  DEGRADED: 'Kualitas Menurun',
  MODIFIED: 'Dimodifikasi',
  DESTROYED: 'Musnah / Hancur Total',
  UNKNOWN: 'Kondisi Tidak Diketahui'
};

export function getFriendlyObjectCondition(condition: string | null | undefined): string {
  if (!condition) return 'Normal';
  return objectConditionMap[condition] ?? condition.replaceAll('_', ' ');
}

export const objectAccessMap: Record<string, string> = {
  PUBLIC: 'Dapat Diakses Bebas',
  RESTRICTED: 'Akses Terbatas',
  SECURED: 'Terkunci & Dijaga Ketat',
  HIDDEN: 'Lokasi Tersembunyi',
  LOST: 'Hilang Jejak',
  DESTROYED: 'Musnah',
  UNKNOWN: 'Status Akses Rahasia'
};

export function getFriendlyObjectAccess(access: string | null | undefined): string {
  if (!access) return 'Biasa';
  return objectAccessMap[access] ?? access.replaceAll('_', ' ');
}

export const locationTypeMap: Record<string, string> = {
  PLANET: 'Planet / Dunia',
  REGION: 'Wilayah / Daerah',
  SETTLEMENT: 'Pemukiman / Kota',
  DISTRICT: 'Distrik / Kawasan',
  BUILDING: 'Bangunan / Struktur',
  ROOM: 'Ruangan / Ruang Khusus',
  LANDMARK: 'Tengara / Titik Penting',
  ROUTE: 'Jalur / Rute Perjalanan',
  TERRAIN: 'Medan Alam / Lanskap',
  CELESTIAL: 'Ruang Angkasa / Langit',
  VIRTUAL: 'Ruang Maya / Dimensi Virtual',
  UNKNOWN: 'Belum Terkategori'
};

export function getFriendlyLocationType(type: string | null | undefined): string {
  if (!type) return 'Lokasi Cerita';
  return locationTypeMap[type] ?? type.replaceAll('_', ' ');
}

export const locationAccessibilityMap: Record<string, string> = {
  OPEN: 'Terbuka & Dapat Dikunjungi',
  RESTRICTED: 'Akses Terbatas / Khusus',
  SEALED: 'Terkunci Rapat / Tersegel',
  DESTROYED: 'Musnah / Hancur Total'
};

export function getFriendlyLocationAccessibility(status: string | null | undefined): string {
  if (!status) return 'Status Tidak Diketahui';
  return locationAccessibilityMap[status] ?? status.replaceAll('_', ' ');
}

export const locationSourceMap: Record<string, string> = {
  CANON_SEED: 'Sumber Resmi Dunia Cerita',
  AUTHOR_DIRECT: 'Dibuat Langsung oleh Penulis',
  STORY_EMERGENCE: 'Muncul dari Perkembangan Kisah',
  SYSTEM_IMPORT: 'Impor Data Sistem',
  AI_PROPOSAL: 'Usulan Draf Asisten (Perlu Disetujui)',
  UNKNOWN: 'Sumber Belum Terdata'
};

export function getFriendlyLocationSource(source: string | null | undefined): string {
  if (!source) return 'Sumber Tidak Diketahui';
  return locationSourceMap[source] ?? source.replaceAll('_', ' ');
}

