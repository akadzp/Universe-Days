import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('core');
const forbidden = [
  /\bDate\.now\s*\(/g,
  /\bMath\.random\s*\(/g,
  /\bcrypto\.randomUUID\s*\(/g,
  /\bperformance\.now\s*\(/g
];

const allowed = new Set([
  // No core files are allowlisted. Runtime metadata must be explicitly injected.
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.ts')) files.push(full);
  }
  return files;
}

const findings = [];
for (const file of walk(root)) {
  const rel = path.relative(process.cwd(), file).replaceAll(path.sep, '/');
  if (allowed.has(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    for (const match of text.matchAll(pattern)) {
      const before = text.slice(0, match.index);
      const line = before.split('\n').length;
      findings.push(`${rel}:${line}:${match[0]}`);
    }
  }
}

if (findings.length) {
  console.error('Phase 12 determinism audit FAILED.');
  for (const finding of findings) console.error(finding);
  process.exit(1);
}

console.log('Phase 12 determinism audit PASSED: no wall-clock/random APIs found under core/.');
