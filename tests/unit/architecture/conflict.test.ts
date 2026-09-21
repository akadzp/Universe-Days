import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  routeConflict,
  ConflictStatus,
  ConflictDraft
} from '../../../core/architecture/conflict.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Architecture Core - Conflict Routing', () => {
  const createSampleDraft = (domain: string): ConflictDraft => ({
    conflictId: 'CONF-TEST-001',
    domain,
    sourceSystem: makeSystemID('SYSTEM_A'),
    conflictingReferences: ['REF_VAL_ALPHA', 'REF_VAL_BETA'],
    severity: 'HIGH',
    description: 'Inconsistent property values detected between concurrent observers',
    traceability: {
      requestId: makeRequestID('REQ-CONF-01'),
      sourceSystem: makeSystemID('SYSTEM_A'),
      timestamp: Date.now(),
      version: '1.0.0'
    }
  });

  it('1. Conflict identifies domain', () => {
    const draft = createSampleDraft('OBJECT');
    const result = routeConflict(draft);

    assert.strictEqual(result.status, ResultStatus.SUCCESS);
    assert.ok(result.data);
    assert.strictEqual(result.data.domain, 'OBJECT');
  });

  it('2. Owner is resolved deterministically', () => {
    const draft = createSampleDraft('OBJECT');
    const result = routeConflict(draft);

    assert.strictEqual(result.status, ResultStatus.SUCCESS);
    assert.ok(result.data);
    // OBJECT owner is OBJECT_SYSTEM
    assert.strictEqual(result.data.targetOwner, 'OBJECT_SYSTEM');
  });

  it('3. Conflict is routed to correct owner', () => {
    const draftLocation = createSampleDraft('LOCATION');
    const resultLocation = routeConflict(draftLocation);
    assert.strictEqual(resultLocation.data?.targetOwner, 'LOCATION_SYSTEM');

    const draftTemporal = createSampleDraft('TEMPORAL');
    const resultTemporal = routeConflict(draftTemporal);
    assert.strictEqual(resultTemporal.data?.targetOwner, 'TEMPORAL_SYSTEM');
  });

  it('4. System does not automatically resolve conflict', () => {
    const draft = createSampleDraft('RELATIONSHIP');
    const result = routeConflict(draft);

    assert.strictEqual(result.status, ResultStatus.SUCCESS);
    assert.ok(result.data);
    // Crucial rule: Status MUST be ROUTED, never automatically RESOLVED
    assert.strictEqual(result.data.status, ConflictStatus.ROUTED);
    assert.notStrictEqual(result.data.status, ConflictStatus.RESOLVED);
  });

  it('5. Unknown domain produces a routing failure', () => {
    const draft = createSampleDraft('MYTHICAL_UNREGISTERED_DOMAIN');
    const result = routeConflict(draft);

    assert.strictEqual(result.status, ResultStatus.FAILURE);
    assert.strictEqual(result.message, 'UNKNOWN_DOMAIN');
    assert.match(result.error as string, /does not have a registered authoritative owner/);
  });
});
