/**
 * Phase 10: Deterministic production renderer adapter for tests.
 *
 * This is NOT the future Narrator and does not generate prose.
 */

import { Result, success, failure } from '../types/result.ts';
import { StoryLifecycleManager, StoryLifecycleStatus } from '../story/daily/lifecycle.ts';
import { MockStoryTestRenderer } from '../story/daily/mock-renderer.ts';
import {
  ProductionRenderer,
  ProductionRenderResult
} from './types.ts';
import { StoryProductionPackage } from '../story/daily/orchestrator.ts';

export interface DeterministicMockRenderOutput {
  readonly storyId: string;
  readonly storyDate: string;
  readonly mockRenderStatus: 'MOCK_RENDERED';
  readonly renderedBeatsCount: number;
  readonly deterministicPlaceholderHash: string;
  readonly completedAtUniverseTime: string;
}

export class DeterministicMockProductionRenderer
  implements ProductionRenderer<DeterministicMockRenderOutput> {

  public readonly rendererId = 'DETERMINISTIC_MOCK_RENDERER';

  public render(
    storyPackage: StoryProductionPackage
  ): Result<ProductionRenderResult<DeterministicMockRenderOutput>> {
    const lifecycle = new StoryLifecycleManager(
      StoryLifecycleStatus.READY_FOR_PRODUCTION
    );

    const rendered = MockStoryTestRenderer.renderAndComplete(
      storyPackage.handoff,
      lifecycle
    );

    if (!rendered.success || !rendered.data) {
      return failure(
        rendered.error ?? 'MOCK_RENDER_FAILED',
        rendered.message ?? 'Deterministic mock rendering failed.'
      );
    }

    return success({
      output: rendered.data,
      status: 'VALIDATED',
      rendererId: this.rendererId
    });
  }
}
