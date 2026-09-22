# Knowledge System

Knowledge System menyimpan **apa yang diketahui oleh Actor**, bukan seluruh fakta objektif Universe.

## Struktur

- `KNOWLEDGE_ID`: identitas unik record pengetahuan.
- `CHARACTER_ID / knowerRef`: Actor yang memiliki pengetahuan.
- `KNOWN_FACT / statement`: isi yang diketahui atau diyakini Actor.
- `KNOWLEDGE_STATUS`: status pengetahuan; dibuat extensible karena taxonomy final belum ditetapkan oleh Canon.
- `KNOWLEDGE_SOURCE` (operasional: `acquisitionSource`): bagaimana pengetahuan diperoleh, misalnya pengalaman, observasi, informasi karakter lain, dokumen, atau sumber lain dalam cerita.
- `ACQUIRED_DATE`: waktu memperoleh pengetahuan jika diketahui.
- `certainty`: tingkat epistemik seperti FACT, BELIEF, RUMOR, atau MISCONCEPTION.
- `changes`: riwayat perkembangan pengetahuan yang menyimpan keadaan sebelumnya dan sesudahnya.

## Batas kepemilikan

Knowledge System tidak menentukan fakta objektif Universe, hubungan antar karakter, perilaku karakter, atau state karakter.

Character hanya dapat menggunakan pengetahuan yang memang sudah dimiliki menurut Knowledge System. Ketidaksesuaian dengan Universe Fact tidak otomatis merupakan error; karakter dapat salah, tidak lengkap, atau tertinggal informasinya.

## Sumber data

`USER_DEFINED` dan `STORY_DERIVED` dapat menjadi sumber authoritative.

`AI_PROPOSAL` dan `UNKNOWN` tidak dapat menjadi Canon melalui lifecycle Knowledge.

Informasi yang belum diketahui tetap tidak diketahui. Sistem tidak mengisi bagian kosong dengan asumsi.

## Perubahan

Perubahan Knowledge harus mempunyai `CHANGE_TRIGGER`. Riwayat lama tidak dihapus. `PREVIOUS_KNOWLEDGE` harus benar-benar cocok dengan keadaan authoritative sebelumnya sebelum perubahan diterapkan.
