#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
EXPECTED=602b75673e2b49dec5fb4e64cbc9c26d8049de3f
ACTUAL="$(git rev-parse HEAD)"
[[ "$ACTUAL" == "$EXPECTED" ]] || { echo "ERROR: expected $EXPECTED, got $ACTUAL" >&2; exit 1; }
[[ -d core && -d rules ]] || { echo "ERROR: run from Universe-Days checkout" >&2; exit 1; }

move_dir() { local src="$1" dst="$2"; [[ -d "$src" ]] || return 0; mkdir -p "$dst"; find "$src" -type f -print0 | while IFS= read -r -d '' f; do rel="${f#$src/}"; mkdir -p "$dst/$(dirname "$rel")"; git mv "$f" "$dst/$rel"; done; rmdir -p "$src" 2>/dev/null || true; }
move_file() { local src="$1" dst="$2"; [[ -f "$src" ]] || return 0; mkdir -p "$(dirname "$dst")"; git mv "$src" "$dst"; }

python3 "$(dirname "$0")/rewrite-imports.py"

move_dir core/architecture core/RUNTIME/GOVERNANCE
move_dir core/engine core/RUNTIME/ENGINE
move_dir core/temporal core/RUNTIME/TEMPORAL
move_dir core/domains/contracts core/RUNTIME/DOMAIN-GATEWAY/contracts
move_dir core/domains/mocks core/RUNTIME/DOMAIN-GATEWAY/mocks
move_file core/domains/gateway.ts core/RUNTIME/DOMAIN-GATEWAY/gateway.ts
move_file core/domains/registry.ts core/RUNTIME/DOMAIN-GATEWAY/registry.ts
rm -f core/domains/index.ts; rmdir core/domains 2>/dev/null || true
move_dir core/universe/daily core/UNIVERSE/DAILY-CYCLE
move_dir core/universe/continuity core/UNIVERSE/CONTINUITY
move_dir core/story/daily core/DAILY-STORY
move_dir core/page/daily core/DAILY-PAGE
move_dir core/rules core/RULES
move_dir core/validation core/VALIDATION
for d in ai cache context continuity cost final hardening model parallel persistence production providers recovery scaling scheduler token validation versioning universe; do
  case "$d" in
    continuity) dst="core/INFRA/CONTINUITY-LEDGER" ;;
    production) dst="core/INFRA/PRODUCTION/runtime" ;;
    universe) dst="core/INFRA/INSTANCE" ;;
    *) dst="core/INFRA/${d^^}" ;;
  esac
  move_dir "core/platform/$d" "$dst"
done
move_file core/platform/shared.ts core/SHARED/platform.ts
move_file core/platform/deploy-runtime.ts core/INFRA/FINAL/deploy-runtime.ts
rm -f core/platform/index.ts
move_dir core/production core/INFRA/PRODUCTION/legacy
move_file core/types/common.ts core/SHARED/common.ts
move_file core/types/determinism.ts core/SHARED/determinism.ts
move_file core/types/errors.ts core/SHARED/errors.ts
move_file core/types/identifiers.ts core/SHARED/identifiers.ts
move_file core/types/result.ts core/SHARED/result.ts
move_file core/types/execution-context.ts core/RUNTIME/ENGINE/execution-context.ts
move_file core/types/temporal.ts core/RUNTIME/TEMPORAL/types.ts
move_file core/types/rules.ts core/RULES/types.ts
rm -f core/types/index.ts 2>/dev/null || true
rmdir core/types 2>/dev/null || true

# Mixed universe/model split.
for f in character character-profile actor behavior character-style; do move_file "core/universe/model/$f.ts" "core/CHARACTER/$f.ts"; done
for f in object object-reference; do move_file "core/universe/model/$f.ts" "core/OBJECT/$f.ts"; done
move_file core/universe/model/relationship.ts core/DOMAIN/RELATIONSHIP/relationship.ts
move_file core/universe/model/knowledge.ts core/DOMAIN/KNOWLEDGE/knowledge.ts
move_file core/universe/model/state.ts core/DOMAIN/STATE/state.ts
move_file core/universe/model/character-state.ts core/DOMAIN/STATE/character-state.ts
move_file core/universe/model/location.ts core/DOMAIN/LOCATION/location.ts
move_file core/universe/model/location-reference.ts core/DOMAIN/LOCATION/location-reference.ts
for f in universe event repository serialization process unresolved; do move_file "core/universe/model/$f.ts" "core/UNIVERSE/CANON/$f.ts"; done
move_file core/universe/model/registry.ts core/RUNTIME/GOVERNANCE/entity-registry.ts
move_file core/universe/model/types.ts core/SHARED/model-types.ts
python3 - <<'PY2'
p='core/RUNTIME/GOVERNANCE/entity-registry.ts'
s=open(p,encoding='utf-8').read().replace("import { EntityType } from './types.ts';\n", '')
open(p,'w',encoding='utf-8').write(s)
PY2
move_file core/universe/model/validation.ts core/VALIDATION/universe-model.ts
move_file core/universe/model/seed.ts core/VALIDATION/fixtures/universe-seed.ts
move_file core/universe/model/continuity.ts core/UNIVERSE/CONTINUITY/legacy/continuity.ts
move_file core/universe/model/character-continuity.ts core/UNIVERSE/CONTINUITY/legacy/character-continuity.ts
for f in identity history provenance references; do move_file "core/universe/model/$f.ts" "core/SHARED/$f.ts"; done
rm -f core/universe/model/index.ts core/universe/index.ts core/story/index.ts core/page/index.ts
rmdir core/universe/model 2>/dev/null || true
rmdir core/universe core/story core/page 2>/dev/null || true

# Remove empty placeholder.
rm -f core/INFRA/PRODUCTION/legacy/m.txt


# Create explicit boundary indexes without monolithic aggregators.
mkdir -p core/DAILY-STORY core/DAILY-PAGE core/CHARACTER core/OBJECT core/DOMAIN/{RELATIONSHIP,KNOWLEDGE,STATE,LOCATION} core/UNIVERSE/{CANON,DAILY-CYCLE,CONTINUITY} core/NARRATOR core/RUNTIME core/RULES core/VALIDATION core/INFRA core/SHARED
cat > core/DAILY-STORY/index.ts <<'EOT'
export * from './types';
export * from './identity';
export * from './scope';
export * from './trigger';
export * from './canon';
export * from './lifecycle';
export * from './orchestrator';
export * from './handoff';
export * from './validation';
export * from './revision';
export * from './date';
EOT
cat > core/DAILY-PAGE/index.ts <<'EOT'
export * from './types';
export * from './identity';
export * from './temporal';
export * from './projection';
export * from './pipeline';
export * from './repository';
export * from './validation';
EOT
cat > core/CHARACTER/index.ts <<'EOT'
export * from './character';
export * from './character-profile';
export * from './actor';
export * from './behavior';
export * from './character-style';
EOT
cat > core/OBJECT/index.ts <<'EOT'
export * from './object';
export * from './object-reference';
EOT
cat > core/DOMAIN/RELATIONSHIP/index.ts <<'EOT'
export * from './relationship';
EOT
cat > core/DOMAIN/KNOWLEDGE/index.ts <<'EOT'
export * from './knowledge';
EOT
cat > core/DOMAIN/STATE/index.ts <<'EOT'
export * from './state';
export * from './character-state';
EOT
cat > core/DOMAIN/LOCATION/index.ts <<'EOT'
export * from './location';
export * from './location-reference';
EOT
cat > core/UNIVERSE/CANON/index.ts <<'EOT'
export * from './universe';
export * from './event';
export * from './process';
export * from './unresolved';
export * from './repository';
export * from './serialization';
EOT
cat > core/UNIVERSE/DAILY-CYCLE/index.ts <<'EOT'
export * from './period';
export * from './initialization';
export * from './carryover';
export * from './progression';
export * from './event';
export * from './process';
export * from './consequence';
export * from './decision-action';
export * from './unresolved';
export * from './gate';
export * from './finalization';
export * from './next-period';
export * from './continuation';
export * from './lifecycle';
export * from './validation';
export * from './trace';
export * from './handoff-placeholder';
EOT
cat > core/UNIVERSE/CONTINUITY/index.ts <<'EOT'
export * from './chain';
export * from './condition-reference';
export * from './continuity-model';
export * from './dependency';
export * from './history';
export * from './lifecycle';
export * from './queries';
export * from './result';
export * from './transition';
export * from './validator';
EOT
cat > core/SHARED/model-types.ts <<'EOT'
/** Compatibility surface for legacy model-type imports. Semantic definitions live at their owning boundaries. */
export { AuthorityLevel } from '../RUNTIME/GOVERNANCE/authority';
export { EntityType } from '../RUNTIME/GOVERNANCE/entity-registry';
export { EntityLifecycleStatus } from './lifecycle';
export { ModelValidationStatus } from '../VALIDATION/types';
export { TemporalStatus as TemporalAssertionCategory, TemporalStatus } from '../RUNTIME/TEMPORAL/types';
EOT
cat >> core/RUNTIME/GOVERNANCE/authority.ts <<'EOT'

export enum AuthorityLevel {
  AUTHORITATIVE = 'AUTHORITATIVE',
  DELEGATED = 'DELEGATED',
  OBSERVER = 'OBSERVER',
  PROVISIONAL = 'PROVISIONAL',
  HYPOTHETICAL = 'HYPOTHETICAL'
}
EOT
cat >> core/RUNTIME/GOVERNANCE/entity-registry.ts <<'EOT'

export enum EntityType {
  CHARACTER = 'CHARACTER',
  RELATIONSHIP = 'RELATIONSHIP',
  OBJECT = 'OBJECT',
  KNOWLEDGE = 'KNOWLEDGE',
  STATE = 'STATE',
  LOCATION = 'LOCATION',
  EVENT = 'EVENT',
  PROCESS = 'PROCESS',
  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION',
  BEHAVIOR = 'BEHAVIOR',
  STYLE = 'STYLE',
  CONTINUITY = 'CONTINUITY'
}
EOT
cat > core/SHARED/lifecycle.ts <<'EOT'
export enum EntityLifecycleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  ARCHIVED = 'ARCHIVED',
  DESTROYED = 'DESTROYED'
}
EOT
cat >> core/VALIDATION/types.ts <<'EOT'

export enum ModelValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  REQUIRES_REVALIDATION = 'REQUIRES_REVALIDATION'
}
EOT
cat > core/NARRATOR/index.ts <<'EOT'
/** Creative-authority boundary. Narrator may project canon into creative intent, but never owns canon. */
export type NarratorBoundary = 'NARRATOR_SYSTEM';
EOT
cat > core/RUNTIME/index.ts <<'EOT'
export * from './ENGINE';
export * from './GOVERNANCE';
export * from './TEMPORAL';
export * from './DOMAIN-GATEWAY';
EOT
cat > core/RULES/index.ts <<'EOT'
export * from './compiler';
export * from './loader';
export * from './specification';
export * from './types';
EOT
cat > core/VALIDATION/index.ts <<'EOT'
export * from './architecture';
export * from './harness';
export * from './types';
export * from './validator';
export * from './universe-model';
EOT
cat > core/INFRA/index.ts <<'EOT'
/** Technical infrastructure boundary. Semantic authority remains in domain machines. */
export {};
EOT
cat > core/SHARED/index.ts <<'EOT'
export * from './common';
export * from './determinism';
export * from './errors';
export * from './identifiers';
export * from './result';
export * from './identity';
export * from './history';
export * from './provenance';
export * from './references';
export * from './platform';
export * from './lifecycle';
export * from './model-types';
EOT

find core -type d -empty -delete

git status --short
