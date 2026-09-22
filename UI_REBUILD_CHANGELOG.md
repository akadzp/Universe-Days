# POCER UI Reconstruction — Total UI Pass

## Baseline
Built from the uploaded `Universe-Days` source plus the Phase 1/2 UI reconstruction work.

## Scope
A single consolidated UI pass covering the user-facing journey:

`Cerita → Dunia → Tokoh → Arsip → Lainnya`

The pass is intentionally UI-only. Existing Canon/domain authority and completed Object, Location, Character, and Continuity systems were not redesigned.

## App Shell
- Removed the global refresh action from the main header.
- Kept desktop sidebar and mobile bottom navigation.
- Kept utility surfaces (`Sandbox`, `Studio`, `Panduan`) outside primary mobile navigation.
- Preserved active-story context without creating another story-creation entry point in the shell.

## Cerita
- `Lanjutkan Kisah` remains the primary active-story action.
- Story creation remains contextual to the Story surface / no-active-story state.
- Replaced the presentation fallback `Cerita Tanpa Judul` with `Belum diberi judul`.
- Existing story metadata is displayed only when present.

## Dunia
- Character Builder is not duplicated inside `Dunia`.
- `Dunia → Tokoh` is an exploration/reference surface with a route to `Tokoh`.
- Location, Object, Relationship, and Mystery creation flows remain contextual to their respective surfaces.
- No Object/Location API or authority changes.

## Tokoh
- `Tokoh` is the direct character-management entry point.
- Character creation is owned by the Character surface.
- Local character search uses only recorded character fields.
- Explicit empty-result and empty-dataset states are preserved.

## Character Workspace
- Replaced the 12-item technical tab wall with a user-oriented primary path:
  - Ringkasan
  - Profil
  - Kondisi
  - Relasi
  - Riwayat
  - Kontinuitas
- Technical/detail surfaces remain available through one compact Detail selector:
  - Pemeran
  - Pola Perilaku
  - Gaya Bahasa
  - Pengetahuan
  - Benda
  - Lokasi
- Existing Character System 8/8 views and handlers remain available; this is a navigation/projection change, not a domain rewrite.
- Removed UI-side semantic defaults such as `AMBIVERT`, `FREQUENT`, `MODERATE`, and `NORMAL` from initial empty edit state. Existing stored values are shown when present; otherwise the UI says `Belum ditentukan`.

## Arsip
- Preserved contextual archive refresh.
- Reset selected archive entry to the latest available run when the run collection changes, preventing stale selection after production updates.

## Authority / Non-Assumption Rules
- No semantic fallback phrases previously audited were reintroduced.
- Unknown/unset fields remain unknown/unset in the UI.
- The UI does not invent protagonist, location, personality, relationship, or story metadata merely to make cards look complete.
- AI remains proposal-only through existing handlers.

## Verification
- Static audit: no occurrences found in `app/web` for the previously targeted semantic fallback phrases:
  - `13 dimensi`
  - `Pemberani & Visioner`
  - `Hubungan Saling Percaya`
  - `Pusat pemukiman dan interaksi antar tokoh`
  - `Fantasi / Petualangan`
- Global TypeScript parser reached source/type resolution without syntax/JSX parse failures in the changed files.
- Full type-check is blocked because npm dependencies are not installed in this execution environment (`vite/client`, React, and lucide types unavailable).
- `npm install` exceeded the execution timeout; therefore `npm run lint`, `npm test`, and `npm run build` are **not claimed as passing**.

## Changed UI Files
- `app/web/App.tsx`
- `app/web/components/Navigation.tsx`
- `app/web/views/CharacterWorkspaceView.tsx`
- `app/web/views/HistoryView.tsx`
- `app/web/views/StoryView.tsx`
- `app/web/views/UniverseView.tsx`
