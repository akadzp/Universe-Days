# Relationship System

Patch untuk mengaktifkan Relationship System sebagai pemilik fakta hubungan antar-aktor.

## Prinsip
- Group bukan Relationship.
- Kemunculan bersama tidak otomatis menghasilkan Relationship.
- Relationship memiliki status saat ini dan riwayat perubahan.
- Pengetahuan karakter mengenai hubungan tetap berada di Knowledge System.
- `AI_PROPOSAL` dan `UNKNOWN` tidak dapat menjadi sumber Relationship authoritative.
- Relationship romantis/partner hanya sah bila gender kedua pihak telah diketahui sebagai `ACTOR` dan `ACTRESS`.
- Konflik tidak diperbaiki otomatis.

## Integrasi
`relationship.ts` memperluas model Relationship lama tanpa menghapus field runtime existing. `validation.ts` memvalidasi endpoint, referensi dari Character, history perubahan, source, dan aturan gender untuk hubungan romantis/partner.

## Instalasi
Jalankan:

```bash
node apply.mjs
```

Installer membuat backup `*.bak` untuk file yang disentuh.
