import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityIdentityValidator,
  ContinuityIdentity
} from '../../../core/universe/continuity/index.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 4 - Continuity Identity Unit Tests', () => {
  it('1. Validates a well-formed continuity identity', () => {
    const valid = ContinuityIdentityValidator.validate({
      continuityId: 'CONT-ENTITY-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    });

    assert.strictEqual(valid.status, ResultStatus.SUCCESS);
    assert.strictEqual(valid.data?.continuityId, 'CONT-ENTITY-001');
    assert.strictEqual(valid.data?.entityRef, 'GENERIC_ENTITY_A');
    assert.strictEqual(valid.data?.domainRef, 'DOMAIN_ALPHA');
    assert.strictEqual(valid.data?.version, 1);
  });

  it('2. Strictly rejects missing or empty identity fields', () => {
    const missingId = ContinuityIdentityValidator.validate({
      continuityId: '',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA'
    });
    assert.strictEqual(missingId.status, ResultStatus.FAILURE);
    assert.strictEqual(missingId.error, EngineErrorCode.INVALID_CONTINUITY_IDENTITY);

    const missingEntity = ContinuityIdentityValidator.validate({
      continuityId: 'CONT-001',
      entityRef: '   ',
      domainRef: 'DOMAIN_ALPHA'
    });
    assert.strictEqual(missingEntity.status, ResultStatus.FAILURE);
    assert.strictEqual(missingEntity.error, EngineErrorCode.INVALID_CONTINUITY_IDENTITY);

    const missingDomain = ContinuityIdentityValidator.validate({
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: ''
    });
    assert.strictEqual(missingDomain.status, ResultStatus.FAILURE);
  });

  it('3. Detects duplicate continuity identity candidates', () => {
    const idA: ContinuityIdentity = {
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    };

    const idB: ContinuityIdentity = {
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    };

    assert.strictEqual(ContinuityIdentityValidator.areEqual(idA, idB), true);
  });

  it('4. Rejects identity mismatch between disparate continuity items', () => {
    const idA: ContinuityIdentity = {
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    };

    const idB: ContinuityIdentity = {
      continuityId: 'CONT-002',
      entityRef: 'GENERIC_ENTITY_B',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    };

    assert.strictEqual(ContinuityIdentityValidator.areEqual(idA, idB), false);
    assert.strictEqual(ContinuityIdentityValidator.sameEntity(idA, idB), false);
  });

  it('5. Distinguishes same-name entities across different domains or explicit identities', () => {
    const idDomain1: ContinuityIdentity = {
      continuityId: 'CONT-ALPHA-01',
      entityRef: 'SHARED_NAME_ITEM',
      domainRef: 'DOMAIN_PHYSICAL',
      version: 1
    };

    const idDomain2: ContinuityIdentity = {
      continuityId: 'CONT-BETA-01',
      entityRef: 'SHARED_NAME_ITEM',
      domainRef: 'DOMAIN_CONCEPTUAL',
      version: 1
    };

    // Even though entityRef name is identical, domains differ -> NOT same entity
    assert.strictEqual(ContinuityIdentityValidator.sameEntity(idDomain1, idDomain2), false);
    assert.strictEqual(ContinuityIdentityValidator.areEqual(idDomain1, idDomain2), false);
  });

  it('6. Preserves version distinctions without conflating revisions with new identities', () => {
    const idV1: ContinuityIdentity = {
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 1
    };

    const idV2: ContinuityIdentity = {
      continuityId: 'CONT-001',
      entityRef: 'GENERIC_ENTITY_A',
      domainRef: 'DOMAIN_ALPHA',
      version: 2
    };

    // Same entity and continuityId, but different version
    assert.strictEqual(ContinuityIdentityValidator.sameEntity(idV1, idV2), true);
    assert.strictEqual(idV1.version !== idV2.version, true);
  });
});
