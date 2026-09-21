/**
 * Phase 4: Continuity Validator.
 * Deterministic validation engine enforcing identity consistency, transition invariants,
 * temporal progression, dependency evaluation, and lifecycle state machines.
 */

import { EngineErrorCode } from '../../types/errors.ts';
import { TemporalRelation } from '../../types/temporal.ts';
import { RuleEvaluator } from '../../engine/rule-evaluator.ts';
import { RuntimeRule, RuleEvaluationStatus } from '../../types/rules.ts';
import { ConditionReference, ConditionReferenceValidator } from './condition-reference.ts';
import {
  ContinuityItem,
  ContinuityIdentity,
  ContinuityIdentityValidator,
  ContinuityStatus,
  EffectiveTime
} from './continuity-model.ts';
import { Transition, TransitionType } from './transition.ts';
import {
  ContinuityValidationResult,
  ContinuityFinding,
  TransitionResult,
  ContinuityTrace,
  ContinuityConflict
} from './result.ts';
import { ContinuityLifecycleManager } from './lifecycle.ts';
import { ContinuityDependencyEvaluator } from './dependency.ts';

export interface TransitionValidationInput {
  item?: ContinuityItem;
  transition: Transition;
  context?: {
    items?: Map<string, { status: ContinuityStatus; entityRef?: string }>;
    conditions?: Map<string, unknown>;
    clock?: unknown;
    rules?: RuntimeRule[];
    allowReopen?: boolean;
    explicitNewAuthorized?: boolean;
  };
}

export class ContinuityValidator {
  /**
   * Validates a candidate transition against an existing ContinuityItem or new context.
   * Pure and deterministic: does NOT mutate the input item or context.
   */
  public static validateTransition(input: TransitionValidationInput): TransitionResult {
    const { item, transition, context = {} } = input;
    const findings: ContinuityFinding[] = [];
    const affectedReferences: string[] = [transition.continuityId];
    const startTime = Date.now();

    const currentStatus = item ? item.status : ContinuityStatus.UNKNOWN;
    const targetStatus = ContinuityLifecycleManager.mapTargetStatus(currentStatus, transition);

    // 1. Validate Transition Structure
    if (!transition.type || !Object.values(TransitionType).includes(transition.type)) {
      findings.push({
        code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
        message: `Unknown or invalid transition type: "${String(transition.type)}"`,
        severity: 'CRITICAL'
      });
      return this.buildResult(transition.type, currentStatus, targetStatus, findings, affectedReferences, startTime);
    }

    if (!transition.continuityId || transition.continuityId.trim() === '') {
      findings.push({
        code: EngineErrorCode.INVALID_CONTINUITY_IDENTITY,
        message: 'Transition must specify a non-empty continuityId',
        severity: 'CRITICAL'
      });
      return this.buildResult(transition.type, currentStatus, targetStatus, findings, affectedReferences, startTime);
    }

    // 2. Validate Identity Consistency if item exists
    if (item) {
      if (item.identity.continuityId !== transition.continuityId) {
        findings.push({
          code: EngineErrorCode.INVALID_CONTINUITY_IDENTITY,
          message: `Continuity ID mismatch: item is "${item.identity.continuityId}", transition targets "${transition.continuityId}"`,
          severity: 'CRITICAL',
          details: { itemContinuityId: item.identity.continuityId, transitionContinuityId: transition.continuityId }
        });
      }

      if (transition.previousConditionRef && transition.previousConditionRef.entityRef !== item.identity.entityRef) {
        findings.push({
          code: EngineErrorCode.INVALID_CONTINUITY_IDENTITY,
          message: `Entity mismatch: previous condition belongs to "${transition.previousConditionRef.entityRef}", item belongs to "${item.identity.entityRef}"`,
          severity: 'CRITICAL',
          details: { itemEntity: item.identity.entityRef, conditionEntity: transition.previousConditionRef.entityRef }
        });
      }
    }

    // 3. Lifecycle State Machine Validation (using Phase 1/2 GenericStateMachine)
    const lifecycle = new ContinuityLifecycleManager(currentStatus);
    const canTransition = lifecycle.canTransition(targetStatus, transition, {
      allowReopen: context.allowReopen,
      identity: item?.identity
    });

    if (!canTransition) {
      findings.push({
        code: EngineErrorCode.INVALID_TRANSITION,
        message: `Illegal lifecycle transition: cannot apply "${transition.type}" from current status "${currentStatus}" to "${targetStatus}"`,
        severity: 'CRITICAL',
        details: { currentStatus, targetStatus, transitionType: transition.type }
      });
    }

    // 4. Invariants by Transition Type
    this.validateTransitionInvariants(transition, item, context, findings);

    // 5. Temporal Progression Checks
    this.validateTemporalProgression(transition, item, findings);

    // 6. Dependencies Evaluation
    if (transition.dependencies && transition.dependencies.length > 0) {
      const depResult = ContinuityDependencyEvaluator.evaluateAll(transition.dependencies, {
        items: context.items,
        conditions: context.conditions,
        clock: context.clock
      });
      if (!depResult.satisfied) {
        findings.push(...depResult.findings);
      }
    }

    // 7. Rule Engine Integration (Phase 2 RuleEvaluator)
    if (context.rules && context.rules.length > 0) {
      const ruleContext = {
        flags: {
          IS_ACTIVE: currentStatus === ContinuityStatus.ACTIVE,
          HAS_PREDECESSOR: Boolean(transition.previousConditionRef)
        },
        values: {
          continuityId: transition.continuityId,
          transitionType: transition.type,
          currentStatus
        },
        enums: {
          transitionType: transition.type,
          currentStatus
        },
        references: [transition.continuityId as any],
        constraints: [],
        metadata: {
          taskId: `TASK-CONTINUITY-${transition.continuityId}`
        }
      };

      for (const rule of context.rules) {
        const evalRes = RuleEvaluator.evaluate(rule, ruleContext);
        if (evalRes.status === RuleEvaluationStatus.FAILED) {
          findings.push({
            code: EngineErrorCode.GATE_EVALUATION_FAILED,
            message: `Continuity rule "${rule.ruleId}" evaluation failed`,
            severity: 'CRITICAL',
            details: { ruleId: rule.ruleId, ruleType: rule.type }
          });
        }
      }
    }

    return this.buildResult(transition.type, currentStatus, targetStatus, findings, affectedReferences, startTime);
  }

  /**
   * Checks specific transition invariants for each TransitionType.
   */
  private static validateTransitionInvariants(
    transition: Transition,
    item: ContinuityItem | undefined,
    context: TransitionValidationInput['context'],
    findings: ContinuityFinding[]
  ): void {
    switch (transition.type) {
      case TransitionType.NEW: {
        // NEW must be explicitly supported; cannot assume NEW if predecessor exists
        if (transition.previousConditionRef) {
          findings.push({
            code: EngineErrorCode.CONTINUITY_CONFLICT,
            message: 'NEW transition must not specify a previousConditionRef',
            severity: 'ERROR'
          });
        }
        if (item && item.status !== ContinuityStatus.UNKNOWN && !context?.explicitNewAuthorized && !context?.allowReopen) {
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
            message: `Cannot initialize NEW continuity for already existing item with status "${item.status}" without explicit authorization`,
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.CONTINUE: {
        // CONTINUE requires prior condition
        const prev = transition.previousConditionRef || item?.currentConditionRef || item?.previousConditionRef;
        if (!prev) {
          findings.push({
            code: EngineErrorCode.MISSING_PREDECESSOR,
            message: 'CONTINUE requires an existing prior condition reference; no implicit continuation allowed',
            severity: 'CRITICAL'
          });
        }
        if (item?.status === ContinuityStatus.ENDED) {
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
            message: 'Cannot CONTINUE an already ENDED continuity item',
            severity: 'CRITICAL'
          });
        }
        if (item?.status === ContinuityStatus.SUSPENDED) {
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
            message: 'Cannot CONTINUE a SUSPENDED continuity item directly; must use RESUME',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.CHANGE: {
        const prev = transition.previousConditionRef || item?.currentConditionRef;
        if (!prev) {
          findings.push({
            code: EngineErrorCode.MISSING_PREDECESSOR,
            message: 'CHANGE transition requires a previous condition reference',
            severity: 'CRITICAL'
          });
        }
        if (!transition.currentConditionRef) {
          findings.push({
            code: EngineErrorCode.MISSING_CURRENT_CONDITION,
            message: 'CHANGE transition requires a current condition reference',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.END: {
        const prev = transition.previousConditionRef || item?.currentConditionRef || item?.previousConditionRef;
        if (!prev) {
          findings.push({
            code: EngineErrorCode.MISSING_PREDECESSOR,
            message: 'END transition requires an existing prior condition reference',
            severity: 'CRITICAL'
          });
        }
        if (!transition.effectiveTime) {
          findings.push({
            code: EngineErrorCode.INVALID_EFFECTIVE_TIME,
            message: 'END transition requires an explicit termination effective time',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.SUSPEND: {
        if (item?.status === ContinuityStatus.ENDED) {
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
            message: 'Cannot SUSPEND an already ENDED continuity item',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.RESUME: {
        if (!item || item.status !== ContinuityStatus.SUSPENDED) {
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_TRANSITION,
            message: `RESUME transition is only valid for items in SUSPENDED state (actual status: "${item?.status || 'NON_EXISTENT'}")`,
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.TRANSFORM: {
        const prev = transition.previousConditionRef || item?.currentConditionRef;
        if (!prev) {
          findings.push({
            code: EngineErrorCode.MISSING_PREDECESSOR,
            message: 'TRANSFORM transition requires a predecessor condition reference',
            severity: 'CRITICAL'
          });
        }
        if (!transition.currentConditionRef) {
          findings.push({
            code: EngineErrorCode.MISSING_CURRENT_CONDITION,
            message: 'TRANSFORM transition requires a successor condition reference',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.REPLACE: {
        const prev = transition.previousConditionRef || item?.currentConditionRef;
        if (!prev) {
          findings.push({
            code: EngineErrorCode.MISSING_PREDECESSOR,
            message: 'REPLACE transition requires a predecessor condition reference',
            severity: 'CRITICAL'
          });
        }
        if (!transition.currentConditionRef) {
          findings.push({
            code: EngineErrorCode.MISSING_CURRENT_CONDITION,
            message: 'REPLACE transition requires a replacement condition reference',
            severity: 'CRITICAL'
          });
        }
        break;
      }

      case TransitionType.UNRESOLVED:
      case TransitionType.UNKNOWN:
        // Preserved as-is without converting to other types
        break;
    }
  }

  /**
   * Validates temporal order between previous condition and transition effective time.
   */
  private static validateTemporalProgression(
    transition: Transition,
    item: ContinuityItem | undefined,
    findings: ContinuityFinding[]
  ): void {
    if (!transition.effectiveTime) {
      findings.push({
        code: EngineErrorCode.INVALID_EFFECTIVE_TIME,
        message: 'Transition must have an explicit effective time',
        severity: 'CRITICAL'
      });
      return;
    }

    const prevCondition = transition.previousConditionRef || item?.currentConditionRef;
    if (prevCondition && prevCondition.temporalValidity) {
      const prevEffective = EffectiveTime.create(prevCondition.temporalValidity);
      if (prevEffective) {
        const relation = prevEffective.compare(transition.effectiveTime);
        if (relation === TemporalRelation.AFTER) {
          findings.push({
            code: EngineErrorCode.TEMPORAL_CONFLICT,
            message: `Temporal inversion detected: previous condition time (${prevEffective.toString()}) is AFTER transition effective time (${transition.effectiveTime.toString()})`,
            severity: 'CRITICAL',
            details: { prevTime: prevEffective.toString(), transitionTime: transition.effectiveTime.toString() }
          });
        }
      }
    }
  }

  /**
   * Detects duplicate continuity candidates within a collection.
   */
  public static detectDuplicates(
    items: ContinuityItem[]
  ): ContinuityConflict[] {
    const conflicts: ContinuityConflict[] = [];
    const seen = new Map<string, ContinuityItem>();

    for (const item of items) {
      const key = `${item.identity.entityRef}::${item.identity.domainRef}`;
      const existing = seen.get(key);
      if (existing) {
        // Possible duplicate candidate
        conflicts.push({
          conflictId: `CONF-DUP-${item.identity.continuityId}-${existing.identity.continuityId}`,
          conflictType: 'DUPLICATE',
          description: `Duplicate continuity candidate detected: multiple items exist for entity "${item.identity.entityRef}" in domain "${item.identity.domainRef}"`,
          severity: 'WARNING',
          entities: [item.identity.entityRef],
          items: [item.identity.continuityId, existing.identity.continuityId]
        });
      } else {
        seen.set(key, item);
      }
    }

    return conflicts;
  }

  private static buildResult(
    transitionType: string,
    currentStatus: ContinuityStatus,
    targetStatus: ContinuityStatus,
    findings: ContinuityFinding[],
    affectedReferences: string[],
    startTime: number
  ): TransitionResult {
    const hasCritical = findings.some((f) => f.severity === 'CRITICAL');
    const hasError = findings.some((f) => f.severity === 'ERROR');
    const hasWarning = findings.some((f) => f.severity === 'WARNING');

    let status: TransitionResult['status'] = 'VALID';
    if (hasCritical) {
      status = findings.some((f) => f.code === EngineErrorCode.CONTINUITY_CONFLICT) ? 'CONFLICT' : 'INVALID';
    } else if (hasError) {
      status = 'INVALID';
    } else if (hasWarning) {
      status = 'REVIEW_REQUIRED';
    }

    const trace: ContinuityTrace = {
      operation: 'VALIDATE_TRANSITION',
      timestamp: startTime,
      continuityId: affectedReferences[0],
      details: { transitionType, currentStatus, targetStatus, findingCount: findings.length },
      success: !hasCritical && !hasError
    };

    return {
      status,
      transitionType,
      previousStatus: currentStatus,
      resultingStatus: hasCritical || hasError ? currentStatus : targetStatus,
      findings,
      trace,
      affectedReferences,
      allowed: !hasCritical && !hasError
    };
  }
}
