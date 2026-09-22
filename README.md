Character Core / Sims System

This package adds the Character Profile layer to the Actor/Character system.
It does not alter the UI and does not redefine State, Behavior, Knowledge,
Style, Relationship, or Location ownership.

Repository paths are mirrored directly. No version/phase suffixes are used in
source filenames.

Files:
- core/universe/model/character-profile.ts
- core/universe/model/character.ts
- core/universe/model/index.ts
- core/universe/model/validation.ts
- tests/unit/universe-model/character-profile.test.ts
- docs/character-system.md

Apply:
  node apply.mjs
  npm run lint
  npm run test
