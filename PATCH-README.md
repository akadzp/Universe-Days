# Pocer Canonical Mutation Boundary Patch

Base repository commit observed: `df327b79b312b6213663cf768363a4c001602763`.

## Changes

- Removes the HTTP `/api/characters` direct `CharacterEntity` construction and direct canonical-map mutation.
- Adds `core/CHARACTER/character-command.ts` as the explicit Character command/materialization boundary.
- Routes Character creation through `ActorLifecycle.createManual`.
- Keeps persistence behind `UniverseInstanceManager` and `INSTANCE_MANAGEMENT_SYSTEM`.
- Removes the remaining wall-clock `effectiveTime` fallback from Object relation creation.
- Adds a focused regression contract test.

## Apply

From the repository root:

```bash
node apply-corrective-patch.mjs
```

The applicator is fail-fast and refuses to patch if expected source anchors do not match exactly. Run the project's normal typecheck/tests afterward.
