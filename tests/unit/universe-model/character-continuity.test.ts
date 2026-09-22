import assert from 'node:assert/strict';
import { ActorDataSource } from '../../../core/universe/model/actor.ts';
import {
  CharacterContinuityLifecycle,
  ContinuityChangeType,
  ContinuityCheckStatus,
  ContinuityConflictStatus,
  classifyContinuityChange
} from '../../../core/universe/model/character-continuity.ts';

describe('Character Continuity System', () => {
  it('membedakan informasi baru dari kontradiksi', () => {
    assert.equal(
      classifyContinuityChange({ contradictsExisting: false, hasNarrativeBasis: false, isNewInformation: true }),
      ContinuityCheckStatus.NEW_INFORMATION
    );
    assert.equal(
      classifyContinuityChange({ contradictsExisting: true, hasNarrativeBasis: false }),
      ContinuityCheckStatus.CONTRADICTION
    );
  });

  it('mengenali perubahan sah dan perkembangan', () => {
    assert.equal(
      classifyContinuityChange({ contradictsExisting: true, hasNarrativeBasis: true }),
      ContinuityCheckStatus.VALID_CHANGE
    );
    assert.equal(
      classifyContinuityChange({ contradictsExisting: false, hasNarrativeBasis: true, isDevelopment: true }),
      ContinuityCheckStatus.DEVELOPMENT
    );
  });

  it('tidak menerima AI proposal sebagai Canon continuity', () => {
    const result = CharacterContinuityLifecycle.createManual({
      continuityId: 'CONT_TEST_01',
      characterId: 'CHAR_TEST_01',
      effectiveFrom: '2026-01-01T00:00:00Z',
      source: ActorDataSource.AI_PROPOSAL
    });
    assert.equal(result.result, 'REJECTED');
  });

  it('mencatat conflict tanpa menyelesaikannya otomatis', () => {
    const created = CharacterContinuityLifecycle.createManual({
      continuityId: 'CONT_TEST_02',
      characterId: 'CHAR_TEST_02',
      effectiveFrom: '2026-01-01T00:00:00Z'
    });
    assert.equal(created.result, 'ACCEPTED');
    const withConflict = CharacterContinuityLifecycle.recordConflict(created.data!, {
      conflictId: 'CONFLICT_01',
      conflictType: 'IDENTITY',
      conflictDescription: 'Dua data identitas tidak dapat berlaku bersamaan.',
      affectedData: ['profile.fullName'],
      source: ActorDataSource.USER_DEFINED,
      resolutionStatus: ContinuityConflictStatus.UNRESOLVED
    });
    assert.equal(withConflict.result, 'ACCEPTED');
    assert.equal(withConflict.data!.conflicts[0].resolutionStatus, ContinuityConflictStatus.UNRESOLVED);
  });

  it('mempertahankan riwayat perubahan', () => {
    const created = CharacterContinuityLifecycle.createManual({
      continuityId: 'CONT_TEST_03',
      characterId: 'CHAR_TEST_03',
      effectiveFrom: '2026-01-01T00:00:00Z'
    });
    const changed = CharacterContinuityLifecycle.recordChange(created.data!, {
      changeId: 'CHANGE_01',
      changeType: ContinuityChangeType.BEHAVIOR,
      changeTrigger: 'Peristiwa cerita',
      previousState: 'lama',
      currentState: 'baru',
      classification: ContinuityCheckStatus.DEVELOPMENT,
      source: ActorDataSource.STORY_DERIVED
    });
    assert.equal(changed.result, 'ACCEPTED');
    assert.equal(changed.data!.changes.length, 1);
  });
});
