# Control Center UI Update

This package updates the presentation/control layer at the existing repository path:

- `app/web/App.tsx`

No `core/` logic is changed by this package.

## Naming convention

Repository filenames remain the canonical filenames. Version numbers and update labels are documented here rather than inserted into source filenames.

The package intentionally uses the stable installer filename:

- `apply.mjs`

The target application filename remains:

- `app/web/App.tsx`

## What this update changes

The Control Center is aligned with the current frozen runtime architecture and exposes:

- Home
- Universe
- Production
- Scheduler
- Pages
- AI
- System

The UI uses the current control and production APIs, including persisted current Universe loading, sandbox access, scheduler execution, production runs, readiness, provider status, and usage.

The old synthetic Universe mounting flow is removed from the interface.

## Apply

Run from the repository root:

```bash
node apply.mjs
npm run lint
npm run build
```

The installer creates `app/web/App.tsx.bak` before replacing the target file.

## Verification performed on the package

- `node --check apply.mjs`
- TypeScript transpile check for `app/web/App.tsx`

Full repository lint/build was not run here because the complete repository checkout is not available in this package workspace.
