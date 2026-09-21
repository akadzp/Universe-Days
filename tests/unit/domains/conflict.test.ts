/**
 * Phase 7: Domain Conflict Unit Tests
 *
 * Verifies that domain conflicts route directly to authoritative domain owners,
 * enforce manual/owner arbitration (no automatic winner picking), and require revalidation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  OBJECT_DOMAIN_ID,
  OBJECT_OWNER_ID,
  registerAllMockDomainAdapters
} from '../../../core/domains/index.ts';
import { makeSystemID, makeDomainID, makeRequestID } from '../../../core/types/identifiers.ts';
import { ConflictStatus, ConflictDraft } from '../../../core/architecture/conflict.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 7 - Domain Conflict Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');
  const rogueSystem = makeSystemID('ROGUE_SYSTEM');

  beforeEach(() => {
    registerAllMockDomainAdapters();
  });

  it('1. Routes a Character domain conflict to CHARACTER_SYSTEM owner without auto-picking winners', () => {
    const draft: ConflictDraft = {
      conflictId: 'CONF_CHAR_01',
      domain: CHARACTER_DOMAIN_ID,
      sourceSystem: dailyUniverse,
      conflictingReferences: ['CHAR_ABSTRACT_01_OBS_A', 'CHAR_ABSTRACT_01_OBS_B'],
      severity: 'HIGH',
      traceability: {
        requestId: makeRequestID('REQ_CONF_01'),
        sourceSystem: dailyUniverse,
        timestamp: Date.now(),
        version: '1.0.0'
      },
      description: 'Divergent character condition observations'
    };

    const routeRes = DomainGateway.routeConflict(draft);
    assert.strictEqual(routeRes.success, true);
    assert.ok(routeRes.data);
    assert.strictEqual(routeRes.data.targetOwner, CHARACTER_OWNER_ID);
    assert.strictEqual(routeRes.data.status, ConflictStatus.ROUTED);
  });

  it('2. Authoritative owner resolves conflict and sets status to revalidation required', () => {
    const resolutionReq = {
      conflictId: 'CONF_CHAR_01',
      domain: CHARACTER_DOMAIN_ID,
      resolverActor: CHARACTER_OWNER_ID,
      resolutionDecision: 'ACCEPT_FIRST' as const,
      rationale: 'First observer had direct proximity'
    };

    const res = DomainGateway.resolveConflict(CHARACTER_OWNER_ID, CHARACTER_DOMAIN_ID, resolutionReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.status, 'RESOLVED');
    assert.strictEqual(res.data.revalidationRequired, true);
  });

  it('3. Rejects conflict resolution attempts by non-owner actors', () => {
    const resolutionReq = {
      conflictId: 'CONF_CHAR_02',
      domain: CHARACTER_DOMAIN_ID,
      resolverActor: rogueSystem,
      resolutionDecision: 'ACCEPT_SECOND' as const,
      rationale: 'Rogue arbitration'
    };

    const res = DomainGateway.resolveConflict(rogueSystem, CHARACTER_DOMAIN_ID, resolutionReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS);
  });
});
