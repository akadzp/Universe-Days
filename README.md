# Aktor / Karakter System

Implementasi pertama dari semantic Actor/Character System.

## Yang diterapkan

- Gender `ACTOR / ACTRESS / UNKNOWN` untuk Actor.
- Level `CORE / MAJOR / IMPACT / PERIPHERAL / ENTITY`.
- Group dengan aturan per Level.
- Group transfer untuk Level 2 dan Level 5.
- Proteksi Group Level 1.
- Entity Type untuk Level 5.
- Sumber data `USER_DEFINED / STORY_DERIVED / AI_PROPOSAL / UNKNOWN`.
- Actor creation manual.
- Actor emergence dari Story.
- Actor transient tanpa pengaruh naratif tidak dipersistenkan.
- Validasi classification terintegrasi ke `UniverseModelValidator`.
- Contract Character Domain diperluas untuk profile/group/level information.
- Role tetap berupa reference tanpa membuat taxonomy Role baru.

## Konvensi nama

Tidak ada nama file yang memakai nomor versi, fase, atau suffix pembaruan.

## Penerapan

Paket ini adalah overlay langsung terhadap repository. Salin isi ZIP ke root repository dan izinkan file yang sudah ada untuk ditimpa pada path yang sama.

Setelah itu jalankan:

```bash
npm run lint
npm run test
```

Validasi lokal yang dilakukan pada workspace ini hanya pemeriksaan sintaks/transpile karena checkout repository lengkap tidak tersedia di workspace.
