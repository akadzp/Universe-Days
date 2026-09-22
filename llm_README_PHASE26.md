# Phase 26 — AI Production Integration

The AI layer is now a real provider boundary, while the deterministic Engine remains authoritative.

Runtime flow:

Universe Engine → compiled context → provider-neutral ModelRouter → Gemini adapter → AI proposal → proposal guard → downstream owner.

Set `GEMINI_API_KEY` and `GEMINI_MODEL` on the server/runtime. The API key is never sent to the browser.

The AI adapter can generate text or structured proposals. It does not receive storage handles, mutation authorities, deterministic ID factories, or permission controls. Its output is never treated as Canon merely because the provider returned JSON.
