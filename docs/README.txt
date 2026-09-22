Pocer Universe Engine — Integration Reconciliation

Base main commit: 4ab5c7a6f0a70d48bbf3270faf4cb985d4823e3c

Apply from the repository root:
  node /path/to/apply-reconciliation.mjs

Or copy the overlay files and apply the same logical changes manually.

Important:
- Generic seed mounting is explicit SANDBOX only.
- Canonical production requires a real UniverseModel in the runtime.
- DAILY_STORY/DAILY_PAGE remains blocked until real daily/story/page context is supplied.
- Existing AI Studio chatbot is untouched; Production AI remains the provider adapter path.
