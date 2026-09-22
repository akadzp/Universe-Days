import { createProductionRuntime, type ProductionRuntime } from '../../core/platform/final/runtime.ts';
let runtime:ProductionRuntime|null=null;
export function getProductionRuntime():ProductionRuntime{runtime??=createProductionRuntime();return runtime;}
