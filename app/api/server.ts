import express, { Express } from 'express';
import { architectureRouter } from './routes/architecture.ts';
import { controlRouter } from './routes/control.ts';

export function configureApiRoutes(app: Express): void {
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'Pocer Universe Engine',
      architecturePhase: 25,
      uiPhase: '25.5'
    });
  });

  // Legacy architecture inspection endpoint. Kept for compatibility.
  app.use('/api/architecture', architectureRouter);

  // Phase 25.5 operational Control Center.
  app.use('/api/control', controlRouter);
}
