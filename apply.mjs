#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.REPO_ROOT ? path.resolve(process.env.REPO_ROOT) : process.cwd();
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const write = (file, content) => {
  const target = path.join(repoRoot, file);
  const backup = `${target}.bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
  fs.writeFileSync(target, content, 'utf8');
};

function replaceRequired(content, pattern, replacement, label) {
  const next = content.replace(pattern, replacement);
  if (next === content) throw new Error(`Anchor tidak ditemukan untuk ${label}`);
  return next;
}

function replaceOnceIdempotent(content, existingPattern, alreadyAppliedPattern, replacement, label) {
  if (alreadyAppliedPattern.test(content)) return content;
  return replaceRequired(content, existingPattern, replacement, label);
}

function insertOnce(content, needle, insertion, label) {
  if (content.includes(insertion.trim())) return content;
  const index = content.indexOf(needle);
  if (index < 0) throw new Error(`Anchor tidak ditemukan untuk ${label}`);
  return content.slice(0, index) + insertion + content.slice(index);
}

let types = read('core/universe/model/types.ts');
types = replaceOnceIdempotent(
  types,
  /  STYLE = 'STYLE',?\n}/,
  /  CONTINUITY = 'CONTINUITY'/,
  "  STYLE = 'STYLE',\n  CONTINUITY = 'CONTINUITY'\n}",
  'EntityType.CONTINUITY'
);
write('core/universe/model/types.ts', types);

const characterPath = 'core/universe/model/character.ts';
const character = read(characterPath);
// Existing continuityReference is kept generic for backward compatibility.
write(characterPath, character);

let universe = read('core/universe/model/universe.ts');
universe = insertOnce(
  universe,
  "import { CharacterStyleEntity } from './character-style.ts';\n",
  "import { CharacterContinuityEntity } from './continuity.ts';\n",
  'Universe Continuity import'
);
universe = replaceOnceIdempotent(
  universe,
  /  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;\n/,
  /  readonly continuityRecords: Readonly<Record<string, CharacterContinuityEntity>>;/,
  "  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;\n  readonly continuityRecords: Readonly<Record<string, CharacterContinuityEntity>>;\n",
  'Universe continuityRecords field'
);
universe = replaceOnceIdempotent(
  universe,
  /  styles\?: Record<string, CharacterStyleEntity>;\n/,
  /  continuityRecords\?: Record<string, CharacterContinuityEntity>;/,
  "  styles?: Record<string, CharacterStyleEntity>;\n  continuityRecords?: Record<string, CharacterContinuityEntity>;\n",
  'Universe continuityRecords params'
);
if (!universe.includes('continuityRecords: freezeMap(params.continuityRecords)')) {
  universe = replaceRequired(
    universe,
    /([ \t]+)styles: freezeMap\(params\.styles\),/,
    "$1styles: freezeMap(params.styles),\n$1continuityRecords: freezeMap(params.continuityRecords),",
    'Universe continuityRecords factory'
  );
}
write('core/universe/model/universe.ts', universe);

let index = read('core/universe/model/index.ts');
index = insertOnce(
  index,
  "export * from './character-style.ts';\n",
  "export * from './continuity.ts';\n",
  'Continuity export'
);
write('core/universe/model/index.ts', index);

let validation = read('core/universe/model/validation.ts');
validation = insertOnce(
  validation,
  "import { CharacterStyleEntity, validateCharacterStyle } from './character-style.ts';\n",
  "import { CharacterContinuityEntity, validateCharacterContinuityRecord } from './continuity.ts';\n",
  'Continuity validator import'
);
const continuityBlock = /    for \(const \[id, continuity\] of Object\.entries\(universe\.continuityRecords \|\| \{\}\)\) \{/;
if (!continuityBlock.test(validation)) {
  validation = replaceRequired(
    validation,
    /    for \(const \[id, style\] of Object\.entries\(universe\.styles \|\| \{\}\)\) \{/,
    "    for (const [id, continuity] of Object.entries(universe.continuityRecords || {})) {\n      if (continuity.identity.id !== id) {\n        issues.push({\n          code: 'ID_KEY_MISMATCH',\n          path: `continuityRecords.${id}`,\n          message: `Continuity map key '${id}' does not match entity id '${continuity.identity.id}'`,\n          severity: 'ERROR'\n        });\n      }\n      const continuityErrors = validateCharacterContinuityRecord(continuity as CharacterContinuityEntity);\n      for (const message of continuityErrors) {\n        issues.push({\n          code: 'INVALID_CHARACTER_CONTINUITY',\n          path: `continuityRecords.${id}`,\n          message,\n          severity: 'ERROR'\n        });\n      }\n      if (!universe.characters[continuity.characterId]) {\n        issues.push({\n          code: 'DANGLING_CONTINUITY_CHARACTER_REFERENCE',\n          path: `continuityRecords.${id}.characterId`,\n          message: `Continuity character '${continuity.characterId}' not found in characters`,\n          severity: 'ERROR'\n        });\n      }\n    }\n\n    for (const [id, style] of Object.entries(universe.styles || {})) {",
    'Continuity validator block'
  );
}
write('core/universe/model/validation.ts', validation);

console.log('Character Continuity System applied successfully.');
