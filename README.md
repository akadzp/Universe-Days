# Style System

Patch untuk membangun **Character Style System** sesuai semantic system Pocer lama.

## Ownership
Style berada di bawah **CHARACTER_SYSTEM**. Sistem ini mengatur bagaimana karakter mengekspresikan sesuatu, bukan isi pengetahuan, personality, tindakan, atau kondisi emosional saat ini.

## Cakupan
- language style, word choice, formality, sentence pattern, speech rhythm
- emotional expression, humor, reaction, emphasis
- verbal signature, common expressions, dialogue tendency, communication habits
- context-specific style: casual, serious, conflict, emotional
- style change dengan previous/current snapshot dan trigger
- source/provenance dan validasi referensi Character ↔ Style
- Story-derived style membutuhkan bukti berulang atau signifikansi naratif

Jalankan `node apply.mjs` dari root repository untuk memasang patch.
