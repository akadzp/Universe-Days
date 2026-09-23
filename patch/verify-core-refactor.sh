#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
EXPECTED=602b75673e2b49dec5fb4e64cbc9c26d8049de3f
ACTUAL="$(git rev-parse HEAD)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "FAIL: HEAD is $ACTUAL; expected $EXPECTED"; exit 1; }

# Rules are architectural input and must remain byte-for-byte unchanged.
git diff --exit-code -- rules/ >/dev/null || { echo "FAIL: rules/ was modified"; exit 1; }

# No legacy core machine roots may remain.
for p in core/architecture core/domains core/engine core/page core/platform core/production core/rules core/story core/temporal core/types core/universe core/validation; do
  [[ ! -d "$p" ]] || { echo "FAIL: legacy path remains: $p"; exit 1; }
done

# Required machine/boundary roots.
for p in core/DAILY-STORY core/DAILY-PAGE core/CHARACTER core/OBJECT core/DOMAIN core/UNIVERSE core/NARRATOR core/RUNTIME core/RULES core/VALIDATION core/INFRA core/SHARED; do
  [[ -d "$p" ]] || { echo "FAIL: missing target root: $p"; exit 1; }
done

# Required semantic boundaries.
for p in \
 core/DAILY-STORY/index.ts core/DAILY-PAGE/index.ts core/CHARACTER/index.ts core/OBJECT/index.ts \
 core/DOMAIN/RELATIONSHIP/index.ts core/DOMAIN/KNOWLEDGE/index.ts core/DOMAIN/STATE/index.ts core/DOMAIN/LOCATION/index.ts \
 core/UNIVERSE/CANON/index.ts core/UNIVERSE/DAILY-CYCLE/index.ts core/UNIVERSE/CONTINUITY/index.ts \
 core/NARRATOR/index.ts core/RUNTIME/index.ts core/RULES/index.ts core/VALIDATION/index.ts core/INFRA/index.ts core/SHARED/index.ts; do
  [[ -f "$p" ]] || { echo "FAIL: missing boundary index: $p"; exit 1; }
done

# Known obsolete placeholder and monolithic indexes must be gone.
[[ ! -e core/INFRA/PRODUCTION/legacy/m.txt ]] || { echo "FAIL: empty placeholder remains"; exit 1; }

# No TypeScript imports/exports may point at the removed old roots.
for old in architecture domains engine platform production story page temporal types universe rules validation; do
  if grep -RInF -E "../$old|../../$old" core --include='*.ts' --include='*.tsx' >/tmp/core-refactor-stale.txt 2>&1; then
    echo "FAIL: stale relative import(s) found for $old:"; cat /tmp/core-refactor-stale.txt; exit 1
  fi
done

# Confirm git records the expected structural rewrite.
COUNT=$(git diff --name-status -- core | wc -l | tr -d ' ')
[[ "$COUNT" -gt 0 ]] || { echo "FAIL: no core changes detected"; exit 1; }

echo "PASS: core architecture refactor structure verified against $EXPECTED"
