/**
 * Temporal Status Evaluator and Transition Validator.
 * Supported values:
 * ACTUAL | MEMORY | REPORT | IMAGINED | HYPOTHETICAL | PLAN | PREDICTION | POSSIBILITY | UNKNOWN
 * Strictly independent of TemporalPosition (e.g. FUTURE + PLAN, PAST + MEMORY).
 * Does NOT auto-actualize without explicit transition command.
 */

import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { TemporalStatus } from '../types/temporal.ts';
import { GenericStateMachine } from '../engine/state-machine.ts';

export class TemporalStatusManager {
  private static readonly VALID_STATUSES = new Set<TemporalStatus>([
    TemporalStatus.ACTUAL,
    TemporalStatus.MEMORY,
    TemporalStatus.REPORT,
    TemporalStatus.IMAGINED,
    TemporalStatus.HYPOTHETICAL,
    TemporalStatus.PLAN,
    TemporalStatus.PREDICTION,
    TemporalStatus.POSSIBILITY,
    TemporalStatus.UNKNOWN
  ]);

  /**
   * Legal status transitions table.
   * Defines which statuses may transition into which destination statuses.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<TemporalStatus, ReadonlySet<TemporalStatus>> = {
    [TemporalStatus.PLAN]: new Set([TemporalStatus.ACTUAL, TemporalStatus.HYPOTHETICAL, TemporalStatus.MEMORY]),
    [TemporalStatus.PREDICTION]: new Set([TemporalStatus.ACTUAL, TemporalStatus.HYPOTHETICAL, TemporalStatus.REPORT]),
    [TemporalStatus.POSSIBILITY]: new Set([TemporalStatus.PLAN, TemporalStatus.HYPOTHETICAL, TemporalStatus.ACTUAL]),
    [TemporalStatus.HYPOTHETICAL]: new Set([TemporalStatus.PLAN, TemporalStatus.POSSIBILITY, TemporalStatus.ACTUAL]),
    [TemporalStatus.REPORT]: new Set([TemporalStatus.ACTUAL, TemporalStatus.MEMORY]),
    [TemporalStatus.MEMORY]: new Set([TemporalStatus.REPORT, TemporalStatus.ACTUAL]),
    [TemporalStatus.IMAGINED]: new Set([TemporalStatus.HYPOTHETICAL, TemporalStatus.POSSIBILITY]),
    [TemporalStatus.ACTUAL]: new Set([TemporalStatus.MEMORY, TemporalStatus.REPORT]),
    [TemporalStatus.UNKNOWN]: new Set([
      TemporalStatus.PLAN,
      TemporalStatus.PREDICTION,
      TemporalStatus.POSSIBILITY,
      TemporalStatus.HYPOTHETICAL,
      TemporalStatus.REPORT,
      TemporalStatus.MEMORY,
      TemporalStatus.IMAGINED,
      TemporalStatus.ACTUAL
    ])
  };

  /**
   * Type guard checking if a string is a valid TemporalStatus.
   */
  public static isValidStatus(status: unknown): status is TemporalStatus {
    return typeof status === 'string' && TemporalStatusManager.VALID_STATUSES.has(status as TemporalStatus);
  }

  /**
   * Parses and validates a TemporalStatus string.
   */
  public static parseStatus(status: string): Result<TemporalStatus> {
    if (!TemporalStatusManager.isValidStatus(status)) {
      return failure(
        EngineErrorCode.UNKNOWN_TEMPORAL_STATUS,
        `Unknown or unsupported temporal status "${status}". Allowed values: ACTUAL, MEMORY, REPORT, IMAGINED, HYPOTHETICAL, PLAN, PREDICTION, POSSIBILITY, UNKNOWN.`
      );
    }
    return success(status as TemporalStatus);
  }

  /**
   * Validates if a proposed status transition is legal.
   * Does NOT execute the transition automatically.
   */
  public static validateTransition(
    currentStatus: TemporalStatus,
    targetStatus: TemporalStatus
  ): Result<boolean> {
    if (!TemporalStatusManager.isValidStatus(currentStatus)) {
      return failure(EngineErrorCode.UNKNOWN_TEMPORAL_STATUS, `Invalid current status: ${currentStatus}`);
    }
    if (!TemporalStatusManager.isValidStatus(targetStatus)) {
      return failure(EngineErrorCode.UNKNOWN_TEMPORAL_STATUS, `Invalid target status: ${targetStatus}`);
    }

    if (currentStatus === targetStatus) {
      return success(true); // No-op transition is valid
    }

    const allowed = TemporalStatusManager.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.has(targetStatus)) {
      return failure(
        EngineErrorCode.INVALID_TRANSITION,
        `Status transition rejected: cannot transition from "${currentStatus}" to "${targetStatus}"`
      );
    }

    return success(true);
  }
}

/**
 * Creates a GenericStateMachine configured with the canonical TemporalStatus transition matrix.
 */
export function createTemporalStatusStateMachine(
  initialStatus: TemporalStatus = TemporalStatus.PLAN
): GenericStateMachine<TemporalStatus, string> {
  const sm = new GenericStateMachine<TemporalStatus, string>(initialStatus);

  const transitions: [TemporalStatus, TemporalStatus, string][] = [
    [TemporalStatus.PLAN, TemporalStatus.ACTUAL, 'ACTUALIZE'],
    [TemporalStatus.PLAN, TemporalStatus.HYPOTHETICAL, 'POSTPONE_TO_HYPOTHETICAL'],
    [TemporalStatus.PLAN, TemporalStatus.MEMORY, 'ARCHIVE_TO_MEMORY'],
    [TemporalStatus.PREDICTION, TemporalStatus.ACTUAL, 'FULFILL'],
    [TemporalStatus.PREDICTION, TemporalStatus.HYPOTHETICAL, 'DOWNGRADE'],
    [TemporalStatus.PREDICTION, TemporalStatus.REPORT, 'REPORT_OUTCOME'],
    [TemporalStatus.POSSIBILITY, TemporalStatus.PLAN, 'SCHEDULE'],
    [TemporalStatus.POSSIBILITY, TemporalStatus.HYPOTHETICAL, 'EXPLORE'],
    [TemporalStatus.POSSIBILITY, TemporalStatus.ACTUAL, 'REALIZE'],
    [TemporalStatus.HYPOTHETICAL, TemporalStatus.PLAN, 'COMMIT'],
    [TemporalStatus.HYPOTHETICAL, TemporalStatus.POSSIBILITY, 'CONSIDER'],
    [TemporalStatus.HYPOTHETICAL, TemporalStatus.ACTUAL, 'MATERIALIZE'],
    [TemporalStatus.REPORT, TemporalStatus.ACTUAL, 'CORROBORATE'],
    [TemporalStatus.REPORT, TemporalStatus.MEMORY, 'REMEMBER_REPORT'],
    [TemporalStatus.MEMORY, TemporalStatus.REPORT, 'TRANSCRIBE'],
    [TemporalStatus.MEMORY, TemporalStatus.ACTUAL, 'CONFIRM_HISTORIC'],
    [TemporalStatus.IMAGINED, TemporalStatus.HYPOTHETICAL, 'THEORIZE'],
    [TemporalStatus.IMAGINED, TemporalStatus.POSSIBILITY, 'ENTERTAIN'],
    [TemporalStatus.ACTUAL, TemporalStatus.MEMORY, 'RECORD_MEMORY'],
    [TemporalStatus.ACTUAL, TemporalStatus.REPORT, 'ISSUE_REPORT'],
    // From UNKNOWN
    [TemporalStatus.UNKNOWN, TemporalStatus.PLAN, 'DEFINE_PLAN'],
    [TemporalStatus.UNKNOWN, TemporalStatus.PREDICTION, 'DEFINE_PREDICTION'],
    [TemporalStatus.UNKNOWN, TemporalStatus.POSSIBILITY, 'DEFINE_POSSIBILITY'],
    [TemporalStatus.UNKNOWN, TemporalStatus.HYPOTHETICAL, 'DEFINE_HYPOTHETICAL'],
    [TemporalStatus.UNKNOWN, TemporalStatus.REPORT, 'DEFINE_REPORT'],
    [TemporalStatus.UNKNOWN, TemporalStatus.MEMORY, 'DEFINE_MEMORY'],
    [TemporalStatus.UNKNOWN, TemporalStatus.IMAGINED, 'DEFINE_IMAGINED'],
    [TemporalStatus.UNKNOWN, TemporalStatus.ACTUAL, 'DEFINE_ACTUAL']
  ];

  for (const [from, to, event] of transitions) {
    sm.addTransition(from, to, event);
  }

  return sm;
}

