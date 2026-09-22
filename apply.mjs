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
  fs.copyFileSync(src, dst);
}

const files = [
  'core/universe/model/types.ts',
  'core/universe/model/character.ts',
  'core/universe/model/index.ts',
  'core/universe/model/universe.ts',
  'core/universe/model/validation.ts'
];
for (const f of files) backup(f);

copyPackage('core/universe/model/character-style.ts');

let types = read('core/universe/model/types.ts');
if (!types.includes("STYLE = 'STYLE'")) {
  if (types.includes("  BEHAVIOR = 'BEHAVIOR'")) {
    replaceOnce('core/universe/model/types.ts', "  BEHAVIOR = 'BEHAVIOR'\n", "  BEHAVIOR = 'BEHAVIOR',\n  STYLE = 'STYLE'\n");
  } else {
    replaceOnce('core/universe/model/types.ts', "  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION'\n", "  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION',\n  STYLE = 'STYLE'\n");
  }
}

if (!read('core/universe/model/character.ts').includes('styleReferences')) {
  replaceOnce(
    'core/universe/model/character.ts',
    '  readonly behaviorReferences?: readonly string[];\n',
    '  readonly behaviorReferences?: readonly string[];\n  readonly styleReferences?: readonly string[];\n'
  );
}

if (!read('core/universe/model/index.ts').includes("./character-style.ts")) {
  replaceOnce(
    'core/universe/model/index.ts',
    "export * from './character-state.ts';\n",
    "export * from './character-state.ts';\nexport * from './character-style.ts';\n"
  );
}

let universe = read('core/universe/model/universe.ts');
if (!universe.includes("import { CharacterStyleEntity } from './character-style.ts';")) {
  replaceOnce(
    'core/universe/model/universe.ts',
    "import { UnresolvedConditionEntity } from './unresolved.ts';\n",
    "import { UnresolvedConditionEntity } from './unresolved.ts';\nimport { CharacterStyleEntity } from './character-style.ts';\n"
  );
}
universe = read('core/universe/model/universe.ts');
if (!universe.includes('readonly styles: Readonly<Record<string, CharacterStyleEntity>>;')) {
  replaceOnce(
    'core/universe/model/universe.ts',
    '  readonly unresolvedConditions: Readonly<Record<string, UnresolvedConditionEntity>>;\n',
    '  readonly unresolvedConditions: Readonly<Record<string, UnresolvedConditionEntity>>;\n  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;\n'
  );
}
universe = read('core/universe/model/universe.ts');
if (!universe.includes('  styles?: Record<string, CharacterStyleEntity>;')) {
  replaceOnce(
    'core/universe/model/universe.ts',
    '  unresolvedConditions?: Record<string, UnresolvedConditionEntity>;\n',
    '  unresolvedConditions?: Record<string, UnresolvedConditionEntity>;\n  styles?: Record<string, CharacterStyleEntity>;\n'
  );
}
universe = read('core/universe/model/universe.ts');
if (!universe.includes('      styles: freezeMap(params.styles),')) {
  replaceOnce(
    'core/universe/model/universe.ts',
    '      unresolvedConditions: freezeMap(params.unresolvedConditions),\n',
    '      unresolvedConditions: freezeMap(params.unresolvedConditions),\n      styles: freezeMap(params.styles),\n'
  );
}

if (!read('core/universe/model/validation.ts').includes("from './character-style.ts'")) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "import { CharacterStateEntity, validateCharacterState } from './character-state.ts';\n",
    "import { CharacterStateEntity, validateCharacterState } from './character-state.ts';\nimport { CharacterStyleEntity, validateCharacterStyle } from './character-style.ts';\n"
  );
}
let validation = read('core/universe/model/validation.ts');
if (!validation.includes('DANGLING_STYLE_REFERENCE')) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {\n",
`      for (const styleRef of char.styleReferences ?? []) {
        if (!universe.styles || !universe.styles[styleRef]) {
          issues.push({
            code: 'DANGLING_STYLE_REFERENCE',
            path: \`characters.\${id}.styleReferences\`,
            message: \`Character style reference '\${styleRef}' not found in styles\`,
            severity: 'ERROR'
          });
        } else if (universe.styles[styleRef].characterId !== id) {
          issues.push({
            code: 'STYLE_CHARACTER_MISMATCH',
            path: \`characters.\${id}.styleReferences.\${styleRef}\`,
            message: \`Style '\${styleRef}' belongs to character '\${universe.styles[styleRef].characterId}', not '\${id}'\`,
            severity: 'ERROR'
          });
        }
      }

      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {
`
  );
}
validation = read('core/universe/model/validation.ts');
if (!validation.includes('DANGLING_STYLE_CHARACTER_REFERENCE')) {
  replaceOnce(
    'core/universe/model/validation.ts',
    "    for (const [id, loc] of Object.entries(universe.locations || {})) {\n",
`    for (const [id, style] of Object.entries(universe.styles || {})) {
      if (style.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: \`styles.\${id}\`,
          message: \`Style map key '\${id}' does not match entity id '\${style.identity.id}'\`,
          severity: 'ERROR'
        });
      }
      const styleValidation = validateCharacterStyle(style as CharacterStyleEntity);
      for (const issue of styleValidation.issues) {
        issues.push({
          code: issue.code,
          path: \`styles.\${id}.\${issue.path}\`,
          message: issue.message,
          severity: 'ERROR'
        });
      }
      if (!universe.characters[style.characterId]) {
        issues.push({
          code: 'DANGLING_STYLE_CHARACTER_REFERENCE',
          path: \`styles.\${id}.characterId\`,
          message: \`Style character '\${style.characterId}' not found in characters\`,
          severity: 'ERROR'
        });
      }
    }

    for (const [id, loc] of Object.entries(universe.locations || {})) {
`
  );
}

console.log('Style System berhasil dipasang. Backup dibuat sebagai *.bak.');
