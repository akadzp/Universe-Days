import { Router } from 'express';
import { getProductionRuntime } from '../runtime.ts';
import { inspectDeploymentReadiness } from '../../../core/platform/deploy-runtime.ts';
import { parseProductionHttpInput, toProductionRunInput } from '../input.ts';

export const productionRouter = Router();

productionRouter.get('/readiness', (_req, res) => {
  try {
    res.json(inspectDeploymentReadiness(getProductionRuntime()));
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.get('/runs', async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 25);
    const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(200, Math.floor(limitRaw))) : 25;
    res.json({ runs: await getProductionRuntime().productionStore.list({ limit }) });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.get('/runs/:runId', async (req, res) => {
  try {
    const run = await getProductionRuntime().productionStore.get(req.params.runId);
    if (!run) return res.status(404).json({ error: 'PRODUCTION_RUN_NOT_FOUND' });
    return res.json(run);
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.get('/providers', (_req, res) => {
  const runtime = getProductionRuntime();
  res.json({ health: runtime.providerRegistry.healthSnapshot(), providers: runtime.providerRegistry.list().map(adapter => adapter.profile) });
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
    return res.status(503).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.post('/schedules/execute/:universeDate', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const pageDefinitionIds = body.pageDefinitionIds === undefined ? undefined : body.pageDefinitionIds;
    if (pageDefinitionIds !== undefined && (!Array.isArray(pageDefinitionIds) || pageDefinitionIds.some(value => typeof value !== 'string'))) {
      return res.status(400).json({ error: 'pageDefinitionIds must be an array of strings.' });
    }
    const maxOutputTokens = body.maxOutputTokens === undefined ? undefined : Number(body.maxOutputTokens);
    const temperature = body.temperature === undefined ? undefined : Number(body.temperature);
    const userInstruction = body.userInstruction === undefined ? undefined : body.userInstruction;
    if (userInstruction !== undefined && typeof userInstruction !== 'string') return res.status(400).json({ error: 'userInstruction must be a string.' });
    const report = await getProductionRuntime().schedulerDispatcher.executeDue({
      universeDate: req.params.universeDate,
      pageDefinitionIds: pageDefinitionIds as string[] | undefined,
      retryFailed: body.retryFailed === true,
      retryDispatched: body.retryDispatched === true,
      userInstruction,
      maxOutputTokens: maxOutputTokens === undefined ? undefined : maxOutputTokens,
      temperature: temperature === undefined ? undefined : temperature,
      bypassCache: body.bypassCache === true
    });
    const statusCode = report.status === 'FAILED' ? 502 : report.status === 'BLOCKED' ? 409 : 200;
    return res.status(statusCode).json(report);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

productionRouter.post('/run', async (req, res) => {
  try {
    const runtime = getProductionRuntime();
    const mounted = runtime.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before production execution.' });
    const parsed = parseProductionHttpInput(req.body, 'GENERAL_PRODUCTION');
    const result = await runtime.productionRunner.run(toProductionRunInput(parsed, mounted.universe, mounted.universeScope));
    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
