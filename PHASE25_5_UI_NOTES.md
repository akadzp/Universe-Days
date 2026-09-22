# Phase 25.5 — UI Control Center

## Replaces
- The old Phase 1–6 architecture dashboard in `app/web/App.tsx`.
- The old API-only dashboard dependency in `/api/architecture/status`.

## Adds
- `app/api/routes/control.ts`
- `/api/control/overview`
- `/api/control/pages`
- Operational Control Center navigation: Overview, Universe, Daily, Story, Pages, Production, System.

## Important behavior
- No fake Universe Date, Period, Story ID, or Production Run ID is generated.
- The Production button remains disabled until a real Universe instance is mounted.
- AI providers are reported as `NO_PROVIDER` when no adapter is registered.
- The legacy `/api/architecture` route remains mounted for compatibility.

## Apply
Copy the archive contents into the repository, preserving paths. Existing engine files are not replaced.
