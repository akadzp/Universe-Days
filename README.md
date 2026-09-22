# Phase 04 — Final Production Hardening

This overlay hardens the existing production runtime without adding a new business subsystem.

## Changes

- External production HTTP input is now allowlisted and typed; owner-produced Daily Context, Story packages, progression state, and Page packages cannot be injected through the Control API.
- Canonical Universe mounting requires the Instance Management authority actor; direct HTTP mounting remains SANDBOX-only.
- Persistence failures are fail-fast instead of silently degrading to in-memory state.
- Production Run, Scheduler Job, and Universe Snapshot stores reject malformed/corrupt records instead of ignoring them.
- Startup auto-load failures are surfaced as `UNREADY` rather than hidden behind an unmounted runtime.
- Cached production results are persisted for an auditable run record.
- Runtime concurrency and production generation parameters are bounded.
- Production and scheduler API failures now distinguish persistence outages from ordinary request errors.
- Atomic file writes remain deterministic and do not use wall-clock IDs.

## Apply

From repository root:

```bash
node apply-phase04.mjs
npm run lint
```

No new test phase is introduced.
