import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = new URL('.', import.meta.url).pathname;

function write(rel, content) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  console.log(`updated ${rel}`);
}

function replaceOnce(rel, before, after) {
  const target = path.join(root, rel);
  const current = fs.readFileSync(target, 'utf8');
  if (!current.includes(before)) throw new Error(`Expected source fragment not found in ${rel}`);
  const next = current.replace(before, after);
  fs.writeFileSync(target, next, 'utf8');
  console.log(`updated ${rel}`);
}

function copyOverlay(rel) {
  const from = path.join(sourceRoot, rel);
  write(rel, fs.readFileSync(from, 'utf8'));
}

copyOverlay('core/platform/universe/authority.ts');
copyOverlay('core/platform/universe/index.ts');
copyOverlay('core/platform/production/runner.ts');
copyOverlay('core/platform/production/types.ts');
copyOverlay('core/platform/final/runtime.ts');

replaceOnce('core/platform/index.ts',
  "/** Pocer Universe Engine — Phases 15-26 platform layer. */",
  "/** Pocer Universe Engine — production platform layer. */");
replaceOnce('core/platform/index.ts',
  "export * from './providers/index.ts';\n",
  "export * from './providers/index.ts';\nexport * from './universe/index.ts';\n");
replaceOnce('core/index.ts',
  "export * from './universe/index.ts';\n",
  "export * from './universe/index.ts';\nexport * from './platform/index.ts';\n");

replaceOnce('app/api/routes/production.ts',
`productionRouter.post('/run', async (req, res) => {\n  try {\n    const runtime = getProductionRuntime();\n    const result = await runtime.productionRunner.run(req.body);\n    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);\n  } catch (error) {\n    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });\n  }\n});`,
`productionRouter.post('/run', async (req, res) => {\n  try {\n    const runtime = getProductionRuntime();\n    const mounted = runtime.universeAuthority.get();\n    if (!mounted) {\n      return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before production execution.' });\n    }\n\n    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};\n    const result = await runtime.productionRunner.run({\n      ...requestBody,\n      universe: mounted.universe,\n      universeId: mounted.universe.universeId,\n      universeScope: mounted.universeScope\n    });\n    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);\n  } catch (error) {\n    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });\n  }\n});`);

copyOverlay('app/api/routes/control.ts');

replaceOnce('app/web/App.tsx',
`          body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })`,
`          body: JSON.stringify({\n            mode: 'GENERIC_SEED',\n            universeScope: 'SANDBOX'\n          })`);
replaceOnce('app/web/App.tsx',
`  const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');\n  const [runInstruction, setRunInstruction] = useState('Generate daily chronicle synthesis for current universe epoch.');`,
`  const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('GENERAL_PRODUCTION');\n  const [runInstruction, setRunInstruction] = useState('Generate a proposal from the current authoritative Universe.');`);
replaceOnce('app/web/App.tsx',
`<div className="text-[11px] font-medium text-stone-300">Authoritative Instance</div>`,
`<div className="text-[11px] font-medium text-stone-300">Authoritative Instance</div>`);

replaceOnce('.env.example',
`GEMINI_API_KEY="MY_GEMINI_API_KEY"\n\n# APP_URL`,
`GEMINI_API_KEY="MY_GEMINI_API_KEY"\nGEMINI_MODEL="YOUR_GEMINI_MODEL"\n\n# Optional OpenAI-compatible provider\nOPENAI_API_KEY=""\nOPENAI_MODEL=""\nOPENAI_BASE_URL="https://api.openai.com/v1"\nOPENAI_PROVIDER_ID="openai"\nOPENAI_TIMEOUT_MS="60000"\n\n# APP_URL`);

console.log('Integration reconciliation applied. Run: npm run lint');
