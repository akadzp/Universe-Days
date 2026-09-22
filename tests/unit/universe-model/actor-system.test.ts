import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ActorDataSource,
  ActorEntityType,
  ActorGender,
  ActorLevel,
  ActorLifecycle,
  validateActorClassification
} from '../../../core/universe/model/index.ts';

describe('Actor / Character System', () => {
  it('validates Group rules by level', () => {
    const core = validateActorClassification({
      gender: ActorGender.ACTOR,
      level: ActorLevel.CORE,
      entityType: ActorEntityType.HUMAN,
      groupMembership: { currentGroupId: 'GROUP_7', history: [] }
    });
    assert.strictEqual(core.valid, true);

    const impact = validateActorClassification({
      gender: ActorGender.ACTRESS,
      level: ActorLevel.IMPACT,
      entityType: ActorEntityType.HUMAN,
      groupMembership: { currentGroupId: null, history: [] }
    });
    assert.strictEqual(impact.valid, true);

    const invalidPeripheral = validateActorClassification({
      gender: ActorGender.ACTRESS,
      level: ActorLevel.PERIPHERAL,
      entityType: ActorEntityType.HUMAN,
      groupMembership: { currentGroupId: 'GROUP_1', history: [] }
    });
    assert.strictEqual(invalidPeripheral.valid, false);
  });

  it('allows Level 2 Group transfer but protects Level 1', () => {
    const major = {
      gender: ActorGender.ACTOR,
      level: ActorLevel.MAJOR,
      entityType: ActorEntityType.HUMAN,
      groupMembership: { currentGroupId: 'GROUP_1', history: [] },
      roleReferences: [],
      source: ActorDataSource.USER_DEFINED
    };
    const moved = ActorLifecycle.changeGroup(major, {
      actorId: 'CHAR_MAJOR_01',
      actorLevel: ActorLevel.MAJOR,
      currentGroupId: 'GROUP_1',
      targetGroupId: 'GROUP_2',
      effectiveFrom: '2026-09-22T00:00:00Z',
      source: ActorDataSource.STORY_DERIVED
    });
    assert.strictEqual(moved.result, 'ACCEPTED');
    assert.strictEqual(moved.data?.groupMembership.currentGroupId, 'GROUP_2');

    const core = { ...major, level: ActorLevel.CORE };
    const blocked = ActorLifecycle.changeGroup(core, {
      actorId: 'CHAR_CORE_01',
      actorLevel: ActorLevel.CORE,
      currentGroupId: 'GROUP_1',
      targetGroupId: 'GROUP_2',
      effectiveFrom: '2026-09-22T00:00:00Z',
      source: ActorDataSource.STORY_DERIVED
    });
    assert.strictEqual(blocked.result, 'REJECTED');
  });

  it('does not persist transient story actors without narrative influence', () => {
    const result = ActorLifecycle.emergeFromStory({
      actorId: 'CHAR_TRANSIENT_01',
      displayName: 'Guard',
      gender: ActorGender.UNKNOWN,
      level: ActorLevel.PERIPHERAL,
      groupId: null,
      entityType: ActorEntityType.HUMAN,
      effectiveFrom: '2026-09-22T00:00:00Z',
      narrativeInfluence: false
    });
    assert.strictEqual(result.result, 'IGNORED_TRANSIENT');
  });

  it('permits UNKNOWN gender without guessing', () => {
    const result = ActorLifecycle.createManual({
      actorId: 'CHAR_UNKNOWN_01',
      displayName: 'Unknown Actor',
      gender: ActorGender.UNKNOWN,
      level: ActorLevel.MAJOR,
      groupId: 'GROUP_A',
      entityType: ActorEntityType.HUMAN,
      effectiveFrom: '2026-09-22T00:00:00Z'
    });
    assert.strictEqual(result.result, 'ACCEPTED');
    assert.strictEqual(result.data?.classification.gender, ActorGender.UNKNOWN);
  });
});
