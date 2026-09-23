/**
 * Phase 5: Continuity Carryover.
 * Integrates Phase 4 Continuity Engine across period boundaries.
 */

import {
  ContinuityItem,
  ContinuityStatus,
  TransitionType,
  Transition,
  EffectiveTime,
  ContinuityValidator,
  ContinuityValidationResult,
  TransitionResult
} from '../../UNIVERSE/CONTINUITY';
import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TemporalRelationEngine } from '../../RUNTIME/TEMPORAL/relations.ts';
import { TemporalRelation } from '../../RUNTIME/TEMPORAL/types.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export enum CarryoverDecisionType {
  CARRY_FORWARD = 'CARRY_FORWARD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  TRANSFORMED = 'TRANSFORMED',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export type CarryoverSeverity = 'VALID' | 'BLOCKED' | 'REVIEW_REQUIRED';

export interface CarryoverItem {
  continuityItem: ContinuityItem;
  decision: CarryoverDecisionType;
  transition?: Transition;
  validationResult: TransitionResult;
  severity: CarryoverSeverity;
  notes?: string;
}

export interface CarryoverBatchResult {
  allowed: boolean;
  severity: CarryoverSeverity;
  items: CarryoverItem[];
  blockedReasons: string[];
}

export class CarryoverManager {
  /**
   * Processes carryover from a previous period to the current target period.
   * Does NOT reset continuity simply because a new period starts.
   */
  public static processCarryover(
    previousItems: ContinuityItem[],
    targetPeriodStartTime: TimePoint,
    explicitTransitions: Map<string, Transition> = new Map()
  ): CarryoverBatchResult {
    const results: CarryoverItem[] = [];
    const blockedReasons: string[] = [];
    let overallSeverity: CarryoverSeverity = 'VALID';

    for (const item of previousItems) {
      const explicitTransition = explicitTransitions.get(item.identity.continuityId);

      // Determine decision type
      let decision: CarryoverDecisionType = CarryoverDecisionType.CARRY_FORWARD;
      let transitionToValidate: Transition | undefined = explicitTransition;

      if (item.status === ContinuityStatus.ENDED) {
        decision = CarryoverDecisionType.COMPLETED;
      } else if (item.status === ContinuityStatus.SUSPENDED) {
        decision = CarryoverDecisionType.SUSPENDED;
      } else if (item.status === ContinuityStatus.UNRESOLVED) {
        decision = CarryoverDecisionType.UNRESOLVED;
      } else if (item.status === ContinuityStatus.UNKNOWN) {
        decision = CarryoverDecisionType.UNKNOWN;
      }

      // If an explicit transition is provided, use it
      if (explicitTransition) {
        switch (explicitTransition.type) {
          case TransitionType.CONTINUE:
            decision = CarryoverDecisionType.CARRY_FORWARD;
            break;
          case TransitionType.CHANGE:
            decision = CarryoverDecisionType.CARRY_FORWARD;
            break;
          case TransitionType.END:
            decision = CarryoverDecisionType.COMPLETED;
            break;
          case TransitionType.SUSPEND:
            decision = CarryoverDecisionType.SUSPENDED;
            break;
          case TransitionType.TRANSFORM:
          case TransitionType.REPLACE:
            decision = CarryoverDecisionType.TRANSFORMED;
            break;
          case TransitionType.UNRESOLVED:
            decision = CarryoverDecisionType.UNRESOLVED;
            break;
          case TransitionType.UNKNOWN:
            decision = CarryoverDecisionType.UNKNOWN;
            break;
        }
      } else {
        // Construct default carryover transition based on current status
        if (item.status === ContinuityStatus.ACTIVE) {
          transitionToValidate = {
            type: TransitionType.CONTINUE,
            continuityId: item.identity.continuityId,
            previousConditionRef: item.currentConditionRef,
            currentConditionRef: item.currentConditionRef,
            effectiveTime: EffectiveTime.fromPoint(targetPeriodStartTime),
            sourceReference: 'DAILY_UNIVERSE_CARRYOVER'
          };
        }
      }

      // Validate via Phase 4 ContinuityValidator if transition exists
      let validation: TransitionResult;
      let severity: CarryoverSeverity = 'VALID';

      if (transitionToValidate) {
        validation = ContinuityValidator.validateTransition({
          item,
          transition: transitionToValidate
        });

        // Validate temporal alignment: effective time must not be after target period
        if (validation.allowed) {
          const effStart = transitionToValidate.effectiveTime?.point ?? transitionToValidate.effectiveTime?.interval?.start;
          if (effStart) {
            const rel = TemporalRelationEngine.compareTimePoints(effStart, targetPeriodStartTime);
            if (rel === TemporalRelation.AFTER) {
              validation = {
                allowed: false,
                status: 'INVALID',
                transitionType: transitionToValidate.type,
                resultingStatus: item.status,
                findings: [
                  {
                    code: EngineErrorCode.TEMPORAL_CONFLICT,
                    message: `Carryover effective time ${effStart.toCanonical()} is after target period start ${targetPeriodStartTime.toCanonical()}`,
                    severity: 'ERROR'
                  }
                ]
              };
            }
          }
        }

        if (!validation.allowed) {
          severity = 'BLOCKED';
          blockedReasons.push(
            `Continuity ${item.identity.continuityId} carryover blocked: ${validation.findings.map(f => f.message).join('; ')}`
          );
        }
      } else {
        // No transition required (e.g. already ended or suspended item carried forward in that state)
        validation = {
          allowed: true,
          status: 'VALID',
          transitionType: 'NONE',
          resultingStatus: item.status,
          findings: []
        };
      }

      if (severity === 'BLOCKED') {
        overallSeverity = 'BLOCKED';
      }

      // Apply transition to get updated item
      const resultingStatus = (validation.resultingStatus as ContinuityStatus) ?? item.status;
      const updatedItem: ContinuityItem = {
        ...item,
        status: resultingStatus,
        currentConditionRef: transitionToValidate?.currentConditionRef ?? item.currentConditionRef,
        identity: {
          ...item.identity,
          version: explicitTransition ? (typeof item.identity.version === 'number' ? item.identity.version + 1 : item.identity.version) : item.identity.version
        }
      };

      results.push({
        continuityItem: updatedItem,
        decision,
        transition: transitionToValidate,
        validationResult: validation,
        severity
      });
    }

    return {
      allowed: overallSeverity !== 'BLOCKED',
      severity: overallSeverity,
      items: results,
      blockedReasons
    };
  }
}
