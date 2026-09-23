# Verification checklist

After applying the patch:

1. `core/RUNTIME/index.ts` must resolve:
   - `./ENGINE`
   - `./GOVERNANCE`
   - `./TEMPORAL`
   - `./DOMAIN-GATEWAY`

2. These files must exist:
   - `core/RUNTIME/GOVERNANCE/index.ts`
   - `core/RUNTIME/DOMAIN-GATEWAY/index.ts`

3. `core/RUNTIME/GOVERNANCE/entity-registry.ts`:
   - must not import `EntityType` from `SHARED/model-types.ts`;
   - must declare `EntityType` before `EntityTypeRegistry`;
   - must contain the sole active `EntityType` definition for the new tree.

4. Existing `core/SHARED/model-types.ts` compatibility exports may remain.

5. Then run locally:
   `npm run lint`
