# Universe-Days core architecture refactor patch

Target commit: `602b75673e2b49dec5fb4e64cbc9c26d8049de3f`

Scope: `core/` implementation and `rules/` only as an architectural reference. The patch does not modify `rules/`.

This bundle is intentionally a deterministic local migrator rather than a GitHub commit, because repository write access is unavailable. It:

1. Requires the exact target commit.
2. Moves `core/` files according to the approved architecture mapping.
3. Removes obsolete empty/monolithic index boundaries.
4. Rewrites relative TypeScript imports/exports based on the resulting paths.
5. Creates the new machine/boundary indexes.
6. Runs structural checks and fails on stale old paths.

Run from the repository root:

```bash
bash patch/apply-core-refactor.sh
bash patch/verify-core-refactor.sh
```

The scripts stop on errors and do not touch `rules/`.
