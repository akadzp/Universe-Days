# Behavior System — Spesifikasi

## Data inti
Behavior mempertahankan konsep dari sistem Pocer lama:
`BEHAVIOR_ID`, `CHARACTER_ID`, `BEHAVIOR_PATTERN`, `BEHAVIOR_CONTEXT`, `BEHAVIOR_FREQUENCY`, `TRIGGERS`, `TRIGGER_CONTEXT`, `TYPICAL_RESPONSE`, `ALTERNATIVE_RESPONSE`, `RESPONSE_INTENSITY`, riwayat perubahan, dan `NOTES` melalui metadata model.

## Batas kepemilikan
- Personality → Character Profile
- State saat ini → State System
- Knowledge → Knowledge System
- Relationship → Relationship System
- Speech/communication style → Style System
- Behavior pattern → Behavior System

## Aturan penting
1. Behavior persistence tidak boleh disimpulkan dari satu kejadian biasa.
2. Satu kejadian dapat membentuk behavior bila kejadian tersebut eksplisit signifikan secara naratif.
3. Perubahan behavior harus memiliki change trigger/basis.
4. Pattern lama tidak dihapus; perubahan disimpan dalam `changes`.
5. Character tidak berubah identitas atau personality hanya karena behavior berubah.
6. `AI_PROPOSAL` dan `UNKNOWN` tidak menjadi Canon melalui lifecycle ini.
7. Story dapat menjadi sumber fakta behavior, tetapi tetap divalidasi.
