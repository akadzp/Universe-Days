import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readCore = (relative: string) => fs.readFileSync(path.join(root, 'core', relative), 'utf8');

const orchestrator = readCore('RUNTIME/ENGINE/orchestrator.ts');
const transaction = readCore('RUNTIME/ENGINE/transaction.ts');
const universe = readCore('UNIVERSE/CANON/universe.ts');
const reconciliation = readCore('UNIVERSE/DAILY-CYCLE/canonical-reconciliation.ts');
const progression = readCore('UNIVERSE/DAILY-CYCLE/progression.ts');
const instance = readCore('INFRA/INSTANCE/instance.ts');

// ENGINE_SYSTEM may orchestrate, but may never bypass domain APPLY_CHANGE authority.
assert(!orchestrator.includes("command.requestedBy === 'ENGINE_SYSTEM'"));
assert(orchestrator.includes('ArchitectureAction.APPLY_CHANGE'));

// Transactions require explicit temporal truth and never invent a default date.
assert(!transaction.includes('2024-01-01'));
assert(transaction.includes('Transaction requires an explicit, valid Universe Time.'));
assert(transaction.includes('ctx.actor !== owner.ownerId'));
assert(transaction.includes('INSTANCE_MANAGEMENT_ACTOR'));

// Universe evolution is immutable and preserves fields not being mutated.
assert(universe.includes('export class UniverseModelFactory'));
assert(universe.includes('static evolve('));
assert(universe.includes('behaviors: freezeMap(params.behaviors ?? base.behaviors)'));
assert(universe.includes('styles: freezeMap(params.styles ?? base.styles)'));
assert(universe.includes('periods: freezeMap(params.periods ?? (base.periods ?? {}))'));
assert(universe.includes('domainBindings: Object.freeze([...base.domainBindings])'));

// Daily -> Canon reconciliation must route through explicit domain authorities.
assert(reconciliation.includes('CanonicalEventAuthority.transition'));
assert(reconciliation.includes('reconcileProcess'));
assert(reconciliation.includes('reconcileUnresolved'));
assert(reconciliation.includes('Creation requires an explicit canonical-owner command'));

// Progression cannot directly assign Canon-style lifecycle statuses.
assert(!progression.includes('ev.status = UniverseEventStatus.OCCURRED'));
assert(!progression.includes('proc.currentStatus = UniverseProcessStatus.INTERRUPTED'));
assert(!progression.includes('unres.lifecycleStatus ='));

// Persistence is owned by Instance Management, not by arbitrary command actors.
assert(instance.includes('INSTANCE_MANAGEMENT_ACTOR'));
assert(instance.includes('assertPersistenceAuthority'));

console.log('Canonical mutation boundary contract: PASS');
