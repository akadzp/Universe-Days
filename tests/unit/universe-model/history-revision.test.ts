/**
 * Phase 8: History and Revision Unit Tests
 *
 * Verifies append-only revision tracking, separation of Universe Effective Time
 * vs Engine Recorded Time, and immutable history preservation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RevisionHistoryManager, ModelValidationStatus } from '../../../core/universe/model/index.ts';
import { makeSystemID } from '../../../core/types/identifiers.ts';

describe('Phase 8: History and Revision Model', () => {
  const sysOwner = makeSystemID('CHARACTER_SYS_OWNER');

  it('1. Creates initial revision history with REV_0001', () => {
    const history = RevisionHistoryManager.createInitial(sysOwner, '2024-01-01T00:00:00Z', 'Genesis creation');

    assert.strictEqual(history.currentRevisionId, 'REV_0001');
    assert.strictEqual(history.revisions.length, 1);
    assert.strictEqual(history.revisions[0].previousRevisionId, null);
    assert.strictEqual(history.revisions[0].effectiveTime, '2024-01-01T00:00:00Z');
    assert.ok(history.revisions[0].recordedTime > 0);
  });

  it('2. Appends sequential revisions without modifying prior records', () => {
    const initial = RevisionHistoryManager.createInitial(sysOwner, '2024-01-01T00:00:00Z');
    const updated = RevisionHistoryManager.appendRevision(
      initial,
      sysOwner,
      '2024-01-02T12:00:00Z',
      ['conditionStatus', 'locationRef'],
      'Character travelled to new location'
    );

    assert.strictEqual(updated.currentRevisionId, 'REV_0002');
    assert.strictEqual(updated.revisions.length, 2);
    assert.strictEqual(updated.revisions[1].previousRevisionId, 'REV_0001');
    assert.strictEqual(updated.revisions[1].effectiveTime, '2024-01-02T12:00:00Z');
    assert.deepStrictEqual([...updated.revisions[1].changedFields], ['conditionStatus', 'locationRef']);

    // Previous revision untouched
    assert.strictEqual(updated.revisions[0].revisionId, 'REV_0001');
    assert.strictEqual(initial.revisions.length, 1);
  });
});
