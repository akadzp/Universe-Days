import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const overlay = new Map([
  ['app/api/input.ts', 'app/api/input.ts'],
  ['app/api/routes/control.ts', 'app/api/routes/control.ts'],
  ['app/api/routes/production.ts', 'app/api/routes/production.ts'],
  ['core/platform/deploy-runtime.ts', 'core/platform/deploy-runtime.ts'],
  ['core/platform/final/runtime.ts', 'core/platform/final/runtime.ts'],
  ['core/platform/persistence/file.ts', 'core/platform/persistence/file.ts'],
  ['core/platform/persistence/index.ts', 'core/platform/persistence/index.ts'],
  ['core/platform/persistence/scheduled-jobs.ts', 'core/platform/persistence/scheduled-jobs.ts'],
  ['core/platform/persistence/universe.ts', 'core/platform/persistence/universe.ts'],
  ['core/platform/production/runner.ts', 'core/platform/production/runner.ts'],
  ['core/platform/universe/authority.ts', 'core/platform/universe/authority.ts'],
  ['core/platform/universe/instance.ts', 'core/platform/universe/instance.ts']
]);

for (const [target, source] of overlay) {
  const sourcePath = path.join(here, source);
  const targetPath = path.resolve(process.cwd(), target);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Applied ${target}`);
}


function patchTextFile(relativePath, replacements) {
  const targetPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(targetPath)) {
    console.warn(`Skipped optional UI hardening: ${relativePath} not found.`);
    return;
  }
  let content = fs.readFileSync(targetPath, 'utf8');
  for (const replacement of replacements) {
    if (content.includes(replacement.next)) continue;
    if (!content.includes(replacement.prev)) {
      console.warn(`Skipped optional UI replacement in ${relativePath}: source block not found.`);
      continue;
    }
    content = content.replace(replacement.prev, replacement.next);
  }
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Hardened ${relativePath}`);
}

patchTextFile('app/web/App.tsx', [
  {
    prev: `    universeScope?: string | null;\n    message: string;`,
    next: `    universeScope?: string | null;\n    storedCurrent?: { universeId: string; universeScope: string } | null;\n    startupLoadError?: string | null;\n    message: string;`
  },
  {
    prev: `          body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })`,
    next: `          body: JSON.stringify(\n            data?.universe.storedCurrent\n              ? { mode: 'PERSISTED_CURRENT' }\n              : { mode: 'GENERIC_SEED' }\n          )`
  }
]);

console.log('Phase 04 hardening overlay applied.');
