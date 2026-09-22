# Integration Reconciliation

Base: `4ab5c7a6f0a70d48bbf3270faf4cb985d4823e3c`

This patch reconciles Phase 34 with the architecture already present in the repository.

## Changes

1. `/control` no longer owns a synthetic `UNIVERSE_PRIME` state.
2. A mounted `UniverseModel` is validated by the existing `UniverseModelValidator` before production use.
3. `ProductionRunner` requires an actual `UniverseModel`; `universeId` alone is no longer sufficient.
4. `ProductionRunner` now calls `ProductionContextCompiler` and derives the cache fingerprint from the compiled authoritative context.
5. Production run identity is deterministic; `Date.now()` is removed from `runId` generation.
6. `/api/production/run` and `/api/control/produce` use the mounted authoritative Universe instead of accepting caller-supplied authority identifiers.
7. Daily Story remains blocked until a real `UniversePeriodContext` or `StoryProductionPackage` is supplied.
8. Generic development seed mounting is explicit (`mode: GENERIC_SEED`, scope `SANDBOX`) and is not presented as canonical Pocer data.
9. `core/index.ts` exports the platform layer.
10. `.env.example` documents the Phase 26/33 provider variables.

## Apply

From the repository root:

```bash
git apply reconciliation.patch
```

Then run the existing static check:

```bash
npm run lint
```

No dedicated test phase is introduced.
