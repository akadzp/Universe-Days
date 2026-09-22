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
function replaceOnce(rel, needle, replacement) {
  const s = read(rel);
  if (!s.includes(needle)) throw new Error(`Anchor tidak ditemukan pada ${rel}: ${needle}`);
  write(rel, s.replace(needle, replacement));
}
function backup(rel) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) fs.copyFileSync(abs, `${abs}.bak`);
}
function copyPackage(rel) {
  const src = path.join(packageDir, rel);
  const dst = path.join(root, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (path.resolve(src) !== path.resolve(dst)) fs.copyFileSync(src, dst);
}

for (const f of [
  'core/universe/model/relationship.ts',
  'core/universe/model/character.ts',
  'core/universe/model/validation.ts'
]) backup(f);

copyPackage('core/universe/model/relationship.ts');

// Character already owns relationship references in the current runtime.
// Add no new field here; only validation of those references is introduced.

let validation = read('core/universe/model/validation.ts');
if (!validation.includes("import { validateRelationship } from './relationship.ts';")) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "import { validateActorClassification } from './actor.ts';\n",
    "import { validateActorClassification } from './actor.ts';\nimport { validateRelationship } from './relationship.ts';\n"
  );
}

validation = read('core/universe/model/validation.ts');
if (!validation.includes('DANGLING_RELATIONSHIP_REFERENCE')) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "      for (const styleRef of char.styleReferences ?? []) {\n",
`      for (const relationshipRef of char.relationshipReferences ?? []) {
        if (!universe.relationships || !universe.relationships[relationshipRef]) {
          issues.push({
            code: 'DANGLING_RELATIONSHIP_REFERENCE',
            path: \`characters.\${id}.relationshipReferences\`,
            message: \`Character relationship reference '\${relationshipRef}' not found in relationships\`,
            severity: 'ERROR'
          });
        } else {
          const relationship = universe.relationships[relationshipRef];
          if (String(relationship.subjectRef) !== id && String(relationship.targetRef) !== id) {
            issues.push({
              code: 'RELATIONSHIP_CHARACTER_MISMATCH',
              path: \`characters.\${id}.relationshipReferences.\${relationshipRef}\`,
              message: \`Relationship '\${relationshipRef}' tidak melibatkan character '\${id}'.\`,
              severity: 'ERROR'
            });
          }
        }
      }

      for (const styleRef of char.styleReferences ?? []) {
`
  );
}

validation = read('core/universe/model/validation.ts');
if (!validation.includes("for (const [relId, rel] of Object.entries(universe.relationships || {})) {\n      const relationshipValidation")) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "    for (const [relId, rel] of Object.entries(universe.relationships || {})) {\n",
`    for (const [relId, rel] of Object.entries(universe.relationships || {})) {
      const relationshipValidation = validateRelationship(rel, {
        subjectGender: universe.characters[String(rel.subjectRef)]?.actor?.gender,
        targetGender: universe.characters[String(rel.targetRef)]?.actor?.gender
      });
      for (const issue of relationshipValidation.issues) {
        issues.push({
          code: issue.code,
          path: \`relationships.\${relId}.\${issue.path}\`,
          message: issue.message,
          severity: 'ERROR'
        });
      }
`
  );
}

console.log('Relationship System berhasil dipasang. Backup dibuat sebagai *.bak.');
