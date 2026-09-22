# Aktor / Karakter System

Dokumen ini menetapkan semantic contract yang sedang diterapkan pada engine.

## Prinsip

Aktor adalah entitas yang dapat berpartisipasi dalam Universe. Character adalah domain yang memiliki identitas dan data karakter. Entity tetap menggunakan Actor System yang sama ketika relevan.

Isi karakter tidak diciptakan oleh sistem. Data dapat berasal dari:

- `USER_DEFINED`: karakter dibangun manual oleh pengguna.
- `STORY_DERIVED`: informasi karakter muncul dari cerita dan tervalidasi.
- `AI_PROPOSAL`: hanya usulan; bukan Canon.
- `UNKNOWN`: belum diketahui.

Data yang belum diketahui tidak boleh ditebak.

## Gender

Gender adalah atribut Actor dan tidak dibatasi oleh bentuk aktor.

Nilai:

- `ACTOR`
- `ACTRESS`
- `UNKNOWN`

Gender dapat digunakan sebagai constraint pada Relationship System. Actor/Actress adalah klasifikasi gender di Universe, bukan occupation atau narrative role.

## Level

- `CORE`: karakter inti.
- `MAJOR`: karakter penting.
- `IMPACT`: kemunculannya dapat terbatas tetapi berdampak kuat.
- `PERIPHERAL`: pelengkap dunia.
- `ENTITY`: aktor non-manusia/non-character biasa seperti Animal, Jin, AI, Robot, Supernatural, Creature, atau Other.

Level adalah klasifikasi/bobot naratif. Level bukan power level dan bukan frekuensi kemunculan otomatis.

## Group

Group adalah ikatan/pengelompokan antar-Aktor, misalnya Tim 7.

Group bukan Relationship, Role, atau lokasi.

Aturan aktif:

- Core: tepat satu Group dan Group utamanya tidak berpindah melalui transfer normal.
- Major: tepat satu Group dan dapat berpindah Group.
- Impact: tidak memiliki Group.
- Peripheral: tidak memiliki Group.
- Entity: tepat satu Group dan dapat berpindah Group.

Perubahan Group tidak membuat Actor baru. Riwayat Group dipertahankan.

Berada bersama kelompok lain sementara tidak otomatis mengubah Group.

## Entity Type

Untuk Level `ENTITY`, Entity Type menjelaskan bentuk/nature:

- `HUMAN`
- `ANIMAL`
- `JIN`
- `AI`
- `ROBOT`
- `SUPERNATURAL`
- `CREATURE`
- `OTHER`
- `UNKNOWN`

`UNKNOWN` sah sampai informasi yang cukup tersedia.

## Role

Role menjelaskan fungsi Actor dalam cerita. Role bukan Level, Group, Gender, Entity Type, Occupation, atau Relationship.

Taxonomy dan cardinality Role belum dipaksakan oleh implementation ini karena spesifikasi lama belum menetapkan daftar/aturan resminya.

## Creation dan Emergence

Actor dapat:

1. dibuat manual oleh pengguna;
2. muncul dari cerita dan menjadi permanen ketika memiliki pengaruh naratif bermakna.

Aktor selewat tanpa pengaruh tidak wajib dipersistenkan sebagai Actor.

Story tidak boleh membuat duplicate Actor jika identitas yang sama sudah ada.

## Batasan Authority

Character System adalah owner data Actor/Character.

Daily Universe membawa Actor melalui waktu, tetapi tidak membuat definisi Character baru hanya karena kebutuhan story.

AI/LLM dapat mengusulkan perubahan, tetapi tidak menjadikannya Canon tanpa jalur validasi dan owner yang sah.
