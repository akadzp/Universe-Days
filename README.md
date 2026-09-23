# POCER — Post-Integration Integrity Patch

Base target: `eb1c19ecae0ef61b01479756672eb25bb41063a9`

## Scope
- Removes synthetic relationship defaults from the Character Workspace API projection.
- Removes synthetic knowledge acquisition-source fallback from the Character Workspace API projection.
- Makes the corresponding UI relationship fields optional so unknown/unset values remain unknown.

No core authority, temporal model, Object System, or persistence behavior is changed.

## Apply
From repository root:

```bash
node apply-post-integrity.mjs
npm run lint
```

The script is fail-fast and requires exactly one match for every replacement.
