# Phase 03 — Persistent Universe Runtime

This overlay adds durable Universe snapshot storage and a persistent instance boundary.

## Runtime behavior

- `FileUniverseSnapshotStore` persists validated `UniverseModel` snapshots as atomic JSON under `POCER_UNIVERSE_DATA_DIR`.
- `UniverseInstanceManager` is the instance-management boundary between storage and `UniverseAuthorityStore`.
- Storage does not become Canon authority; mounting still occurs through `UniverseAuthorityStore`.
- Canonical Universe instances are loaded from persisted snapshots. Direct raw canonical mounts through the Control API are rejected.
- `GENERIC_SEED` remains an explicit `SANDBOX` development path and is not promoted to the persistent current-Universe pointer.
- Runtime startup automatically loads the persisted current Universe pointer when one exists. Corrupt persistence blocks auto-mount instead of repairing or replacing data.
- `POST /api/control/universe/persist` persists the currently mounted Universe through `INSTANCE_MANAGEMENT_SYSTEM` authority.
- `POST /api/control/universe/load` loads a named persisted snapshot.
- `POST /api/control/universe/load-current` loads the persisted current snapshot.
- `GET /api/control/universe/storage` exposes storage and instance state.
- Docker now places Universe snapshots and scheduler job state inside the shared runtime volume.

## Apply

From the repository root:

```bash
node apply-phase03.mjs
npm run lint
```

No dedicated test phase is added. The overlay should at minimum be syntax/transpile-checked before commit.

## Repository layout

The ZIP intentionally places repository files at their actual paths (`core/...`, `app/...`, etc.). There is no redundant `patch/` source directory.
