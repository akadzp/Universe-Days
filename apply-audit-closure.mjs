import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const changed = [];

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, content){ fs.writeFileSync(path.join(root, rel), content, 'utf8'); changed.push(rel); }
function replaceOnce(rel, oldText, newText){
  const content = read(rel);
  const index = content.indexOf(oldText);
  if(index < 0) throw new Error(`Expected text not found in ${rel}`);
  write(rel, content.slice(0,index) + newText + content.slice(index + oldText.length));
}
function removeFile(rel){
  const target = path.join(root, rel);
  if(fs.existsSync(target)){ fs.rmSync(target, {force:true}); changed.push(`${rel} (deleted)`); }
}

replaceOnce(
  'app/web/App.tsx',
  `          body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })`,
  `          body: JSON.stringify({\n            mode: 'GENERIC_SEED',\n            universeScope: 'SANDBOX'\n          })`
);

replaceOnce(
  'core/index.ts',
  `export * from './universe/index.ts';\n`,
  `export * from './universe/index.ts';\nexport * from './platform/index.ts';\n`
);

replaceOnce(
  'core/platform/index.ts',
  `/** Pocer Universe Engine — Phases 15-26 platform layer. */`,
  `/** Pocer Universe Engine — Phases 15-34 platform layer. */`
);

replaceOnce(
  'app/api/routes/production.ts',
  `import { inspectDeploymentReadiness } from '../../../core/platform/deploy-runtime.ts';\n`,
  `import { inspectDeploymentReadiness } from '../../../core/platform/deploy-runtime.ts';\nimport type { ProductionRunInput } from '../../../core/platform/production/types.ts';\n`
);
replaceOnce(
  'app/api/routes/production.ts',
  `    const result = await runtime.productionRunner.run(request as never);`,
  `    const result = await runtime.productionRunner.run(request as ProductionRunInput);`
);

replaceOnce(
  'app/api/routes/control.ts',
  `import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';\n`,
  `import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';\nimport type { DailyProductionBridgeInput } from '../../../core/platform/production/daily-bridge.ts';\nimport type { ProductionRunInput } from '../../../core/platform/production/types.ts';\n`
);
replaceOnce(
  'app/api/routes/control.ts',
  `      const bridge = await current.dailyBridge.run({\n        ...(body as Record<string, unknown>),\n        universe: mounted.universe,\n        universeScope: mounted.universeScope,\n        userInstruction,\n        mode: purpose === 'DAILY_PAGE' ? 'PAGE_ONLY' : 'FULL_DAILY'\n      } as any);`,
  `      const bridgeInput: DailyProductionBridgeInput = {\n        ...(body as Partial<DailyProductionBridgeInput>),\n        universe: mounted.universe,\n        universeScope: mounted.universeScope,\n        userInstruction,\n        mode: purpose === 'DAILY_PAGE' ? 'PAGE_ONLY' : 'FULL_DAILY'\n      };\n      const bridge = await current.dailyBridge.run(bridgeInput);`
);
replaceOnce(
  'app/api/routes/control.ts',
  `    const result = await current.productionRunner.run({\n      ...(body as Record<string, unknown>),\n      universe: mounted.universe,\n      universeId: mounted.universe.universeId,\n      universeScope: mounted.universeScope,\n      purpose,\n      userInstruction\n    } as any);`,
  `    const productionInput: ProductionRunInput = {\n      ...(body as Partial<ProductionRunInput>),\n      universe: mounted.universe,\n      universeId: mounted.universe.universeId,\n      universeScope: mounted.universeScope,\n      purpose,\n      userInstruction\n    };\n    const result = await current.productionRunner.run(productionInput);`
);

removeFile('data/runtime/production-runs/RUN_b720fec3.json');

console.log('Audit closure applied.');
console.log(changed.join('\n'));
