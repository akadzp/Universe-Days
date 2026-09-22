# State System

Patch untuk menyempurnakan **Character State System** pada Universe-Days tanpa mengganti State Machine generic yang sudah ada.

## Prinsip
- State menggambarkan kondisi karakter pada titik waktu tertentu.
- State bersifat dinamis dan menyimpan riwayat perubahan.
- State tidak mengubah identitas, personality, backstory, knowledge, behavior, atau relationship.
- Location reference pada Character State hanya menunjukkan lokasi yang diketahui/berlaku bagi keadaan karakter; Location System tetap menjadi owner kebenaran spasial.
- Data State boleh parsial; field yang tidak diketahui tidak boleh diisi dengan asumsi.
- Perubahan State wajib memiliki `changeTrigger` dan menyimpan `previousValue`.
- `AI_PROPOSAL` dan `UNKNOWN` tidak dapat menjadi sumber otoritatif.
- `CharacterEntity.stateReference` harus menunjuk State yang benar-benar milik Character tersebut.

## Isi
- `core/universe/model/character-state.ts`
- pembaruan `core/universe/model/state.ts`
- pembaruan `core/universe/model/validation.ts`
- pembaruan `core/universe/model/index.ts`
- dokumentasi dan unit test

Gunakan `node apply.mjs` dari root repository untuk memasang patch.
