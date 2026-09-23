/**
 * Phase 6: Daily Story Date.
 * Derives and validates the authoritative Story Date from Universe temporal context.
 * Story Date must NEVER use server time, request time, AI execution time, or file timestamps.
 * Story Date is distinct from future Narrative Time.
 */

import { TimePoint } from '../RUNTIME/TEMPORAL/time-point.ts';
import { UniverseDate } from '../RUNTIME/TEMPORAL/date.ts';
import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { StoryTrigger } from './trigger.ts';

export interface StoryDateInfo {
  storyDate: string; // Canonical Date (YYYY-MM-DD)
  storyDateTime: string; // Canonical DateTime (YYYY-MM-DDTHH:MM:SSZ)
  timePoint: TimePoint;
  universeDate?: UniverseDate;
  source: 'TRIGGER_ANCHOR' | 'PERIOD_START' | 'PERIOD_CLOCK';
}

export class StoryDateResolver {
  /**
   * Resolves Story Date deterministically from Universe context and trigger.
   */
  public static resolveDate(
    universeContext: UniversePeriodContext,
    trigger?: StoryTrigger
  ): Result<StoryDateInfo> {
    if (!universeContext || !universeContext.period) {
      return failure(
        EngineErrorCode.INVALID_STORY_DATE,
        'UniversePeriodContext is missing or has no period'
      );
    }

    let resolvedPoint: TimePoint;
    let source: StoryDateInfo['source'] = 'PERIOD_START';

    // If trigger has a valid temporal anchor within the period, we can use it
    if (trigger && trigger.temporalAnchor) {
      const parsed = TimePoint.parse(trigger.temporalAnchor);
      if (parsed.success && parsed.data) {
        resolvedPoint = parsed.data;
        source = 'TRIGGER_ANCHOR';
      } else {
        return failure(
          EngineErrorCode.INVALID_STORY_DATE,
          `Trigger temporalAnchor "${trigger.temporalAnchor}" is invalid`
        );
      }
    } else if (universeContext.period.startTime) {
      resolvedPoint = universeContext.period.startTime;
      source = 'PERIOD_START';
    } else if (universeContext.clock) {
      resolvedPoint = universeContext.clock.readCurrentTime();
      source = 'PERIOD_CLOCK';
    } else {
      return failure(
        EngineErrorCode.INVALID_STORY_DATE,
        'Cannot resolve story date: no valid temporal context in Universe'
      );
    }

    const storyDate = resolvedPoint.date ? resolvedPoint.date.toCanonical() : 'UNKNOWN';
    const storyDateTime = resolvedPoint.toCanonical();
    const universeDate = resolvedPoint.date;

    return success({
      storyDate,
      storyDateTime,
      timePoint: resolvedPoint,
      universeDate,
      source
    });
  }

  /**
   * Validates whether a given story date is temporally consistent with the Universe period.
   */
  public static validateDate(
    storyDate: StoryDateInfo,
    universeContext: UniversePeriodContext
  ): Result<boolean> {
    if (!storyDate || !storyDate.timePoint) {
      return failure(
        EngineErrorCode.INVALID_STORY_DATE,
        'StoryDateInfo is missing or has no TimePoint'
      );
    }

    const periodStart = universeContext.period.startTime;
    if (!periodStart) {
      return failure(
        EngineErrorCode.INVALID_STORY_DATE,
        'Universe period has no startTime'
      );
    }

    // Story Date must match the period's date or fall within period boundaries
    const periodStartDate = periodStart.date ? periodStart.date.toCanonical() : 'UNKNOWN';
    if (storyDate.storyDate !== periodStartDate) {
      // If different date, check if period spans multiple days and contains it
      if (universeContext.period.endTime) {
        if (
          storyDate.storyDateTime < periodStart.toCanonical() ||
          storyDate.storyDateTime > universeContext.period.endTime.toCanonical()
        ) {
          return failure(
            EngineErrorCode.TEMPORAL_CONFLICT,
            `Story date ${storyDate.storyDateTime} is outside period boundaries [${periodStart.toCanonical()}, ${universeContext.period.endTime.toCanonical()}]`
          );
        }
      } else {
        return failure(
          EngineErrorCode.TEMPORAL_CONFLICT,
          `Story date ${storyDate.storyDate} does not match period start date ${periodStartDate}`
        );
      }
    }

    return success(true);
  }
}
