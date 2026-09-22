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
  'core/universe/model/character.ts',
  'core/universe/model/index.ts',
  'core/universe/model/validation.ts',
  'core/universe/model/knowledge.ts',
  'core/universe/model/seed.ts'
];
for (const f of files) if (fs.existsSync(path.join(root, f))) backup(f);

fs.copyFileSync(
  path.join(packageDir, 'core/universe/model/knowledge.ts'),
  path.join(root, 'core/universe/model/knowledge.ts')
);

replaceOnce(
  'core/universe/model/index.ts',
  "export * from './character-profile.ts';\n",
  "export * from './character-profile.ts';\nexport * from './knowledge.ts';\n"
);

replaceOnce(
  'core/universe/model/seed.ts',
  "import { TemporalStatus } from '../../types/temporal.ts';\n",
  "import { TemporalStatus } from '../../types/temporal.ts';\nimport { ActorDataSource } from './actor.ts';\n"
);

replaceOnce(
  'core/universe/model/seed.ts',
  "    acquisitionSource: 'OBSERVATION',\n    certainty: 'FACT',\n",
  "    acquisitionSource: 'OBSERVATION',\n    knowledgeStatus: 'ACTIVE',\n    certainty: 'FACT',\n    changes: [],\n    source: ActorDataSource.USER_DEFINED,\n"
);

replaceOnce(
  'core/universe/model/validation.ts',
  "import { validateCharacterProfile } from './character-profile.ts';\n",
  "import { validateCharacterProfile } from './character-profile.ts';\nimport { validateKnowledge } from './knowledge.ts';\n"
);

replaceOnce(
  'core/universe/model/validation.ts',
  "      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n",
  "      for (const knowledgeRef of char.knowledgeReferences ?? []) {\n        if (!universe.knowledge || !universe.knowledge[knowledgeRef]) {\n          issues.push({\n            code: 'DANGLING_KNOWLEDGE_REFERENCE',\n            path: `characters.${id}.knowledgeReferences`,\n            message: `Character knowledge reference '${knowledgeRef}' not found in knowledge`,\n            severity: 'ERROR'\n          });\n        } else if (universe.knowledge[knowledgeRef].knowerRef !== id) {\n          issues.push({\n            code: 'KNOWLEDGE_KNOWER_MISMATCH',\n            path: `characters.${id}.knowledgeReferences.${knowledgeRef}`,\n            message: `Knowledge '${knowledgeRef}' belongs to '${universe.knowledge[knowledgeRef].knowerRef}', not '${id}'`,\n            severity: 'ERROR'\n          });\n        }\n      }\n\n      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n"
);

replaceOnce(
  'core/universe/model/validation.ts',
  "    for (const [id, loc] of Object.entries(universe.locations || {})) {\n",
  "    for (const [id, knowledge] of Object.entries(universe.knowledge || {})) {\n      if (knowledge.knowledgeId !== id) {\n        issues.push({\n          code: 'ID_KEY_MISMATCH',\n          path: `knowledge.${id}`,\n          message: `Knowledge map key '${id}' does not match knowledgeId '${knowledge.knowledgeId}'`,\n          severity: 'ERROR'\n        });\n      }\n      const knowledgeValidation = validateKnowledge(knowledge);\n      for (const issue of knowledgeValidation.issues) {\n        issues.push({\n          code: issue.code,\n          path: `knowledge.${id}.${issue.path}`,\n          message: issue.message,\n          severity: 'ERROR'\n        });\n      }\n      if (!universe.characters[knowledge.knowerRef]) {\n        issues.push({\n          code: 'DANGLING_KNOWLEDGE_KNOWER_REFERENCE',\n          path: `knowledge.${id}.knowerRef`,\n          message: `Knowledge knower '${knowledge.knowerRef}' not found in characters`,\n          severity: 'ERROR'\n        });\n      }\n    }\n\n    for (const [id, loc] of Object.entries(universe.locations || {})) {\n"
);

console.log('Knowledge System berhasil dipasang. Backup dibuat sebagai *.bak bila file sebelumnya tersedia.');
