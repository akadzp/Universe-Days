# Behavior System

Patch untuk menambahkan **Behavior System** ke Universe-Days.

## Prinsip
- Behavior adalah pola perilaku, bukan Personality, State, Knowledge, atau Relationship.
- Behavior tidak boleh diisi dengan asumsi.
- Satu kejadian tunggal yang tidak signifikan tidak cukup untuk membentuk pola persisten.
- Perubahan behavior wajib memiliki trigger/basis peristiwa dan mempertahankan pola lama sebagai history.
- `AI_PROPOSAL` dan `UNKNOWN` tidak dapat menjadi sumber otoritatif.
- Character hanya menyimpan referensi Behavior; data Behavior sendiri tersimpan pada koleksi Universe sebagai entitas domain model.

## Isi
- `core/universe/model/behavior.ts`
- perubahan `character.ts` untuk `behaviorReferences`
- perubahan `types.ts` untuk `EntityType.BEHAVIOR`
- perubahan `universe.ts` agar Behavior tersedia sebagai koleksi model
- perubahan `validation.ts` dan `index.ts`
- dokumentasi dan unit test

Gunakan `node apply.mjs` dari root repository untuk memasang patch.
