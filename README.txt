POCER UNIVERSE ENGINE — DAILY PRODUCTION BRIDGE

This overlay closes the integration gap between the deterministic Daily Universe /
Story / Page systems and the Phase 29-34 AI production worker.

IMPORTANT
- The installer also applies the Integration Reconciliation changes because the
  current main branch may only contain reconciliation.patch rather than the
  reconciled source files.
- It is safe to run the installer again after reconciliation has already been
  applied.
- It does not introduce Phase 35.
- Existing Gemini chatbot code is not removed or replaced.

APPLY
1. Extract this ZIP anywhere inside or beside the repository.
2. From the repository root run:

   node /path/to/pocer-daily-bridge/apply-daily-production-bridge.mjs

3. Run:

   npm run lint

PRODUCTION FLOW
Authoritative Universe
  -> Daily Universe Period Context
  -> Daily Story Package
  -> Daily Story AI Proposal
  -> Daily Page Packages (bounded parallel executor)
  -> Daily Page AI Proposals
  -> Output validation
  -> Production persistence

The bridge never finalizes or mutates Canon. Owner systems retain authority.
