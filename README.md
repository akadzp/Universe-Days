# Pembaruan UI Pusat Kendali Pocer Universe

Pembaruan ini memperbaiki struktur informasi dan penggunaan aplikasi pada lapisan UI/control layer.

## Konvensi nama file

Nama file mengikuti nama yang sudah ada di repository dan tidak berubah karena versi atau pembaruan.

- Target UI: `app/web/App.tsx`
- Installer: `apply.mjs`
- Informasi perubahan: `README.md`

Tidak ada nama file seperti `AppV2.tsx`, `AppV3.tsx`, `phase2.mjs`, atau variasi versi lainnya.

## Struktur aplikasi

### Menu utama

1. **Beranda** — ringkasan kondisi aplikasi dan langkah yang perlu dilakukan berikutnya.
2. **Universe** — mengaktifkan Universe tersimpan, melihat penyimpanan, dan mode Sandbox.
3. **Produksi** — menjalankan cerita harian, produksi halaman, atau produksi khusus.
4. **Jadwal** — melihat dan menjalankan pekerjaan produksi terjadwal.
5. **Halaman** — melihat serta mengaktifkan/nonaktifkan Page.

### Administrasi

6. **Riwayat** — melihat hasil produksi sebelumnya dan penggunaan token/biaya.
7. **AI & Model** — melihat provider dan model yang tersedia.
8. **Sistem** — pemeriksaan kesiapan dan detail internal engine.

Administrasi dipisahkan dari menu utama supaya fitur teknis tidak bercampur dengan alur produksi sehari-hari.

## Perbaikan UI utama

- Seluruh teks antarmuka utama menggunakan Bahasa Indonesia.
- Navigasi tetap tersedia pada perangkat mobile; sidebar desktop sebelumnya tersembunyi di mobile sehingga pengguna kehilangan navigasi.
- Istilah status internal seperti `READY`, `BLOCKED`, dan `WAITING_FOR_UNIVERSE` ditampilkan dengan label Bahasa Indonesia.
- ID dan istilah internal tetap tersedia hanya ketika memang berguna sebagai detail teknis.
- Alur utama dimulai dari Beranda dan selalu memberikan tindakan berikutnya yang relevan.
- Sandbox dipisahkan secara visual dari Universe Canonical agar tidak dianggap sebagai sumber data resmi.
- Riwayat produksi dipisahkan dari produksi aktif agar hasil lama tidak bercampur dengan tindakan baru.
- Fitur administrasi teknis dipisahkan dari menu utama.
- Tombol dan istilah teknis yang sebelumnya berbahasa Inggris diganti dengan istilah yang mudah dipahami pengguna.

## API yang digunakan

UI tetap menggunakan endpoint yang sudah tersedia pada runtime saat ini. Paket ini tidak mengubah `core/` dan tidak mengubah aturan otoritas Universe.

## Apply

Jalankan dari root repository:

```bash
node apply.mjs
npm run lint
npm run build
```

Installer membuat backup stabil:

```text
app/web/App.tsx.bak
```

## Verifikasi paket

- `node --check apply.mjs`
- TypeScript transpile check pada `app/web/App.tsx`

Lint/build penuh repository tidak dijalankan di workspace ini karena checkout repository lengkap tidak tersedia.
