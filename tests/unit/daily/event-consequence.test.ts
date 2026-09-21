import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  EventRegistry,
  UniverseEventStatus,
  createUniverseEvent,
  ConsequenceRegistry,
  UniverseConsequenceStatus,
  createUniverseConsequence,
  TimePoint
} from '../../../core/universe/daily/index.ts';

describe('Phase 5 - Event & Consequence Unit Tests', () => {
  describe('Universe Event Model & Readyness (Section 57)', () => {
    it('1. Initializes event as PENDING and does NOT auto-occur', () => {
      const reg = new EventRegistry();
      const ev = createUniverseEvent({
        eventId: 'EV-01',
        temporalReference: '2024-01-01T10:00:00Z',
        prerequisites: [{ type: 'EXPLICIT', description: 'Explicit gatekeeper approval', satisfied: false }]
      });

      reg.register(ev);
      assert.strictEqual(reg.get('EV-01')?.status, UniverseEventStatus.PENDING);
      assert.strictEqual(reg.getOccurred().length, 0);
    });

    it('2. Evaluates preconditions: moves PENDING -> READY only when preconditions are met', () => {
      const reg = new EventRegistry();
      const ev = createUniverseEvent({
        eventId: 'EV-02',
        temporalReference: '2024-01-01T10:00:00Z',
        prerequisites: [
          { type: 'DEPENDENCY', description: 'Dep A satisfied', targetRef: 'DEP_A', satisfied: false }
        ]
      });
      reg.register(ev);

      // Evaluate without satisfied dependency -> remains PENDING
      const eval1 = reg.evaluateReadiness('EV-02', {
        currentUniverseTime: TimePoint.parse('2024-01-01T12:00:00Z').data!,
        satisfiedDependencies: new Set()
      });
      assert.strictEqual(eval1.success, true);
      assert.strictEqual(eval1.data!.status, UniverseEventStatus.PENDING);

      // Evaluate with satisfied dependency -> becomes READY
      const eval2 = reg.evaluateReadiness('EV-02', {
        currentUniverseTime: TimePoint.parse('2024-01-01T12:00:00Z').data!,
        satisfiedDependencies: new Set(['DEP_A'])
      });
      assert.strictEqual(eval2.success, true);
      assert.strictEqual(eval2.data!.status, UniverseEventStatus.READY);
    });

    it('3. Rejects occurrence if preconditions fail; allows occurrence with valid execution', () => {
      const reg = new EventRegistry();
      const ev = createUniverseEvent({
        eventId: 'EV-03',
        temporalReference: '2024-01-01T10:00:00Z',
        prerequisites: [{ type: 'STATE', description: 'Flag must be true', targetRef: 'FLAG_X', satisfied: false }]
      });
      reg.register(ev);

      // Attempt markOccurred without satisfying prerequisites
      const occFail = reg.markOccurred('EV-03', { outcome: 'done' }, false);
      assert.strictEqual(occFail.success, false);
      assert.strictEqual(reg.get('EV-03')?.status, UniverseEventStatus.PENDING);

      // Cancel event explicitly
      const cancelRes = reg.cancel('EV-03', 'No longer relevant');
      assert.strictEqual(cancelRes.success, true);
      assert.strictEqual(reg.get('EV-03')?.status, UniverseEventStatus.CANCELLED);

      // Occurring a cancelled event fails
      const occCancelled = reg.markOccurred('EV-03');
      assert.strictEqual(occCancelled.success, false);
    });
  });

  describe('Universe Consequence Model (Section 58)', () => {
    it('1. Creates consequence linked to source event; rejects free-floating consequences', () => {
      // Valid consequence
      const validRes = createUniverseConsequence({
        consequenceId: 'CNSQ-01',
        sourceEventRef: 'EV-01',
        temporalActivation: '2024-01-01T11:00:00Z'
      });
      assert.strictEqual(validRes.success, true);
      assert.strictEqual(validRes.data!.sourceEventRef, 'EV-01');

      // Free-floating consequence rejected
      const invalidRes = createUniverseConsequence({
        consequenceId: 'CNSQ-02',
        sourceEventRef: '', // empty!
        temporalActivation: '2024-01-01T11:00:00Z'
      });
      assert.strictEqual(invalidRes.success, false);
    });

    it('2. Supports multiple consequences linked to a single source event', () => {
      const reg = new ConsequenceRegistry();

      const c1 = createUniverseConsequence({
        consequenceId: 'C1',
        sourceEventRef: 'EV-PARENT',
        temporalActivation: '2024-01-01T10:00:00Z',
        consequenceType: 'DIRECT'
      }).data!;

      const c2 = createUniverseConsequence({
        consequenceId: 'C2',
        sourceEventRef: 'EV-PARENT',
        temporalActivation: '2024-01-01T12:00:00Z',
        consequenceType: 'DELAYED'
      }).data!;

      reg.register(c1);
      reg.register(c2);

      const consequences = reg.getBySourceEvent('EV-PARENT');
      assert.strictEqual(consequences.length, 2);
      assert.strictEqual(consequences[0].consequenceId, 'C1');
      assert.strictEqual(consequences[1].consequenceId, 'C2');
    });

    it('3. Explicitly triggers and resolves consequences through valid lifecycle', () => {
      const reg = new ConsequenceRegistry();
      const c = createUniverseConsequence({
        consequenceId: 'C-LIFECYCLE',
        sourceEventRef: 'EV-PARENT',
        temporalActivation: '2024-01-01T10:00:00Z'
      }).data!;
      reg.register(c);

      assert.strictEqual(reg.get('C-LIFECYCLE')?.status, UniverseConsequenceStatus.PENDING);

      const trigRes = reg.trigger('C-LIFECYCLE');
      assert.strictEqual(trigRes.success, true);
      assert.strictEqual(reg.get('C-LIFECYCLE')?.status, UniverseConsequenceStatus.TRIGGERED);

      const resolveRes = reg.resolve('C-LIFECYCLE');
      assert.strictEqual(resolveRes.success, true);
      assert.strictEqual(reg.get('C-LIFECYCLE')?.status, UniverseConsequenceStatus.RESOLVED);
    });
  });
});
