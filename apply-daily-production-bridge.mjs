import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = new URL('.', import.meta.url).pathname;
const overlayRoot = path.join(sourceRoot, 'core');

function abs(rel) { return path.join(root, rel); }
function read(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function write(rel, content) {
  const target = abs(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  console.log(`updated ${rel}`);
}
function copyOverlay(rel) {
  const source = path.join(sourceRoot, rel);
  write(rel, fs.readFileSync(source, 'utf8'));
}
function replaceIfNeeded(rel, before, after) {
  const current = read(rel);
  if (current.includes(after)) return;
  if (!current.includes(before)) throw new Error(`Expected fragment not found in ${rel}`);
  write(rel, current.replace(before, after));
}

// Reconcile the Phase 34 authority boundary first. These writes are safe to repeat.
for (const rel of [
  'core/platform/universe/authority.ts',
  'core/platform/universe/index.ts',
  'core/platform/production/runner.ts',
  'core/platform/production/types.ts'
]) copyOverlay(rel);

copyOverlay('core/platform/final/runtime.ts');
copyOverlay('core/platform/production/daily-bridge.ts');
copyOverlay('core/platform/production/index.ts');
copyOverlay('app/api/routes/control.ts');
copyOverlay('app/api/routes/production.ts');

replaceIfNeeded('core/platform/index.ts',
  "/** Pocer Universe Engine — Phases 15-26 platform layer. */",
  "/** Pocer Universe Engine — production platform layer. */");
replaceIfNeeded('core/platform/index.ts',
  "export * from './providers/index.ts';\n",
  "export * from './providers/index.ts';\nexport * from './universe/index.ts';\n");
replaceIfNeeded('core/index.ts',
  "export * from './universe/index.ts';\n",
  "export * from './universe/index.ts';\nexport * from './platform/index.ts';\n");

// Keep the existing UI, but make its mount action explicitly use the generic
// development seed and its default Production action exercise the full bridge.
const app = read('app/web/App.tsx');
let nextApp = app;
nextApp = nextApp.replace(
`body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })`,
`body: JSON.stringify({\n            mode: 'GENERIC_SEED',\n            universeScope: 'SANDBOX'\n          })`
);
nextApp = nextApp.replace(
`const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('GENERAL_PRODUCTION');`,
`const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');`
);
nextApp = nextApp.replace(
`const [runInstruction, setRunInstruction] = useState('Generate a proposal from the current authoritative Universe.');`,
`const [runInstruction, setRunInstruction] = useState("Generate today's production from the current authoritative Universe.");`
);
if (nextApp !== app) write('app/web/App.tsx', nextApp);

write('.env.example', `# Gemini Production API adapter\nGEMINI_API_KEY="MY_GEMINI_API_KEY"\nGEMINI_MODEL="YOUR_GEMINI_MODEL"\n\n# Optional OpenAI-compatible production provider\nOPENAI_API_KEY=""\nOPENAI_MODEL=""\nOPENAI_BASE_URL="https://api.openai.com/v1"\nOPENAI_PROVIDER_ID="openai"\nOPENAI_TIMEOUT_MS="60000"\n\n# App hosting URL\nAPP_URL="MY_APP_URL"\n`);

console.log('Daily Production Bridge applied. Run: npm run lint');
