import { strict as assert } from 'node:assert';
import fs from 'node:fs';

const server = fs.readFileSync('server.ts', 'utf8');
const objectTs = fs.readFileSync('core/OBJECT/object.ts', 'utf8');

assert(!server.includes('updatedUniverse.characters[fullId] = newChar'));
assert(server.includes('CharacterCommandService.createCharacter('));
assert(!objectTs.includes('input.effectiveTime ?? new Date().toISOString()'));

console.log('Canonical mutation boundary contract: PASS');
