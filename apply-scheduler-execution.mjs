import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const patchRoot = path.join(here, 'patch');

function copyRelative(relativePath) {
  const source = path.join(patchRoot, relativePath);
  const destination = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`updated ${relativePath}`);
}

const files = [
  'core/platform/scheduler/types.ts',
  'core/platform/scheduler/scheduler.ts',
  'core/platform/scheduler/dispatcher.ts',
  'core/platform/scheduler/index.ts',
  'core/platform/persistence/scheduled-jobs.ts',
  'core/platform/persistence/index.ts',
  'core/platform/final/runtime.ts',
  'core/platform/deploy-runtime.ts',
  'app/api/routes/production.ts'
];

for (const file of files) copyRelative(file);
console.log('Scheduler execution overlay applied.');
