/**
 * Phase 8: Serialization & Validation Layer Unit Tests
 *
 * Verifies JSON serialization round-tripping, structure validation, and non-repairing error detection.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGenericSeedUniverse,
  UniverseSerializer,
  UniverseModelValidator,
  UniverseModelFactory
} from '../../../core/universe/model/index.ts';

describe('Phase 8: Serialization & Validation Layer', () => {
  it('1. Serializes and deserializes Universe model preserving full structure', () => {
    const seed = createGenericSeedUniverse();
    const json = UniverseSerializer.serialize(seed);
    assert.ok(typeof json === 'string');

    const restoreRes = UniverseSerializer.deserialize(json);
    assert.strictEqual(restoreRes.success, true);
    assert.ok(restoreRes.data);
    assert.strictEqual(restoreRes.data?.universeId, seed.universeId);
    assert.strictEqual(Object.keys(restoreRes.data?.characters || {}).length, 2);
  });

  it('2. Validator flags dangling relationship target endpoint as error', () => {
    const seed = createGenericSeedUniverse();
    const corruptModel = {
      ...seed,
      relationships: {
        ...seed.relationships,
        REL_DANGLING: {
          ...seed.relationships['REL_GENERIC_A_B'],
          relationshipId: 'REL_DANGLING',
          targetRef: 'NON_EXISTENT_CHAR' as any
        }
      }
    };

    const report = UniverseModelValidator.validate(corruptModel);
    assert.strictEqual(report.isValid, false);
    const danglingIssue = report.issues.find(i => i.code === 'DANGLING_REFERENCE');
    assert.ok(danglingIssue);
    assert.strictEqual(danglingIssue?.severity, 'ERROR');
  });

  it('3. Validator flags circular location hierarchy', () => {
    const seed = createGenericSeedUniverse();
    const corruptLocations = {
      ...seed.locations,
      LOC_GENERIC_A: {
        ...seed.locations['LOC_GENERIC_A'],
        parentLocationRef: 'LOC_GENERIC_SUB_A' // Parent points to child, creating a loop
      }
    };
    const corruptModel = {
      ...seed,
      locations: corruptLocations
    };

    const report = UniverseModelValidator.validate(corruptModel);
    assert.strictEqual(report.isValid, false);
    const cycleIssue = report.issues.find(i => i.code === 'CIRCULAR_LOCATION_HIERARCHY');
    assert.ok(cycleIssue);
  });

  it('4. Validator flags circular process dependencies', () => {
    const seed = createGenericSeedUniverse();
    const procA = {
      ...seed.processes['PROC_GENERIC_01'],
      dependencies: ['PROC_CYCLE_02']
    };
    const procB = {
      ...seed.processes['PROC_GENERIC_01'],
      processId: 'PROC_CYCLE_02',
      dependencies: ['PROC_GENERIC_01']
    };

    const corruptModel = {
      ...seed,
      processes: {
        [procA.processId]: procA,
        [procB.processId]: procB
      }
    };

    const report = UniverseModelValidator.validate(corruptModel);
    assert.strictEqual(report.isValid, false);
    const cycleIssue = report.issues.find(i => i.code === 'CIRCULAR_PROCESS_DEPENDENCY');
    assert.ok(cycleIssue);
  });
});
