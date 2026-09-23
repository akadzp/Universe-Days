import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createProductionRuntime } from './core/INFRA/FINAL/runtime.ts';
import { createGenericSeedUniverse } from './core/VALIDATION/fixtures/universe-seed.ts';
import { INSTANCE_MANAGEMENT_ACTOR } from './core/INFRA/INSTANCE/instance.ts';
import { inspectDeploymentReadiness } from './core/INFRA/FINAL/deploy-runtime.ts';
import { CharacterCommandService } from './core/CHARACTER/character-command.ts';
import { DailyProductionPipeline } from './core/INFRA/PRODUCTION/legacy/pipeline.ts';
import { DeterministicMockProductionRenderer } from './core/INFRA/PRODUCTION/legacy/mock-renderer.ts';
import { TimePoint } from './core/RUNTIME/TEMPORAL/time-point.ts';
import { StoryTriggerType } from './core/DAILY-STORY/trigger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const cliPort = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : null;
  const PORT = cliPort || (process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000);

  app.use(express.json());

  // 1. Initialize Core Platform Runtime
  const runtime = createProductionRuntime({
    autoLoadPersistedUniverse: false,
    loadEnvironmentProviders: true
  });

  // 2. Ensure Authoritative Universe is Mounted
  function ensureMountedUniverse() {
    let mounted = runtime.universeAuthority.get();
    if (!mounted) {
      try {
        const seed = createGenericSeedUniverse();
        runtime.universeInstances.persist(seed, INSTANCE_MANAGEMENT_ACTOR);
        mounted = runtime.universeInstances.load(seed.universeId, 'DAILY_PRODUCTION');
      } catch (err) {
        console.error('Failed to mount seed universe:', err);
      }
    }
    return mounted;
  }

  ensureMountedUniverse();

  // Load domains.json specification
  let domainsSpec: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, 'rules/registry/domains.json'), 'utf-8');
    domainsSpec = JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read domains.json:', err);
  }

  // --- API Endpoints ---

  // Health and Readiness
  app.get('/api/readiness', (req, res) => {
    try {
      const report = inspectDeploymentReadiness(runtime);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Current Authoritative Universe State
  app.get('/api/universe', (req, res) => {
    try {
      const mounted = ensureMountedUniverse();
      if (!mounted) {
        return res.status(500).json({ error: 'No authoritative Universe mounted' });
      }
      const u = mounted.universe;
      res.json({
        universeId: u.universeId,
        universeDate: u.temporalContext.currentUniverseDate,
        universeTime: u.temporalContext.currentUniverseTime,
        scope: mounted.universeScope,
        statistics: {
          charactersCount: Object.keys(u.characters || {}).length,
          locationsCount: Object.keys(u.locations || {}).length,
          objectsCount: Object.keys(u.objects || {}).length,
          relationshipsCount: Object.keys(u.relationships || {}).length,
          knowledgeCount: Object.keys(u.knowledge || {}).length,
          statesCount: Object.keys(u.states || {}).length,
          eventsCount: Object.keys(u.events || {}).length,
          processesCount: Object.keys(u.processes || {}).length,
          unresolvedCount: Object.keys(u.unresolvedConditions || {}).length,
        },
        temporalContext: u.temporalContext,
        characters: u.characters,
        locations: u.locations,
        objects: u.objects,
        relationships: u.relationships,
        knowledge: u.knowledge,
        states: u.states,
        events: u.events,
        processes: u.processes,
        unresolvedConditions: u.unresolvedConditions
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Domains & Rules
  app.get('/api/rules', (req, res) => {
    res.json(domainsSpec);
  });

  // Create Character through the Character-owned command boundary.
  app.post('/api/characters', (req, res) => {
    try {
      const { id, displayName, role, locationRef, effectiveTime } = req.body ?? {};
      const mounted = ensureMountedUniverse();
      if (!mounted) return res.status(500).json({ error: 'No authoritative Universe mounted.' });

      const time =
        typeof effectiveTime === 'string' && effectiveTime.trim()
          ? effectiveTime.trim()
          : mounted.universe.temporalContext.currentUniverseTime;

      const character = CharacterCommandService.createCharacter(
        mounted,
        runtime.universeInstances,
        {
          id: String(id ?? ''),
          displayName: String(displayName ?? ''),
          role: role ? String(role) : undefined,
          locationRef: locationRef ? String(locationRef) : null,
          effectiveTime: time
        }
      );

      return res.status(201).json({
        message: 'Character command accepted and persisted through Character boundary.',
        character
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(message.includes('already exists') ? 409 : 422).json({ error: message });
    }
  });

  // Trigger Daily Production Run Pipeline
  app.post('/api/production/run', async (req, res) => {
    try {
      const mounted = ensureMountedUniverse();
      if (!mounted) {
        return res.status(500).json({ error: 'No authoritative Universe mounted' });
      }

      const u = mounted.universe;
      const pipeline = new DailyProductionPipeline({
        repository: runtime.dailyBridge ? undefined : undefined
      });

      const renderer = new DeterministicMockProductionRenderer();
      const parsedTime = TimePoint.parse(u.temporalContext.currentUniverseTime);
      const startTime = parsedTime.success && parsedTime.data ? parsedTime.data : TimePoint.unknown();

      const runResult = await pipeline.run({
        universeId: u.universeId,
        universeScope: mounted.universeScope,
        startTime,
        endTime: startTime,
        sequenceNumber: 1,
        storyTrigger: {
          triggerId: `TRIG_${Date.now()}`,
          type: StoryTriggerType.TEMPORAL_TRANSITION,
          sourceReference: 'TEMPORAL_SYSTEM',
          universeScope: mounted.universeScope,
          temporalAnchor: u.temporalContext.currentUniverseTime,
          description: 'Daily sunrise cycle progression in the Universe',
          status: 'ACTIVE'
        },
        renderer,
        dryRun: false
      });

      if (!runResult.success || !runResult.data) {
        return res.status(422).json({
          error: runResult.error,
          message: runResult.message
        });
      }

      res.json({
        success: true,
        runId: runResult.data.runId,
        status: runResult.data.status,
        storyPackage: runResult.data.storyPackage,
        renderResult: runResult.data.renderResult,
        traces: runResult.data.traces,
        finalization: runResult.data.finalization
      });
    } catch (err) {
      console.error('Production pipeline error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Advance Temporal Universe Time
  app.post('/api/time/advance', (req, res) => {
    try {
      const mounted = ensureMountedUniverse();
      if (!mounted) {
        return res.status(500).json({ error: 'No authoritative Universe mounted' });
      }

      const u = mounted.universe;
      const previousDate = u.temporalContext.currentUniverseDate;
      const currentDate = new Date(previousDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      const newDateStr = currentDate.toISOString().split('T')[0];
      const newTimeStr = `${newDateStr}T00:00:00Z`;

      const updatedUniverse: any = JSON.parse(JSON.stringify(u));
      updatedUniverse.temporalContext.currentUniverseDate = newDateStr;
      updatedUniverse.temporalContext.currentUniverseTime = newTimeStr;

      runtime.universeInstances.persist(updatedUniverse, INSTANCE_MANAGEMENT_ACTOR);
      runtime.universeInstances.load(updatedUniverse.universeId, mounted.universeScope);

      res.json({
        success: true,
        previousDate,
        newUniverseDate: newDateStr,
        newUniverseTime: newTimeStr
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Reset to Seed
  app.post('/api/universe/reset', (req, res) => {
    try {
      const seed = createGenericSeedUniverse();
      runtime.universeInstances.persist(seed, INSTANCE_MANAGEMENT_ACTOR);
      const mounted = runtime.universeInstances.load(seed.universeId, 'DAILY_PRODUCTION');
      res.json({ success: true, universeId: mounted.universe.universeId });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // 3. Vite Middleware (Dev) or Static files (Prod)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pocer Universe Days server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
