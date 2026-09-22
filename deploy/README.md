# Phase 34 — Production Deployment

The deployment target is a Node/Vite/Express process with durable production-run JSON persistence under `POCER_DATA_DIR`. Configure `.env.production`, build with `npm run build`, then run `node dist/server.cjs` or `docker compose up -d`. Check `/api/health` and `/api/production/readiness`. AI providers generate proposals only; Engine validation, IDs, ownership, persistence and mutation authority remain deterministic.
