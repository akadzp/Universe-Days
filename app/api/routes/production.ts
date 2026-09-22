import { Router } from 'express';
import { getProductionRuntime } from '../runtime.ts';
import { inspectDeploymentReadiness } from '../../../core/platform/deploy-runtime.ts';
export const productionRouter=Router();
productionRouter.get('/readiness',(_req,res)=>{res.json(inspectDeploymentReadiness(getProductionRuntime()));});
productionRouter.get('/runs',async(req,res)=>{const limitRaw=Number(req.query.limit??25);const limit=Number.isFinite(limitRaw)?Math.max(0,Math.min(200,Math.floor(limitRaw))):25;res.json({runs:await getProductionRuntime().productionStore.list({limit})});});
productionRouter.get('/runs/:runId',async(req,res)=>{const run=await getProductionRuntime().productionStore.get(req.params.runId);if(!run)return res.status(404).json({error:'PRODUCTION_RUN_NOT_FOUND'});return res.json(run);});
productionRouter.get('/providers',(_req,res)=>{const rt=getProductionRuntime();res.json({health:rt.providerRegistry.healthSnapshot(),providers:rt.providerRegistry.list().map(a=>a.profile)});});
productionRouter.get('/schedules',(_req,res)=>{res.json({schedules:getProductionRuntime().scheduler.list()});});
productionRouter.get('/schedules/due/:universeDate',(req,res)=>{res.json({universeDate:req.params.universeDate,jobs:getProductionRuntime().scheduler.due(req.params.universeDate)});});

productionRouter.post('/run', async (req, res) => {
  try {
    const runtime = getProductionRuntime();
    const result = await runtime.productionRunner.run(req.body);
    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
