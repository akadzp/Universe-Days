# Character State System

## Kepemilikan
State System menyimpan keadaan dinamis karakter pada suatu titik waktu. Character System menyimpan identity/profile; Knowledge menyimpan pengetahuan; Behavior menyimpan pola perilaku; Relationship menyimpan hubungan; Location System menyimpan truth spasial.

## Snapshot
Character State mendukung enam kelompok keadaan dari spesifikasi Pocer lama:

- `currentLocationReference`
- `currentActivity`
- `currentMood`
- `currentCondition`
- `currentGoal`
- `currentStatus`

Semua field opsional. Tidak adanya nilai berarti belum diketahui/dicatat, bukan otomatis berarti tidak ada.

## Timeline dan perubahan
`effectiveFrom` berfungsi sebagai state date. `stateEvent` dapat menunjukkan kejadian yang menetapkan state. Perubahan menggunakan `previousValue`, `currentValue`, `stateChange`, `changeTrigger`, dan `changeDate`. Revision history tidak dihapus.

## Aturan penting
State tidak boleh digunakan sebagai jalan pintas untuk mengubah identity, personality, backstory, knowledge, behavior, atau relationship. Perubahan tersebut harus dilakukan oleh sistem pemilik domain masing-masing.

`currentLocationReference` tidak menggantikan Location System. Ia adalah referensi lokasi yang terkait dengan state karakter pada waktu tersebut.
