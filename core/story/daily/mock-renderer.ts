/**
 * Phase 6: Temporary Deterministic Test Renderer.
 * Minimal deterministic mock renderer for testing the full lifecycle
 * (READY_FOR_PRODUCTION -> IN_PRODUCTION -> RENDERED -> VALIDATED -> COMPLETED).
 * 
 * STRICT ARCHITECTURAL BOUNDARY:
 * This is ONLY a test harness utility. It does NOT generate narrative prose with an LLM
 * and must NEVER be confused with the future Narrator (Phase 7+).
 */

import { StoryHandoffContext } from './handoff.ts';
import { StoryLifecycleManager, StoryLifecycleEvent, StoryLifecycleStatus } from './lifecycle.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export interface MockStoryRenderOutput {
  storyId: string;
  storyDate: string;
  mockRenderStatus: 'MOCK_RENDERED';
  renderedBeatsCount: number;
  deterministicPlaceholderHash: string;
  completedAtUniverseTime: string;
}

export class MockStoryTestRenderer {
  /**
   * Deterministically renders a mock story structure and drives lifecycle to COMPLETED.
   */
  public static renderAndComplete(
    handoff: StoryHandoffContext,
    lifecycle: StoryLifecycleManager
  ): Result<MockStoryRenderOutput> {
    if (lifecycle.currentStatus !== StoryLifecycleStatus.READY_FOR_PRODUCTION) {
      return failure(
        EngineErrorCode.INVALID_STORY_LIFECYCLE,
        `Cannot start mock rendering from lifecycle state ${lifecycle.currentStatus}; expected READY_FOR_PRODUCTION`
      );
    }

    // 1. Transition to IN_PRODUCTION
    const prodRes = lifecycle.transition(StoryLifecycleEvent.START_PRODUCTION, {
      storyId: handoff.storyId,
      reason: 'Mock renderer start'
    });
    if (!prodRes.success) return failure(prodRes.error!);

    // 2. Transition to RENDERED
    const rendRes = lifecycle.transition(StoryLifecycleEvent.COMPLETE_RENDER, {
      storyId: handoff.storyId,
      reason: 'Mock render completed'
    });
    if (!rendRes.success) return failure(rendRes.error!);

    // 3. Transition to VALIDATED
    const valRes = lifecycle.transition(StoryLifecycleEvent.PASS_VALIDATION, {
      storyId: handoff.storyId,
      reason: 'Mock validation passed'
    });
    if (!valRes.success) return failure(valRes.error!);

    // 4. Transition to COMPLETED
    const compRes = lifecycle.transition(StoryLifecycleEvent.FINALIZE_STORY, {
      storyId: handoff.storyId,
      reason: 'Mock story completed'
    });
    if (!compRes.success) return failure(compRes.error!);

    const beatsCount = handoff.events.length + handoff.processes.length + 1;
    const output: MockStoryRenderOutput = {
      storyId: handoff.storyId,
      storyDate: handoff.storyDate,
      mockRenderStatus: 'MOCK_RENDERED',
      renderedBeatsCount: beatsCount,
      deterministicPlaceholderHash: `MOCK_HASH_${handoff.storyId}`,
      completedAtUniverseTime: handoff.createdAtUniverseTime
    };

    return success(output);
  }
}
