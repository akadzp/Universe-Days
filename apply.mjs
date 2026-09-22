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
  if (!s.includes(needle)) throw new Error(`Anchor tidak ditemukan pada ${rel}`);
  write(rel, s.replace(needle, replacement));
}
function backup(rel) {
  const abs = path.join(root, rel);
  fs.copyFileSync(abs, `${abs}.bak`);
}

const files = [
  'core/universe/model/types.ts',
  'core/universe/model/character.ts',
  'core/universe/model/index.ts',
  'core/universe/model/universe.ts',
  'core/universe/model/validation.ts'
];
for (const f of files) backup(f);

fs.copyFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'core/universe/model/behavior.ts'),
  path.join(root, 'core/universe/model/behavior.ts')
);

replaceOnce(
  'core/universe/model/types.ts',
  "  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION'\n",
  "  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION',\n  BEHAVIOR = 'BEHAVIOR'\n"
);

replaceOnce(
  'core/universe/model/index.ts',
  "export * from './character-profile.ts';\n",
  "export * from './character-profile.ts';\nexport * from './behavior.ts';\n"
);

replaceOnce(
  'core/universe/model/character.ts',
  "  readonly profile?: CharacterProfile;\n",
  "  readonly profile?: CharacterProfile;\n  readonly behaviorReferences?: readonly string[];\n"
);

replaceOnce(
  'core/universe/model/universe.ts',
  "import { UnresolvedConditionEntity } from './unresolved.ts';\n",
  "import { UnresolvedConditionEntity } from './unresolved.ts';\nimport { BehaviorEntity } from './behavior.ts';\n"
);
replaceOnce(
  'core/universe/model/universe.ts',
  "  readonly unresolvedConditions: Readonly<Record<string, UnresolvedConditionEntity>>;\n",
  "  readonly unresolvedConditions: Readonly<Record<string, UnresolvedConditionEntity>>;\n  readonly behaviors: Readonly<Record<string, BehaviorEntity>>;\n"
);
replaceOnce(
  'core/universe/model/universe.ts',
  "  unresolvedConditions?: Record<string, UnresolvedConditionEntity>;\n",
  "  unresolvedConditions?: Record<string, UnresolvedConditionEntity>;\n  behaviors?: Record<string, BehaviorEntity>;\n"
);
replaceOnce(
  'core/universe/model/universe.ts',
  "      unresolvedConditions: freezeMap(params.unresolvedConditions),\n",
  "      unresolvedConditions: freezeMap(params.unresolvedConditions),\n      behaviors: freezeMap(params.behaviors),\n"
);

replaceOnce(
  'core/universe/model/validation.ts',
  "import { validateCharacterProfile } from './character-profile.ts';\n",
  "import { validateCharacterProfile } from './character-profile.ts';\nimport { validateBehavior } from './behavior.ts';\n"
);
replaceOnce(
  'core/universe/model/validation.ts',
  "    for (const [id, loc] of Object.entries(universe.locations || {})) {\n",
  "    for (const [id, behavior] of Object.entries(universe.behaviors || {})) {\n      if (behavior.identity.id !== id) {\n        issues.push({\n          code: 'ID_KEY_MISMATCH',\n          path: `behaviors.${id}`,\n          message: `Behavior map key '${id}' does not match entity id '${behavior.identity.id}'`,\n          severity: 'ERROR'\n        });\n      }\n      const behaviorValidation = validateBehavior(behavior);\n      for (const issue of behaviorValidation.issues) {\n        issues.push({\n          code: issue.code,\n          path: `behaviors.${id}.${issue.path}`,\n          message: issue.message,\n          severity: 'ERROR'\n        });\n      }\n      if (!universe.characters[behavior.characterId]) {\n        issues.push({\n          code: 'DANGLING_BEHAVIOR_CHARACTER_REFERENCE',\n          path: `behaviors.${id}.characterId`,\n          message: `Behavior character '${behavior.characterId}' not found in characters`,\n          severity: 'ERROR'\n        });\n      }\n    }\n\n    for (const [id, loc] of Object.entries(universe.locations || {})) {\n"
);
replaceOnce(
  'core/universe/model/validation.ts',
  "      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n",
  "      for (const behaviorRef of char.behaviorReferences ?? []) {\n        if (!universe.behaviors || !universe.behaviors[behaviorRef]) {\n          issues.push({\n            code: 'DANGLING_BEHAVIOR_REFERENCE',\n            path: `characters.${id}.behaviorReferences`,\n            message: `Character behavior reference '${behaviorRef}' not found in behaviors`,\n            severity: 'ERROR'\n          });\n        } else if (universe.behaviors[behaviorRef].characterId !== id) {\n          issues.push({\n            code: 'BEHAVIOR_CHARACTER_MISMATCH',\n            path: `characters.${id}.behaviorReferences.${behaviorRef}`,\n            message: `Behavior '${behaviorRef}' belongs to character '${universe.behaviors[behaviorRef].characterId}', not '${id}'`,\n            severity: 'ERROR'\n          });\n        }\n      }\n\n      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n"
);

write('docs/behavior-system.md', fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs/behavior-system.md'), 'utf8'));
write('README.md', fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'README.md'), 'utf8'));

console.log('Behavior System berhasil dipasang. Backup dibuat sebagai *.bak.');
