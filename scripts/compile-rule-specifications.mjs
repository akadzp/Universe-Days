import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourcePath = path.join(root, 'rules', 'specification', 'index.json');
const outputPath = path.join(root, 'rules', 'runtime', 'index.json');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(source.specifications)) {
  throw new Error('Specification registry must contain a specifications array.');
}

const compiledRules = source.specifications.map(spec => ({
  ruleId: spec.ruleId,
  id: spec.ruleId,
  version: spec.version,
  owner: spec.owner,
  domain: spec.domain,
  type: spec.type,
  dependencies: spec.dependencies ?? [],
  preconditions: spec.preconditions ?? [],
  conditions: spec.conditions ?? [],
  forbiddenConditions: spec.forbiddenConditions ?? [],
  actions: spec.actions ?? [],
  severity: spec.severity ?? 'MEDIUM',
  enabled: spec.enabled !== false,
  priority: spec.priority ?? 100,
  metadata: {
    ...(spec.metadata ?? {}),
    specificationVersion: spec.version
  },
  description: spec.description
}));

const seen = new Set();
for (const rule of compiledRules) {
  const key = `${rule.ruleId}@${rule.version}`;
  if (seen.has(key)) throw new Error(`Duplicate rule ${key}`);
  seen.add(key);
}

const ids = new Set(compiledRules.map(rule => rule.ruleId));
for (const rule of compiledRules) {
  for (const dependency of rule.dependencies) {
    if (!ids.has(dependency)) throw new Error(`Missing dependency ${dependency} referenced by ${rule.ruleId}`);
  }
}

const runtime = {
  version: source.version,
  registryName: 'pocer-architecture-runtime',
  source: 'rules/specification/index.json',
  generated: true,
  rules: compiledRules
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');
console.log(`Compiled ${compiledRules.length} runtime rules.`);
