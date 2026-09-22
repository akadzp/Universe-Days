import express,{Express} from 'express';
import { architectureRouter } from './routes/architecture.ts';
import { controlRouter } from './routes/control.ts';
import { productionRouter } from './routes/production.ts';
import { getProductionRuntime } from './runtime.ts';
export function configureApiRoutes(app:Express):void{app.use(express.json({limit:process.env.POCER_API_BODY_LIMIT??'2mb'}));app.get('/api/health',(_req,res)=>{const rt=getProductionRuntime();res.json({status:'ok',engine:'Pocer Universe Engine',architecturePhase:34,providers:rt.providerRegistry.list().map(a=>a.profile.providerId)});});app.use('/api/architecture',architectureRouter);app.use('/api/control',controlRouter);app.use('/api/production',productionRouter);}
