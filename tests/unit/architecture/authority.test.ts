import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canPerformAction, ArchitectureAction } from '../../../core/architecture/authority.ts';
import { makeSystemID, makeDomainID } from '../../../core/types/identifiers.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Architecture Core - Authority', () => {
  it('1. Authorized owner can APPLY', () => {
    // CHARACTER_SYSTEM is the owner of domain CHARACTER
    const decision = canPerformAction(
      makeSystemID('CHARACTER_SYSTEM'),
      makeDomainID('CHARACTER'),
      ArchitectureAction.APPLY_CHANGE
    );

    assert.strictEqual(decision.status, ResultStatus.SUCCESS);
    assert.ok(decision.data);
    assert.strictEqual(decision.data.allowed, true);
    assert.strictEqual(decision.data.action, ArchitectureAction.APPLY_CHANGE);
  });

  it('2. Non-owner cannot APPLY', () => {
    // DAILY_UNIVERSE_SYSTEM attempts to apply change to CHARACTER domain
    const decision = canPerformAction(
      makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      makeDomainID('CHARACTER'),
      ArchitectureAction.APPLY_CHANGE
    );

    assert.strictEqual(decision.status, ResultStatus.FAILURE);
    assert.strictEqual(decision.message, 'UNAUTHORIZED_MUTATION');
    assert.match(decision.error as string, /NOT the authoritative owner/);
  });

  it('3. Consumer can REQUEST', () => {
    // Any consumer system can issue a change request to a domain owner
    const decision = canPerformAction(
      makeSystemID('CONSUMER_SYSTEM_X'),
      makeDomainID('TEMPORAL'),
      ArchitectureAction.REQUEST_CHANGE
    );

    assert.strictEqual(decision.status, ResultStatus.SUCCESS);
    assert.ok(decision.data);
    assert.strictEqual(decision.data.allowed, true);
    assert.strictEqual(decision.data.action, ArchitectureAction.REQUEST_CHANGE);
  });

  it('4. Authorized consumer can READ', () => {
    const decision = canPerformAction(
      makeSystemID('OBSERVER_SYSTEM_Y'),
      makeDomainID('KNOWLEDGE'),
      ArchitectureAction.READ
    );

    assert.strictEqual(decision.status, ResultStatus.SUCCESS);
    assert.ok(decision.data);
    assert.strictEqual(decision.data.allowed, true);
    assert.strictEqual(decision.data.action, ArchitectureAction.READ);
  });

  it('5. Unauthorized mutation is rejected', () => {
    // External system attempts direct mutation on STATE domain
    const directMutationDecision = canPerformAction(
      makeSystemID('UNAUTHORIZED_ACTOR'),
      makeDomainID('STATE'),
      ArchitectureAction.APPLY_CHANGE
    );

    assert.strictEqual(directMutationDecision.status, ResultStatus.FAILURE);
    assert.strictEqual(directMutationDecision.message, 'UNAUTHORIZED_MUTATION');
  });
});
