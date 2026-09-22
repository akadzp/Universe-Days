import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'core/universe/model/character-profile.ts',
  'core/universe/model/character.ts',
  'core/universe/model/index.ts',
  'tests/unit/universe-model/character-profile.test.ts',
  'docs/character-system.md',
];

for (const relativePath of files) {
  const source = path.join(packageDir, relativePath);
  const target = path.join(root, relativePath);

  if (!fs.existsSync(source)) throw new Error(`Source not found: ${relativePath}`);
  if (!fs.existsSync(path.dirname(target))) fs.mkdirSync(path.dirname(target), { recursive: true });

  if (fs.existsSync(target)) {
    const backup = `${target}.bak`;
    if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
  }

  fs.copyFileSync(source, target);
  console.log(`Applied ${relativePath}`);
}
