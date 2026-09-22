# Knowledge System Package

Package ini menambahkan implementasi **Knowledge System** ke repository Universe-Days.

## Target

- `core/universe/model/knowledge.ts`
- `core/universe/model/character.ts`
- `core/universe/model/validation.ts`
- `core/universe/model/index.ts`

## Prinsip

Knowledge adalah pengetahuan milik Actor, bukan kebenaran objektif Universe.
Perubahan harus mempunyai dasar yang dapat ditelusuri dan tidak menghapus riwayat.

Source authoritative: `USER_DEFINED`, `STORY_DERIVED`.
Source proposal/non-authoritative: `AI_PROPOSAL`, `UNKNOWN`.

Package memakai nama file repository yang tetap; tidak membuat nama `v2`, `phaseXX`, atau `overlay`.
