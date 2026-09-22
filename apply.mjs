import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(packageDir, 'app/web/App.tsx');
const target = path.join(root, 'app/web/App.tsx');

if (!fs.existsSync(target)) {
  throw new Error(`Target not found: ${target}`);
}

if (!fs.existsSync(source)) {
  throw new Error(`Source not found: ${source}`);
}

const current = fs.readFileSync(target, 'utf8');
const next = fs.readFileSync(source, 'utf8');

if (current === next) {
  console.log('UI already matches the supplied App.tsx.');
  process.exit(0);
}

const backup = path.join(root, 'app/web/App.tsx.bak');
if (!fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
}

fs.copyFileSync(source, target);
console.log('Applied supplied App.tsx → app/web/App.tsx');
console.log(`Backup: ${path.relative(root, backup)}`);
