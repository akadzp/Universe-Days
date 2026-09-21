import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BitmaskRegistry } from '../../../core/engine/state/bitmask.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 2 - Bitmask Support & Safety', () => {
  let registry: BitmaskRegistry;

  beforeEach(() => {
    registry = new BitmaskRegistry();
    registry.declareBit('READ', 0);
    registry.declareBit('WRITE', 1);
    registry.declareBit('EXECUTE', 2);
    registry.declareBit('ADMIN', 3);
  });

  it('1. Declares bits and prevents collisions', () => {
    // Duplicate name
    const dupName = registry.declareBit('READ', 5);
    assert.strictEqual(dupName.status, ResultStatus.FAILURE);
    assert.strictEqual(dupName.error, EngineErrorCode.COLLISION_BIT);

    // Duplicate bit position
    const dupPos = registry.declareBit('DELETE', 0);
    assert.strictEqual(dupPos.status, ResultStatus.FAILURE);
    assert.strictEqual(dupPos.error, EngineErrorCode.COLLISION_BIT);
  });

  it('2. Sets, clears, and checks bit flags', () => {
    let mask = 0;

    const setRes = registry.setBit(mask, 'WRITE');
    assert.strictEqual(setRes.status, ResultStatus.SUCCESS);
    mask = setRes.data!;
    assert.strictEqual(mask, 2); // 1 << 1

    const hasWrite = registry.hasBit(mask, 'WRITE');
    assert.strictEqual(hasWrite.data, true);

    const hasRead = registry.hasBit(mask, 'READ');
    assert.strictEqual(hasRead.data, false);

    const clearRes = registry.clearBit(mask, 'WRITE');
    assert.strictEqual(clearRes.status, ResultStatus.SUCCESS);
    mask = clearRes.data!;
    assert.strictEqual(mask, 0);
  });

  it('3. Combines multiple flags into a composite bitmask', () => {
    const combined = registry.combineFlags(['READ', 'WRITE', 'EXECUTE']);
    assert.strictEqual(combined.status, ResultStatus.SUCCESS);
    assert.strictEqual(combined.data, 1 | 2 | 4); // 7

    assert.strictEqual(registry.hasBit(combined.data!, 'READ').data, true);
    assert.strictEqual(registry.hasBit(combined.data!, 'WRITE').data, true);
    assert.strictEqual(registry.hasBit(combined.data!, 'EXECUTE').data, true);
    assert.strictEqual(registry.hasBit(combined.data!, 'ADMIN').data, false);
  });

  it('4. Removes flags cleanly from bitmask', () => {
    const combined = registry.combineFlags(['READ', 'WRITE', 'EXECUTE']).data!;
    const removed = registry.removeFlags(combined, ['WRITE']).data!;

    assert.strictEqual(registry.hasBit(removed, 'READ').data, true);
    assert.strictEqual(registry.hasBit(removed, 'WRITE').data, false);
    assert.strictEqual(registry.hasBit(removed, 'EXECUTE').data, true);
  });

  it('5. Detects unknown bits and rejects undeclared flags', () => {
    const unknownRes = registry.setBit(0, 'SUPERUSER');
    assert.strictEqual(unknownRes.status, ResultStatus.FAILURE);
    assert.strictEqual(unknownRes.error, EngineErrorCode.UNKNOWN_BIT);

    // Valid mask: 0b1111 (15)
    assert.strictEqual(registry.validateMask(15).status, ResultStatus.SUCCESS);

    // Undeclared bit at position 5 (0b100000 = 32)
    const invalidMaskRes = registry.validateMask(32);
    assert.strictEqual(invalidMaskRes.status, ResultStatus.FAILURE);
    assert.strictEqual(invalidMaskRes.error, EngineErrorCode.UNKNOWN_BIT);
  });
});
