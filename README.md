# Universe-Days — 16-Stage Consolidated Reconstruction

This is the single consolidated patch for the current reconstruction pass.

Base required: `50c5d44c11fb1f9e3d043418e6d434c5d904ad74`

It is intentionally **one apply operation**, not a sequence of domain patches.

## Included

- Restores the UI layer from the reconstructed POCER surface and its API web boundary.
- Applies the audited Object/Relationship/Knowledge/Location/Mystery UI/API contract corrections.
- Removes audited semantic creation fallbacks (`Unknown != default`) in the creation paths.
- Removes the audited temporal fallback from day advancement and daily context.
- Keeps explicit seed data such as the generic seed date intact; seed fixtures are not semantic runtime defaults.
- Makes ProtocolMessage construction deterministic: request ID and timestamp are caller-supplied context rather than wall-clock/random generation.
- Updates the affected protocol tests and mutation-authority integration test to use deterministic context.

## Apply

From the repository root:

```bash
node /path/to/apply-final.mjs
npm run lint
npm test
npm run build
```

The script refuses to apply against another commit or over an existing UI. If application fails, it attempts to restore the previous state.

## Important

This package is a consolidated implementation artifact from the already-completed 16-stage audit. It is not seven sequential patches and should not be applied piecemeal.
