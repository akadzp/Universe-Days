# Phase 26 — AI Production Integration

## Objective
Connect a real AI provider to the provider-neutral model layer without moving Universe authority into the model.

## Added
- Provider-neutral AI production context contract.
- Gemini REST adapter implementing the existing `ModelAdapter` contract.
- Server-side environment provider discovery.
- AI production proposal service with deterministic request/proposal IDs.
- Proposal-only authority guard.
- Control Center AI status endpoint.
- Runtime composition root now exposes `ai` and can automatically load Gemini when configured.

## Not delegated to AI
- Universe Date / temporal truth
- Entity / Story / Page / Transaction identity
- Canon mutation
- Storage paths
- Permission checks
- Deterministic state transitions

## Configuration
Use `.env.example` as the runtime environment template. No API key is stored in source control.

## Next
Phase 27 should compile the actual authoritative Universe/Story/Page context into `AIProductionContext` rather than allowing callers to assemble arbitrary context manually.
