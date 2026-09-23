import fs from 'node:fs';
import path from 'node:path';

const files = {
  control: 'app/api/routes/control.ts',
  types: 'app/web/types.ts',
};
const replacements = [
  [
    files.control,
    `          direction: r.direction ?? 'BIDIRECTIONAL',\n          strength: r.strength ?? 1.0,\n          status: r.status ?? 'ACTIVE',\n          dynamic: (r as any).dynamic || (r.relationshipType ? \`Relasi: \${r.relationshipType}\` : 'Belum tercatat'),\n          narrativeBasis: (r as any).narrativeBasis || (r.notes ? r.notes : 'Terbentuk seiring perkembangan cerita.')`,
    `          direction: r.direction,\n          strength: r.strength,\n          status: r.status,\n          dynamic: (r as any).dynamic,\n          narrativeBasis: (r as any).narrativeBasis ?? r.notes`,
  ],
  [
    files.control,
    `        acquisitionSource: k.acquisitionSource || 'Pengalaman Langsung',`,
    `        acquisitionSource: k.acquisitionSource,`,
  ],
  [
    files.types,
    `    direction: string;\n    strength: number;\n    status: string;\n    dynamic: string;\n    narrativeBasis: string;`,
    `    direction?: string;\n    strength?: number;\n    status?: string;\n    dynamic?: string;\n    narrativeBasis?: string;`,
  ],
];

function apply(file, oldText, newText) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) throw new Error(`Missing file: ${file}`);
  const s = fs.readFileSync(p, 'utf8');
  const count = s.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly 1 match, found ${count}`);
  fs.writeFileSync(p, s.replace(oldText, newText));
}

for (const [file, oldText, newText] of replacements) apply(file, oldText, newText);
console.log('Post-integration integrity patch applied.');
