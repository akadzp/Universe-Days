/**
 * Unit & Invariant Tests: Authoritative Daily Universe Continuation
 *
 * Verifies that Daily Universe periods continue authoritatively from predecessor state
 * discovered in UniverseModel, preventing unilateral caller assertions, sequence skips,
 * fake predecessors, dangling references, and state loss across restarts.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { createGenericSeedUniverse } from '../../../core/universe/model/seed.ts';
import { UniverseModel, UniverseModelFactory } from '../../../core/universe/model/universe.ts';
import { UniverseModelValidator } from '../../../core/universe/model/validation.ts';
import { DailyUniverseContinuation } from '../../../core/universe/daily/continuation.ts';
import { PeriodInitializer } from '../../../core/universe/daily/initialization.ts';
import { DailyUniverseStatus, createUniversePeriod } from '../../../core/universe/daily/period.ts';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';
import { makeDomainID, makeEntityID, makeSystemID } from '../../../core/types/identifiers.ts';
import { FileUniverseSnapshotStore } from '../../../core/platform/persistence/universe.ts';
import { UnresolvedStatus } from '../../../core/universe/daily/unresolved.ts';
import { UniverseProcessStatus } from '../../../core/universe/daily/process.ts';

describe('Authoritative Daily Universe Continuation', () => {
  const TEST_DIR = path.resolve('.test_continuation_persistence');

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('1. Authoritative Predecessor Discovery', () => {
    it('discovers GENUINELY_NEW on a fresh universe with no prior periods', () => {
      const universe = createGenericSeedUniverse();
      // Clear any periodRef
      const freshUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T00:00:00Z',
          currentPeriodRef: undefined,
          previousPeriodRef: undefined,
          periodSequence: undefined
        },
        periods: {}
      };

      const discovery = DailyUniverseContinuation.discoverPredecessor(freshUniverse);
      assert.strictEqual(discovery.status, 'GENUINELY_NEW');
      assert.strictEqual(discovery.isFirstPeriod, true);
      assert.strictEqual(discovery.expectedSequenceNumber, 1);
      assert.strictEqual(discovery.predecessorPeriodRef, undefined);

      const initRes = PeriodInitializer.initialize({
        universe: freshUniverse,
        universeScope: 'UNIVERSE_DEFAULT'
      });
      assert.strictEqual(initRes.success, true);
      assert.ok(initRes.data);
      assert.strictEqual(initRes.data.initializationMode, 'FIRST_PERIOD');
      assert.strictEqual(initRes.data.period.isFirstPeriod, true);
      assert.strictEqual(initRes.data.period.previousPeriodRef, undefined);
    });

    it('discovers HAS_PREDECESSOR and derives next sequence when currentPeriodRef is present', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1,
          periodLifecycleState: DailyUniverseStatus.FINALIZED
        },
        periods: {
          [predPeriodId]: {
            periodId: predPeriodId,
            universeScope: 'UNIVERSE_DEFAULT',
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-01T23:59:59Z',
            sequenceNumber: 1,
            status: DailyUniverseStatus.FINALIZED,
            isFirstPeriod: true
          }
        }
      };

      const discovery = DailyUniverseContinuation.discoverPredecessor(populatedUniverse);
      assert.strictEqual(discovery.status, 'HAS_PREDECESSOR');
      assert.strictEqual(discovery.isFirstPeriod, false);
      assert.strictEqual(discovery.predecessorPeriodRef, predPeriodId);
      assert.strictEqual(discovery.expectedSequenceNumber, 2);

      // Caller does not pass previousPeriodRef; system authoritatively resolves it
      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, true);
      assert.ok(initRes.data);
      assert.strictEqual(initRes.data.initializationMode, 'NORMAL_CONTINUATION');
      assert.strictEqual(initRes.data.period.isFirstPeriod, false);
      assert.strictEqual(initRes.data.period.previousPeriodRef, predPeriodId);
    });
  });

  describe('2. Rejection of Unilateral Claims and Invariant Violations', () => {
    it('rejects caller attempting to force isFirstPeriod=true on universe with history', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        isFirstPeriod: true,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.INVALID_PERIOD_LIFECYCLE);
      assert.match(initRes.message!, /Cannot force isFirstPeriod=true/);
    });

    it('rejects invalid or fake previousPeriodRef that does not match authoritative history', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        previousPeriodRef: 'PERIOD_UNIVERSE_DEFAULT_20230101T000000Z_S9999_FAKE',
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.PERIOD_INITIALIZATION_FAILED);
      assert.match(initRes.message!, /was not found in authoritative Universe history/);
    });

    it('rejects previousPeriodRef when universe is genuinely new', () => {
      const universe = createGenericSeedUniverse();
      const freshUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T00:00:00Z',
          currentPeriodRef: undefined
        },
        periods: {}
      };

      const initRes = PeriodInitializer.initialize({
        universe: freshUniverse,
        previousPeriodRef: 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001',
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.INVALID_PERIOD_LIFECYCLE);
      assert.match(initRes.message!, /has no prior period history/);
    });

    it('rejects sequence skipping or wrong sequence numbers', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        }
      };

      // Expected is 2, caller passes 5
      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        sequenceNumber: 5,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.PERIOD_INITIALIZATION_FAILED);
      assert.match(initRes.message!, /Invalid sequence: successor sequence '5' does not match expected sequence '2'/);
    });

    it('rejects wrong universe scope in previousPeriodRef', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_OTHER_SCOPE_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        },
        periods: {
          [predPeriodId]: {
            periodId: predPeriodId,
            universeScope: 'OTHER_SCOPE',
            startTime: '2024-01-01T00:00:00Z',
            sequenceNumber: 1,
            status: DailyUniverseStatus.FINALIZED,
            isFirstPeriod: true
          }
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        universeScope: 'UNIVERSE_DEFAULT',
        previousPeriodRef: predPeriodId,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.PERIOD_INITIALIZATION_FAILED);
      assert.match(initRes.message!, /Wrong Universe scope/);
    });

    it('rejects temporal regression (next period startTime < predecessor startTime)', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240102T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-02',
          currentUniverseTime: '2024-01-02T12:00:00Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        },
        periods: {
          [predPeriodId]: {
            periodId: predPeriodId,
            universeScope: 'UNIVERSE_DEFAULT',
            startTime: '2024-01-02T00:00:00Z',
            sequenceNumber: 1,
            status: DailyUniverseStatus.FINALIZED,
            isFirstPeriod: true
          }
        }
      };

      // Propose start time in 2024-01-01 (before predecessor 2024-01-02)
      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-01T10:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.TEMPORAL_CONSTRAINT_VIOLATION);
      assert.match(initRes.message!, /Invalid temporal progression/);
    });

    it('blocks continuation if predecessor is in BLOCKED status', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const blockedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1,
          periodLifecycleState: DailyUniverseStatus.BLOCKED
        },
        periods: {
          [predPeriodId]: {
            periodId: predPeriodId,
            universeScope: 'UNIVERSE_DEFAULT',
            startTime: '2024-01-01T00:00:00Z',
            sequenceNumber: 1,
            status: DailyUniverseStatus.BLOCKED,
            isFirstPeriod: true
          }
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: blockedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.PERIOD_BLOCKED);
      assert.match(initRes.message!, /is in BLOCKED state/);
    });
  });

  describe('3. Authoritative Carryover Invariants', () => {
    it('inherits active unresolved conditions from UniverseModel into period context', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const unresId = 'UNRES_COND_MYSTERY_KEY';
      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        },
        unresolvedConditions: {
          [unresId]: {
            conditionId: unresId,
            conditionType: 'NARRATIVE_MYSTERY',
            description: 'The ancient bronze door remains locked',
            ownerDomain: makeDomainID('OBJECT'),
            targetEntityRef: 'OBJ_ANCIENT_KEY',
            temporalScope: {
              effectiveFrom: '2024-01-01T12:00:00Z',
              temporalCategory: 'ACTUAL' as any
            },
            dependencyRefs: [],
            currentStatus: 'CARRYOVER',
            createdAt: '2024-01-01T12:00:00Z',
            lastUpdated: '2024-01-01T12:00:00Z',
            sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
            validationStatus: 'VALID' as any,
            provenance: universe.provenance
          }
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, true);
      assert.ok(initRes.data);
      assert.strictEqual(initRes.data.unresolvedConditions.length, 1);
      assert.strictEqual(initRes.data.unresolvedConditions[0].unresolvedId, unresId);
      assert.strictEqual(initRes.data.unresolvedConditions[0].reason, 'The ancient bronze door remains locked');
    });

    it('inherits active processes and excludes completed or terminated ones', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const activeProcId = 'PROC_BUILD_TOWER';
      const completedProcId = 'PROC_DIG_WELL';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        },
        processes: {
          [activeProcId]: {
            processId: activeProcId,
            processType: 'CONSTRUCTION',
            title: 'Building watchtower',
            participantRefs: [],
            objectRefs: [],
            locationRef: 'LOC_GENERIC_A',
            startTime: '2024-01-01T08:00:00Z',
            currentStatus: 'ACTIVE',
            progressRatio: 0.5,
            dependencies: [],
            unresolvedConditionRefs: [],
            temporalValidity: {
              effectiveFrom: '2024-01-01T08:00:00Z',
              temporalCategory: 'ACTUAL' as any
            },
            sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
            validationStatus: 'VALID' as any,
            history: universe.revisionHistory,
            provenance: universe.provenance
          },
          [completedProcId]: {
            processId: completedProcId,
            processType: 'EXCAVATION',
            title: 'Digging well',
            participantRefs: [],
            objectRefs: [],
            startTime: '2024-01-01T08:00:00Z',
            currentStatus: 'COMPLETED',
            progressRatio: 1.0,
            dependencies: [],
            unresolvedConditionRefs: [],
            temporalValidity: {
              effectiveFrom: '2024-01-01T08:00:00Z',
              temporalCategory: 'ACTUAL' as any
            },
            sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
            validationStatus: 'VALID' as any,
            history: universe.revisionHistory,
            provenance: universe.provenance
          }
        }
      };

      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(initRes.success, true);
      assert.ok(initRes.data);
      // Only the active process should be carried forward
      assert.strictEqual(initRes.data.processes.length, 1);
      assert.strictEqual(initRes.data.processes[0].processId, activeProcId);
      assert.strictEqual(initRes.data.processes[0].currentStatus, UniverseProcessStatus.ACTIVE);
    });

    it('rejects carryover process that references a non-location entity as its location', () => {
      const universe = createGenericSeedUniverse();
      const predPeriodId = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-01',
          currentUniverseTime: '2024-01-01T23:59:59Z',
          currentPeriodRef: predPeriodId,
          periodSequence: 1
        }
      };

      // Propose carryover process pointing to a character (CHAR_GENERIC_A) instead of location
      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!,
        previousProcesses: [
          {
            processId: 'PROC_TEST_INVALID_LOC',
            startReference: '2024-01-01T08:00:00Z',
            currentStatus: UniverseProcessStatus.ACTIVE,
            dependencies: [],
            metadata: { locationRef: 'CHAR_GENERIC_A' }, // Invalid! Character is not a location
            traceability: {
              requestId: 'REQ_1' as any,
              sourceSystem: 'DAILY_UNIVERSE_SYSTEM' as any,
              timestamp: Date.now(),
              version: '1.0.0'
            }
          }
        ]
      });

      assert.strictEqual(initRes.success, false);
      assert.strictEqual(initRes.error?.code, EngineErrorCode.INVALID_ENTITY_REFERENCE);
      assert.match(initRes.message!, /points to a non-location entity/);
    });
  });

  describe('4. Persistence Round-Trip Simulation (Restart Safety)', () => {
    it('Process A runs period N, persists snapshot; Process B restarts and continues to period N+1 authoritatively', () => {
      const storeA = new FileUniverseSnapshotStore({ rootDir: TEST_DIR });
      const universe = createGenericSeedUniverse();

      // ==========================================
      // PROCESS A: Initialize Period 1 and finalize
      // ==========================================
      const period1Init = PeriodInitializer.initialize({
        universe,
        universeScope: 'UNIVERSE_DEFAULT'
      });
      assert.strictEqual(period1Init.success, true);
      const ctx1 = period1Init.data!;
      assert.strictEqual(ctx1.initializationMode, 'FIRST_PERIOD');
      assert.strictEqual(ctx1.period.isFirstPeriod, true);
      const p1Id = ctx1.period.periodId;

      // Finalize period 1
      ctx1.lifecycle.transition('COMPLETE_PERIOD' as any, { periodId: p1Id });
      ctx1.period.status = DailyUniverseStatus.FINALIZED;
      ctx1.period.endTime = TimePoint.parse('2024-01-01T23:59:59Z').data!;

      // Record period 1 into Universe snapshot
      const universeAfterP1 = DailyUniverseContinuation.recordPeriodToUniverse(universe, ctx1);

      // Verify universe passes deep model validation
      const valReport = UniverseModelValidator.validate(universeAfterP1);
      assert.strictEqual(valReport.isValid, true, `Validation errors: ${JSON.stringify(valReport.issues)}`);

      // Persist to store (simulating atomic write)
      storeA.save(universeAfterP1);

      // ==========================================
      // SHUTDOWN: Process A terminates, memory cleared
      // ==========================================

      // ==========================================
      // PROCESS B: Starts up fresh, loads snapshot from disk
      // ==========================================
      const storeB = new FileUniverseSnapshotStore({ rootDir: TEST_DIR });
      const loadedUniverse = storeB.load(universe.universeId);
      assert.ok(loadedUniverse, 'Universe must be successfully loaded from disk');

      // Loaded universe must retain period 1 in temporalContext and periods
      assert.strictEqual(loadedUniverse.temporalContext.currentPeriodRef, p1Id);
      assert.strictEqual(loadedUniverse.temporalContext.periodSequence, 1);
      assert.ok(loadedUniverse.periods);
      assert.ok(loadedUniverse.periods[p1Id]);

      // Continue to Period 2
      const period2Init = PeriodInitializer.initialize({
        universe: loadedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!
      });

      assert.strictEqual(period2Init.success, true);
      const ctx2 = period2Init.data!;

      // INVARIANT: Process B must know its predecessor authoritatively!
      // Must NOT revert to FIRST_PERIOD!
      assert.strictEqual(ctx2.initializationMode, 'NORMAL_CONTINUATION');
      assert.strictEqual(ctx2.period.isFirstPeriod, false);
      assert.strictEqual(ctx2.period.previousPeriodRef, p1Id);
      assert.ok(ctx2.period.periodId.endsWith('_S0002'), `Period ID should encode sequence 2: ${ctx2.period.periodId}`);
    });
  });
});
