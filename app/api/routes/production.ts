import { Router } from 'express';
import { getProductionRuntime } from '../runtime.ts';
import { inspectDeploymentReadiness } from '../../../core/platform/deploy-runtime.ts';
import type { ProductionContextPurpose } from '../../../core/platform/context/compiler.ts';

export const productionRouter = Router();

productionRouter.get('/readiness', (_req, res) => {
  res.json(inspectDeploymentReadiness(getProductionRuntime()));
});

productionRouter.get('/runs', async (req, res) => {
  const limitRaw = Number(req.query.limit ?? 25);
  const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(200, Math.floor(limitRaw))) : 25;
  res.json({ runs: await getProductionRuntime().productionStore.list({ limit }) });
});

productionRouter.get('/runs/:runId', async (req, res) => {
  const run = await getProductionRuntime().productionStore.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'PRODUCTION_RUN_NOT_FOUND' });
  return res.json(run);
});

productionRouter.get('/providers', (_req, res) => {
  const runtime = getProductionRuntime();
  res.json({
    health: runtime.providerRegistry.healthSnapshot(),
    providers: runtime.providerRegistry.list().map(adapter => adapter.profile)
  });
});

productionRouter.get('/schedules', (_req, res) => {
  res.json({ schedules: getProductionRuntime().scheduler.list() });
});

productionRouter.get('/schedules/due/:universeDate', (req, res) => {
  try {
    res.json({ universeDate: req.params.universeDate, jobs: getProductionRuntime().scheduler.due(req.params.universeDate) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.get('/schedules/jobs/:universeDate', async (req, res) => {
  try {
    const jobs = await getProductionRuntime().scheduledJobStore.list({ universeDate: req.params.universeDate });
    return res.json({ universeDate: req.params.universeDate, jobs });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.post('/schedules/execute/:universeDate', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const report = await getProductionRuntime().schedulerDispatcher.executeDue({
      universeDate: req.params.universeDate,
      pageDefinitionIds: Array.isArray(body.pageDefinitionIds) ? body.pageDefinitionIds.filter((value: unknown): value is string => typeof value === 'string') : undefined,
      retryFailed: body.retryFailed === true,
      retryDispatched: body.retryDispatched === true,
      userInstruction: typeof body.userInstruction === 'string' ? body.userInstruction : undefined,
      maxOutputTokens: Number.isFinite(Number(body.maxOutputTokens)) ? Number(body.maxOutputTokens) : undefined,
      temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : undefined,
      bypassCache: body.bypassCache === true
    });
    const statusCode = report.status === 'FAILED' ? 502 : report.status === 'BLOCKED' ? 409 : 200;
    return res.status(statusCode).json(report);
  } catch (error) {
    return res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.post('/run', async (req, res) => {
  try {
    const runtime = getProductionRuntime();
    const mounted = runtime.universeAuthority.get();
    if (!mounted) {
      return res.status(409).json({
        error: 'UNIVERSE_NOT_MOUNTED',
        message: 'Mount an authoritative Universe before production execution.'
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const purpose = (typeof body.purpose === 'string' ? body.purpose : 'GENERAL_PRODUCTION') as ProductionContextPurpose;
    const request = {
      ...body,
      universe: mounted.universe,
      universeId: mounted.universe.universeId,
      universeScope: mounted.universeScope,
      purpose
    };

    const result = await runtime.productionRunner.run(request as never);
    return res
      .status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200)
      .json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
