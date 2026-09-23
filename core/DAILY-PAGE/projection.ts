import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { StoryProductionPackage } from '../DAILY-STORY/orchestrator.ts';
import { PageProjection, PageSourceRef, PageSourceSelection } from './types.ts';

export class DailyPageProjector {
  public static project(
    context: UniversePeriodContext,
    selection: PageSourceSelection,
    storyPackage?: StoryProductionPackage
  ): Result<PageProjection, { code: EngineErrorCode | string; message: string }> {
    const sources: PageSourceRef[] = [];

    const events = selection.eventIds ?? [];
    const processes = selection.processIds ?? [];
    const continuity = selection.continuityIds ?? [];
    const unresolved = selection.unresolvedIds ?? [];
    const future = selection.futureInformationRefs ?? [];

    const eventSet = new Set(context.events.map(item => item.eventId));
    const processSet = new Set(context.processes.map(item => item.processId));
    const continuitySet = new Set(context.continuityItems.map(item => item.identity.continuityId));
    const unresolvedSet = new Set(context.unresolvedConditions.map(item => item.unresolvedId));

    for (const id of events) {
      if (!eventSet.has(id)) {
        return failure(
          { code: EngineErrorCode.MISSING_REQUIRED_CONTEXT, message: `Page projection references missing event "${id}".` },
          `Page projection references missing event "${id}".`
        );
      }
      sources.push({ kind: 'EVENT', ref: id });
    }

    for (const id of processes) {
      if (!processSet.has(id)) {
        return failure(
          { code: EngineErrorCode.MISSING_REQUIRED_CONTEXT, message: `Page projection references missing process "${id}".` },
          `Page projection references missing process "${id}".`
        );
      }
      sources.push({ kind: 'PROCESS', ref: id });
    }

    for (const id of continuity) {
      if (!continuitySet.has(id)) {
        return failure(
          { code: EngineErrorCode.MISSING_REQUIRED_CONTEXT, message: `Page projection references missing continuity "${id}".` },
          `Page projection references missing continuity "${id}".`
        );
      }
      sources.push({ kind: 'CONTINUITY', ref: id });
    }

    for (const id of unresolved) {
      if (!unresolvedSet.has(id)) {
        return failure(
          { code: EngineErrorCode.MISSING_REQUIRED_CONTEXT, message: `Page projection references missing unresolved condition "${id}".` },
          `Page projection references missing unresolved condition "${id}".`
        );
      }
      sources.push({ kind: 'UNRESOLVED', ref: id });
    }

    // Future-information references are opaque owner references. The Page layer
    // does not inspect or reinterpret their contents.
    for (const ref of future) {
      if (!ref.trim()) {
        return failure(
          { code: EngineErrorCode.INVALID_PAGE_INPUT, message: 'Future-information references must be non-empty.' },
          'Future-information references must be non-empty.'
        );
      }
      sources.push({ kind: 'FUTURE_INFORMATION', ref });
    }

    let storyId: string | undefined;
    if (selection.includeStory) {
      if (!storyPackage) {
        return failure(
          { code: EngineErrorCode.STORY_PRODUCTION_ERROR, message: 'Page requested Story projection but no StoryProductionPackage was supplied.' },
          'Page requested Story projection but no StoryProductionPackage was supplied.'
        );
      }
      storyId = storyPackage.storyId;
      sources.push({ kind: 'STORY', ref: storyPackage.storyId });
    }

    return success({
      sources: Object.freeze(sources),
      ...(storyId ? { storyId } : {})
    });
  }
}
