# Real Scheduler Execution — Phase 31 Closure

This overlay upgrades the Phase 31 scheduler from a `due()` calculator into a deterministic production dispatcher.

## What changes

- `PageProductionScheduler.due()` now respects `DAILY`, `WEEKLY`, `MONTHLY`, and a small deterministic `CUSTOM` filter grammar.
- Scheduled jobs receive persistent lifecycle state under `data/runtime/scheduled-jobs` (or `POCER_SCHEDULE_DATA_DIR`).
- `ScheduledProductionDispatcher` verifies that the requested Universe date matches the mounted authoritative Universe.
- Completed jobs are idempotently skipped on subsequent dispatches.
- Failed/blocked jobs require `retryFailed=true` to retry; interrupted `DISPATCHED` jobs require `retryDispatched=true`.
- Due jobs execute through the existing bounded page executor and `DailyProductionBridge`.
- `POST /api/production/schedules/execute/:universeDate` is the real scheduler dispatch endpoint.
- `GET /api/production/schedules/jobs/:universeDate` exposes durable scheduler state.
- Deployment readiness reports scheduler dispatcher wiring and job-store root.

## Apply

From repository root:

```bash
node apply-scheduler-execution.mjs
npm run lint
```

No dedicated test phase is added.
