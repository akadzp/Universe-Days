# Pocer Application Layer

Baseline: Core `6fd492f`.

This layer is intentionally rebuilt from zero. It does not persist Universe state,
does not call UniverseModelFactory.evolve(), and does not expose raw Universe
snapshots as its public query contract.

Mutation path:

Application Command
-> Application Authorization
-> Core UniverseCommand + WorkflowDefinition
-> PocerExecutionEngine
-> TransactionBoundary
-> authoritative persistence

Domain ownership is proven by Core owner capabilities. The application actor is
the request/orchestration identity, not the semantic domain owner.

Current canonical commands:
- CREATE_CHARACTER
- APPLY_CHARACTER_INDICATOR_EFFECT
- PROPOSE_CHARACTER_RESPONSE (read/proposal path; no mutation)

Current canonical queries:
- GET_UNIVERSE_STATUS
- GET_CHARACTER_SUMMARY
- LIST_CHARACTERS
- GET_DAILY_CYCLE_STATUS

Daily progression is deliberately not faked here. Core currently prohibits
DAILY_UNIVERSE from direct Canon replacement in TransactionBoundary. A future
daily command must call a canonical Daily-Universe-owned workflow/service.

Integration:
```ts
const app = createApplicationRuntime({
  executionEngine: coreRuntime.executionEngine,
});
```

The application runtime must receive the already-composed Core engine. It does
not construct a second persistence boundary.
