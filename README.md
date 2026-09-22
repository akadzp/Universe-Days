# Character Continuity System

Sistem kontinuitas karakter yang memeriksa kesinambungan lintas Actor, Character Profile, Behavior, Knowledge, State, Style, dan Relationship.

## Prinsip

- Continuity bukan sumber Canon baru.
- Continuity tidak menggantikan sistem pemilik fakta.
- Continuity tidak menyelesaikan konflik secara otomatis.
- Informasi baru tidak otomatis dianggap kontradiksi.
- Perubahan yang memiliki dasar naratif dapat dicatat sebagai `VALID_CHANGE` atau `DEVELOPMENT`.
- Konflik tanpa dasar perubahan dicatat sebagai `CONTRADICTION`.
- Riwayat perubahan tidak dihapus.
- `AI_PROPOSAL` dan `UNKNOWN` tidak dapat menjadi sumber Continuity authoritative.
- Role hanya diperiksa sebagai referensi; taxonomy Role resmi tidak diciptakan oleh sistem ini.

## Pemeriksaan

Continuity memeriksa hubungan referensi Character terhadap:

- Relationship
- Behavior
- Knowledge
- State
- Style
- Identity

Role tetap dibiarkan `CONSISTENT` selama belum ada Role System authoritative yang mendefinisikan taxonomy dan validatornya.

## Konflik

Konflik memiliki status `UNRESOLVED`, `UNDER_REVIEW`, atau `RESOLVED`. Resolusi wajib dicatat sebagai keputusan eksplisit. Sistem tidak memilih Canon secara otomatis.

## Instalasi

Jalankan dari root repository:

```bash
node apply.mjs
```

Installer bersifat idempotent dan membuat backup `.bak` untuk file sumber yang diubah.
