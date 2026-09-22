# Pocer Universe Engine — Phases 15–25

This package is an additive platform overlay for the engine after Phase 14.

## Phase map

| Phase | Layer | Purpose |
|---|---|---|
| 15 | `scaling/` | One page catalog over one shared Universe, deterministic page identities, sharding |
| 16 | `parallel/` | Bounded concurrent page production with per-job isolation and idempotency |
| 17 | `token/` | Token budgets, priority planning, and shared-context reuse |
| 18 | `context/` | Deterministic context segmentation, whitespace compaction, deduplication, bounded packing |
| 19 | `cache/` | Exact and similarity-based semantic cache with generation-based freshness |
| 20 | `continuity/` | Long-term continuity ledger and runtime drift observation; no dedicated test phase |
| 21 | `recovery/` | Deterministic checkpoints and failure-class recovery decisions |
| 22 | `versioning/` | Versioned envelopes, registries, and explicit migration paths |
| 23 | `model/` | Provider-neutral model contract and legacy LLM bridge |
| 24 | `hardening/` | Runtime limits, fail-closed gates, idempotency keys, mutation guards |
| 25 | `final/` | Single production composition root wiring the platform layers together |

## Architectural invariants

1. Universe remains authoritative. Page output is projection, not truth.
2. Page count does not multiply Universe state. All pages read shared upstream context.
3. LLM/model adapters are replaceable. They do not own Canon or deterministic state transitions.
4. Runtime generation replaces wall-clock timestamps for cache, continuity, and recovery semantics.
5. Persistent ownership remains behind repositories/services that can be swapped later.
6. A failed page job is isolated from other page jobs unless the caller explicitly enables batch stop-on-fatal.
7. Cache identity includes namespace, context fingerprint, and model profile so stale outputs cannot silently cross boundaries.
8. Recovery never silently repairs corrupted Canon; corruption is quarantined or aborted.

## Integration

The overlay expects Phases 11 and 14 to already be present. It adds `core/platform/` and one root export line in `core/index.ts`.
No new npm dependency is required.
