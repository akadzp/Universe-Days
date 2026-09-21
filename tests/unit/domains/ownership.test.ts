/**
 * Phase 7: Domain Ownership Unit Tests
 *
 * Verifies that each domain has exactly one authoritative owner,
 * and that registry prevents unowned or owner-mismatched registration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainRegistry,
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  RELATIONSHIP_DOMAIN_ID,
  RELATIONSHIP_OWNER_ID,
  OBJECT_DOMAIN_ID,
  OBJECT_OWNER_ID,
  KNOWLEDGE_DOMAIN_ID,
  KNOWLEDGE_OWNER_ID,
  STATE_DOMAIN_ID,
  STATE_OWNER_ID,
  LOCATION_DOMAIN_ID,
  LOCATION_OWNER_ID,
  registerAllMockDomainAdapters,
  MockCharacterDomainAdapter
} from '../../../core/domains/index.ts';
import { getOwner, DOMAIN_OWNERS } from '../../../core/architecture/ownership.ts';
import { makeDomainID, makeSystemID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 7 - Domain Ownership Unit Tests', () => {
  beforeEach(() => {
    registerAllMockDomainAdapters();
  });

  it('1. Verifies that all 6 core integration domains have exactly one authoritative owner', () => {
    const domains = [
      { domain: CHARACTER_DOMAIN_ID, expectedOwner: CHARACTER_OWNER_ID },
      { domain: RELATIONSHIP_DOMAIN_ID, expectedOwner: RELATIONSHIP_OWNER_ID },
      { domain: OBJECT_DOMAIN_ID, expectedOwner: OBJECT_OWNER_ID },
      { domain: KNOWLEDGE_DOMAIN_ID, expectedOwner: KNOWLEDGE_OWNER_ID },
      { domain: STATE_DOMAIN_ID, expectedOwner: STATE_OWNER_ID },
      { domain: LOCATION_DOMAIN_ID, expectedOwner: LOCATION_OWNER_ID }
    ];

    for (const d of domains) {
      const owner = getOwner(d.domain);
      assert.ok(owner, `Domain ${d.domain} must have registered owner`);
      assert.strictEqual(owner.ownerId, d.expectedOwner);
    }
  });

  it('2. Rejects adapter registration for unknown or unregistered domains', () => {
    const registry = DomainRegistry.getInstance();
    const fakeAdapter = {
      domainId: makeDomainID('UNKNOWN_UNIVERSE_DOMAIN'),
      ownerId: makeSystemID('UNKNOWN_SYSTEM'),
      version: '1.0.0',
      supportedOperations: ['FAKE_OP'],
      query: () => ({} as any),
      requestChange: () => ({} as any),
      applyChange: () => ({} as any),
      validate: () => ({} as any),
      resolveConflict: () => ({} as any),
      getTraces: () => [],
      recordTrace: () => {}
    };

    const res = registry.registerAdapter(fakeAdapter);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.DOMAIN_NOT_FOUND);
  });

  it('3. Rejects adapter registration when adapter owner contradicts authoritative registry', () => {
    const registry = DomainRegistry.getInstance();
    const impersonatingAdapter = {
      domainId: CHARACTER_DOMAIN_ID,
      ownerId: makeSystemID('ROGUE_SYSTEM_NOT_CHARACTER'),
      version: '1.0.0',
      supportedOperations: ['IDENTIFY'],
      query: () => ({} as any),
      requestChange: () => ({} as any),
      applyChange: () => ({} as any),
      validate: () => ({} as any),
      resolveConflict: () => ({} as any),
      getTraces: () => [],
      recordTrace: () => {}
    };

    const res = registry.registerAdapter(impersonatingAdapter);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS);
  });

  it('4. Provides accurate domain status info through DomainRegistry', () => {
    const registry = DomainRegistry.getInstance();
    const status = registry.getDomainStatus(CHARACTER_DOMAIN_ID);

    assert.strictEqual(status.domainId, CHARACTER_DOMAIN_ID);
    assert.strictEqual(status.ownerId, CHARACTER_OWNER_ID);
    assert.strictEqual(status.isRegistered, true);
    assert.strictEqual(status.isOwnerValid, true);
    assert.ok(status.supportedOperations.length > 0);
  });
});
