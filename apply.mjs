import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const root = fs.existsSync(path.join(packageDir, 'core')) && fs.existsSync(path.join(packageDir, 'README.md'))
  ? packageDir
  : path.resolve(packageDir, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}
function backup(rel) {
  const abs = path.join(root, rel);
  fs.copyFileSync(abs, `${abs}.bak`);
}
function copyPackage(rel) {
  fs.copyFileSync(
    path.join(packageDir, rel),
    path.join(root, rel)
  );
}

const files = [
  'core/universe/model/state.ts',
  'core/universe/model/character.ts',
  'core/universe/model/index.ts',
  'core/universe/model/validation.ts'
];
for (const f of files) backup(f);

copyPackage('core/universe/model/state.ts');
copyPackage('core/universe/model/character-state.ts');

write('core/universe/model/character.ts', readFromPackage('core/universe/model/character.ts'));
write('core/universe/model/index.ts', readFromPackage('core/universe/model/index.ts'));
write('core/universe/model/validation.ts', readFromPackage('core/universe/model/validation.ts'));

function readFromPackage(rel) {
  return fs.readFileSync(path.join(packageDir, rel), 'utf8');
}

console.log('State System berhasil dipasang. Backup dibuat sebagai *.bak.');
