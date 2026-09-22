# Character Continuity System

Character Continuity adalah sistem pemeriksaan, audit, dan pencatatan konflik lintas sistem karakter.

## Ownership

Continuity berada di bawah `CHARACTER_SYSTEM` dan tidak mengambil alih ownership dari:

- Actor / Character Profile
- Role
- Relationship
- Behavior
- Knowledge
- State
- Style

Continuity membaca domain-domain tersebut dan menyimpan **hasil pemeriksaan**, bukan mengganti data sumber.

## Hasil pemeriksaan

Setiap aspek dapat memiliki status:

- `CONSISTENT` — data konsisten dengan referensi authoritative yang tersedia.
- `NEW_INFORMATION` — informasi sekarang diketahui, tetapi sebelumnya belum tercatat; ini bukan otomatis konflik.
- `VALID_CHANGE` — perbedaan memiliki dasar naratif yang dapat ditelusuri.
- `CONFLICT` — terdapat pertentangan yang belum memiliki dasar perubahan yang sah.
- `BLOCKED` — pemeriksaan tidak dapat dilakukan karena data utama tidak tersedia.
- `UNKNOWN` — belum ada cukup data untuk menyimpulkan.

## Aturan inti

Continuity tidak melakukan auto-repair. Konflik dicatat dengan evidence reference, affected data, dan resolution status.

`resolveConflict()` hanya mengubah metadata resolusi pada record Continuity. Ia tidak mengubah Character, Relationship, Knowledge, State, Behavior, atau Style yang menjadi sumber konflik.

## Perubahan vs konflik

`assessCharacterChange()` membedakan:

1. informasi baru,
2. perubahan yang memiliki dasar naratif,
3. konflik tanpa dasar naratif,
4. keadaan yang belum cukup diketahui.

Dengan demikian, data yang sebelumnya tidak tercatat tidak diperlakukan sebagai data yang salah.
