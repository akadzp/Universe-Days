import { CharacterStateDataSource, CharacterStateLifecycle, validateCharacterState } from '../../../core/universe/model/character-state.ts';
import { TemporalStatus } from '../../../core/universe/model/types.ts';

describe('Character State System', () => {
  const base = {
    stateId: 'STATE_TEST_01',
    characterId: 'CHAR_TEST_01',
    effectiveFrom: '2026-09-22T10:00:00Z',
    snapshot: {
      currentActivity: 'Membaca',
      currentMood: 'Tenang'
    },
    temporalCategory: TemporalStatus.ACTUAL,
    source: CharacterStateDataSource.USER_DEFINED
  } as const;

  it('creates a partial state without inventing missing fields', () => {
    const result = CharacterStateLifecycle.createManual(base);
    expect(result.result).toBe('ACCEPTED');
    expect(result.data?.currentValue.currentMood).toBe('Tenang');
    expect(result.data?.currentValue.currentGoal).toBeUndefined();
  });

  it('rejects AI proposal as authoritative state', () => {
    const result = CharacterStateLifecycle.createManual({
      ...base,
      source: CharacterStateDataSource.AI_PROPOSAL
    });
    expect(result.result).toBe('REJECTED');
  });

  it('requires a trigger for state changes', () => {
    const created = CharacterStateLifecycle.createManual(base);
    const result = CharacterStateLifecycle.changeState(created.data!, {
      previousState: created.data!.currentValue,
      currentState: { currentActivity: 'Berjalan', currentMood: 'Tenang' },
      stateChange: 'Aktivitas berubah',
      changeTrigger: '',
      changeDate: '2026-09-22T11:00:00Z',
      source: CharacterStateDataSource.STORY_DERIVED
    });
    expect(result.result).toBe('REJECTED');
  });

  it('retains previous state when a valid change occurs', () => {
    const created = CharacterStateLifecycle.createManual(base);
    const result = CharacterStateLifecycle.changeState(created.data!, {
      previousState: created.data!.currentValue,
      currentState: { currentActivity: 'Berjalan', currentMood: 'Tenang' },
      stateChange: 'Beralih dari membaca ke berjalan',
      changeTrigger: 'Selesai membaca',
      changeDate: '2026-09-22T11:00:00Z',
      source: CharacterStateDataSource.STORY_DERIVED
    });
    expect(result.result).toBe('ACCEPTED');
    expect(result.data?.previousValue?.currentActivity).toBe('Membaca');
    expect(result.data?.currentValue.currentActivity).toBe('Berjalan');
    expect(result.data?.transitionCount).toBe(1);
  });

  it('detects AI field provenance', () => {
    const created = CharacterStateLifecycle.createManual({
      ...base,
      fieldSources: {
        currentMood: CharacterStateDataSource.AI_PROPOSAL
      }
    });
    expect(created.result).toBe('REJECTED');
  });
});
