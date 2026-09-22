# Relationship System — Spesifikasi Runtime

## Kepemilikan
Relationship System adalah pemilik fakta hubungan antar-aktor. Character hanya menyimpan `relationshipReferences` sebagai referensi.

## Batas domain
Relationship System tidak menyimpan:
- siapa yang mengetahui hubungan;
- behavior karakter;
- personality;
- state karakter;
- Group membership.

## Data utama
Model mempertahankan:
- `CHARACTER_A` / `CHARACTER_B` melalui `subjectRef` / `targetRef`;
- `RELATIONSHIP_TYPE`;
- `RELATIONSHIP_STATUS`;
- `RELATIONSHIP_DYNAMIC`;
- `RELATIONSHIP_DIRECTION`;
- `START_DATE`;
- `CURRENT_SINCE`;
- `PUBLIC_STATUS`;
- `HISTORY` melalui `changes`;
- provenance/source.

## Aturan penting
Relationship tidak boleh dibuat hanya karena dua karakter sering muncul bersama. Story-derived Relationship membutuhkan `narrativeBasis`.

Perubahan Relationship harus membawa trigger dan mempertahankan nilai sebelum perubahan.

Hubungan romantis/partner menerapkan aturan bahwa pasangan yang diketahui gendernya harus `ACTOR + ACTRESS`. Gender `UNKNOWN` tidak boleh ditebak untuk mengesahkan hubungan tersebut.

Hubungan non-romantis tidak dibatasi aturan gender tersebut.
