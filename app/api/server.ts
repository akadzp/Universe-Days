import express, { Express } from 'express';
import { architectureRouter } from './routes/architecture.ts';

export function configureApiRoutes(app: Express): void {
  app.use(express.json());

  // Health and minimal architecture inspection
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', engine: 'Pocer Universe Engine', phase: 'Architecture Core' });
  });

  app.use('/api/architecture', architectureRouter);
}
