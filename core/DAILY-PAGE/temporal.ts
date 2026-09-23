import { TimePoint } from '../RUNTIME/TEMPORAL/time-point.ts';
import { TemporalPosition, TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { PageTemporalFrame } from './types.ts';

export class DailyPageTemporalResolver {
  public static resolve(
    context: UniversePeriodContext,
    anchor: TimePoint | undefined,
    status: TemporalStatus
  ): Result<PageTemporalFrame, { code: EngineErrorCode | string; message: string }> {
    if (!context?.clock) {
      return failure(
        { code: EngineErrorCode.INVALID_TIME_POINT, message: 'Daily Page requires Universe Clock authority.' },
        'Daily Page requires Universe Clock authority.'
      );
    }

    const universeTime = context.clock.readCurrentTime();
    const anchorTime = anchor ?? universeTime;

    if (universeTime.isUnknown || anchorTime.isUnknown) {
      return failure(
        { code: EngineErrorCode.INVALID_TIME_POINT, message: 'Daily Page temporal frame cannot be resolved from UNKNOWN TimePoint.' },
        'Daily Page temporal frame cannot be resolved from UNKNOWN TimePoint.'
      );
    }

    let position = TemporalPosition.UNKNOWN;
    const comparison = anchorTime.compare(universeTime);

    if (comparison === null) {
      position = TemporalPosition.UNKNOWN;
    } else if (comparison < 0) {
      position = TemporalPosition.PAST;
    } else if (comparison > 0) {
      position = TemporalPosition.FUTURE;
    } else {
      position = TemporalPosition.PRESENT;
    }

    return success({
      universeTime: universeTime.toCanonical(),
      anchorTime: anchorTime.toCanonical(),
      position,
      status
    });
  }
}
