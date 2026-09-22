# Phase 27 — Production Context Compiler

Phase 27 creates the deterministic bridge from authoritative Universe state to the non-authoritative AI production boundary.

## Guarantees
- UniverseModel remains the source of truth.
- Context identity is deterministic.
- Universe temporal identity is copied from the authoritative UniverseModel.
- Daily, Story, Page, Continuity, and selected domain data are included only when supplied by the caller.
- Token budget planning is applied before the context crosses into AI production.
- Existing context compression and shared token-layer components remain reusable.
- No AI output can mutate Canon through this layer.

## Main files
- `core/platform/context/compiler.ts`
- `core/platform/context/index.ts`
- `core/platform/final/runtime.ts`

## Usage
```ts
const compiled = runtime.contextCompiler.compile({
  universe,
  universeScope: 'YOUR_SCOPE',
  purpose: 'DAILY_STORY',
  userInstruction: 'buat cerita hari ini',
  dailyContext,
  storyPackage,
  budget: {
    inputLimit: 12000,
    outputReserve: 3000,
    safetyReserve: 500
  }
});

const proposal = await runtime.ai.propose(
  compiled.context,
  policy
);
```

The compiler does not create a Story, Page, event, entity, or Canon mutation. It only prepares a deterministic proposal context.
