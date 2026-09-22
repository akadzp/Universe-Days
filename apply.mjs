import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error(`File tidak ditemukan: ${rel}`);
  return { file, text: fs.readFileSync(file, 'utf8') };
}

function write(rel, text) {
  const { file } = read(rel);
  if (text === fs.readFileSync(file, 'utf8')) return false;
  const backup = `${file}.bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, text, 'utf8');
  return true;
}

function insertOnce(text, marker, insertion, label) {
  if (text.includes(insertion.trim())) return text;
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`Anchor tidak ditemukan untuk ${label}`);
  return text.slice(0, index) + insertion + text.slice(index);
}

const continuitySource = fs.readFileSync(
  path.join(ROOT, 'core/universe/model/character-continuity.ts'),
  'utf8'
);

// 1. Install the new source file from this package.
fs.mkdirSync(path.join(ROOT, 'core/universe/model'), { recursive: true });
const continuityPath = path.join(ROOT, 'core/universe/model/character-continuity.ts');
if (!fs.existsSync(continuityPath) || fs.readFileSync(continuityPath, 'utf8') !== continuitySource) {
  if (fs.existsSync(continuityPath) && !fs.existsSync(`${continuityPath}.bak`)) fs.copyFileSync(continuityPath, `${continuityPath}.bak`);
  fs.writeFileSync(continuityPath, continuitySource, 'utf8');
}

// 2. Export Character Continuity from the model entry point.
{
  const { text } = read('core/universe/model/index.ts');
  const next = insertOnce(
    text,
    "export * from './character.ts';\n",
    "export * from './character-continuity.ts';\n",
    'model index export'
  );
  write('core/universe/model/index.ts', next);
}

// 3. Add the continuity collection to UniverseModel.
{
  const { text } = read('core/universe/model/universe.ts');
  let next = text;
  next = insertOnce(
    next,
    "import { CharacterStyleEntity } from './character-style.ts';\n",
    "import { CharacterContinuityEntity } from './character-continuity.ts';\n",
    'Universe continuity import'
  );
  next = insertOnce(
    next,
    '  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;\n',
    '  readonly continuities: Readonly<Record<string, CharacterContinuityEntity>>;\n',
    'Universe continuity collection'
  );
  next = insertOnce(
    next,
    '  styles?: Record<string, CharacterStyleEntity>;\n',
    '  continuities?: Record<string, CharacterContinuityEntity>;\n',
    'Universe continuity factory parameter'
  );
  next = insertOnce(
    next,
    '      styles: freezeMap(params.styles),\n',
    '      continuities: freezeMap(params.continuities),\n',
    'Universe continuity factory output'
  );
  write('core/universe/model/universe.ts', next);
}

// 4. Add Character continuity reference and cross-domain validation.
{
  const { text } = read('core/universe/model/validation.ts');
  let next = text;
  next = insertOnce(
    next,
    "import { CharacterStyleEntity, validateCharacterStyle } from './character-style.ts';\n",
    "import { CharacterContinuityEntity, validateCharacterContinuity } from './character-continuity.ts';\n",
    'continuity validator import'
  );

  const characterAnchor = "      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n";
  const continuityCharacterBlock = `      if (char.continuityReference && (!universe.continuities || !universe.continuities[char.continuityReference])) {\n        issues.push({\n          code: 'DANGLING_CONTINUITY_REFERENCE',\n          path: \`characters.\${id}.continuityReference\`,\n          message: \`Character continuity '\${char.continuityReference}' not found in continuities\`,\n          severity: 'ERROR'\n        });\n      } else if (char.continuityReference && universe.continuities[char.continuityReference]) {\n        const continuity = universe.continuities[char.continuityReference];\n        if (continuity.characterId !== id) {\n          issues.push({\n            code: 'CONTINUITY_CHARACTER_MISMATCH',\n            path: \`characters.\${id}.continuityReference\`,\n            message: \`Continuity '\${char.continuityReference}' belongs to '\${continuity.characterId}', not '\${id}'\`,\n            severity: 'ERROR'\n          });\n        }\n      }\n\n`;
  next = insertOnce(next, characterAnchor, continuityCharacterBlock, 'Character continuity reference validation');

  const collectionAnchor = "    for (const [id, state] of Object.entries(universe.states || {})) {\n";
  const continuityCollectionBlock = `    for (const [id, continuity] of Object.entries(universe.continuities || {})) {\n      if (continuity.continuityId !== id) {\n        issues.push({\n          code: 'ID_KEY_MISMATCH',\n          path: \`continuities.\${id}\`,\n          message: \`Continuity map key '\${id}' does not match continuity id '\${continuity.continuityId}'\`,\n          severity: 'ERROR'\n        });\n      }\n      const continuityReport = validateCharacterContinuity(continuity as CharacterContinuityEntity, universe);\n      for (const message of continuityReport.issues) {\n        issues.push({\n          code: continuityReport.result === 'CONFLICT' ? 'CHARACTER_CONTINUITY_CONFLICT' : 'CHARACTER_CONTINUITY_INVALID',\n          path: \`continuities.\${id}\`,\n          message,\n          severity: 'ERROR'\n        });\n      }\n      if (continuityReport.result === 'REVIEW_REQUIRED' && continuityReport.issues.length === 0) {\n        issues.push({\n          code: 'CHARACTER_CONTINUITY_REVIEW_REQUIRED',\n          path: \`continuities.\${id}.validationResult\`,\n          message: 'Character Continuity has not completed all checks.',\n          severity: 'WARNING'\n        });\n      }\n    }\n\n`;
  next = insertOnce(next, collectionAnchor, continuityCollectionBlock, 'Character continuity collection validation');
  write('core/universe/model/validation.ts', next);
}

console.log('Character Continuity System berhasil dipasang.');
