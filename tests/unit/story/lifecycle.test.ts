import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StoryLifecycleManager,
  StoryLifecycleStatus,
  StoryLifecycleEvent
} from '../../../core/story/daily/lifecycle.ts';

describe('Phase 6 - Story Lifecycle State Machine Unit Tests', () => {
  it('1. Progresses through standard deterministic lifecycle to READY_FOR_PRODUCTION', () => {
    const sm = new StoryLifecycleManager();
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.UNINITIALIZED);

    // UNINITIALIZED -> TRIGGERED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.ACCEPT_TRIGGER).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.TRIGGERED);

    // TRIGGERED -> SCOPED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.BIND_SCOPE).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.SCOPED);

    // SCOPED -> DATED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.ASSIGN_DATE).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.DATED);

    // DATED -> IDENTIFIED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.ASSIGN_ID).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.IDENTIFIED);

    // IDENTIFIED -> READY_FOR_PRODUCTION
    assert.strictEqual(sm.transition(StoryLifecycleEvent.MARK_READY).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.READY_FOR_PRODUCTION);
  });

  it('2. Drives lifecycle through production, rendering, validation to COMPLETED', () => {
    const sm = new StoryLifecycleManager(StoryLifecycleStatus.READY_FOR_PRODUCTION);

    // READY_FOR_PRODUCTION -> IN_PRODUCTION
    assert.strictEqual(sm.transition(StoryLifecycleEvent.START_PRODUCTION).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.IN_PRODUCTION);

    // IN_PRODUCTION -> RENDERED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.COMPLETE_RENDER).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.RENDERED);

    // RENDERED -> VALIDATED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.PASS_VALIDATION).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.VALIDATED);

    // VALIDATED -> COMPLETED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.FINALIZE_STORY).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.COMPLETED);
  });

  it('3. Rejects invalid lifecycle transitions', () => {
    const sm = new StoryLifecycleManager(StoryLifecycleStatus.UNINITIALIZED);
    // Cannot skip directly to READY_FOR_PRODUCTION or COMPLETED
    const res = sm.transition(StoryLifecycleEvent.FINALIZE_STORY);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error?.code, 'INVALID_STORY_LIFECYCLE');
  });

  it('4. Handles blocking, review, and revision transitions', () => {
    const sm = new StoryLifecycleManager(StoryLifecycleStatus.SCOPED);

    // SCOPED -> BLOCKED
    assert.strictEqual(sm.transition(StoryLifecycleEvent.BLOCK, { reason: 'Missing prerequisite' }).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.BLOCKED);

    // BLOCKED -> SCOPED (UNBLOCK)
    assert.strictEqual(sm.transition(StoryLifecycleEvent.UNBLOCK).success, true);
    assert.strictEqual(sm.currentStatus, StoryLifecycleStatus.SCOPED);
  });
});
