/**
 * Phase 4: Continuity Dependencies.
 * Explicit generic dependencies supporting items, conditions, temporal constraints, and validation rules.
 */

import { ContinuityStatus } from './continuity-model.ts';
import { ContinuitySeverity, ContinuityFinding, ContinuityValidationStatus } from './result.ts';
import { TemporalConstraint } from '../../types/temporal.ts';
import { TemporalQueryAPI } from '../../temporal/index.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export type ContinuityDependencyType =
  | 'CONTINUITY_ITEM'
  | 'CONDITION'
  | 'TEMPORAL_CONSTRAINT'
  | 'VALIDATION_RULE';

export interface ContinuityDependency {
  dependencyId?: string;
  type: ContinuityDependencyType;
  targetId: string;
  expectedStatus?: ContinuityStatus | string;
  temporalConstraint?: TemporalConstraint;
  severity?: ContinuitySeverity;
  description?: string;
}

export interface DependencyEvaluationResult {
  satisfied: boolean;
  status: ContinuityValidationStatus;
  findings: ContinuityFinding[];
}

export class ContinuityDependencyEvaluator {
  /**
   * Evaluates a list of dependencies for a continuity operation.
   * If any critical or error dependency fails, the operation is BLOCKED.
   * If a warning dependency fails, REVIEW_REQUIRED is returned.
   */
  public static evaluateAll(
    dependencies: ContinuityDependency[] | undefined,
    context: {
      items?: Map<string, { status: ContinuityStatus; entityRef?: string }>;
      conditions?: Map<string, unknown>;
      clock?: unknown;
    } = {}
  ): DependencyEvaluationResult {
    if (!dependencies || dependencies.length === 0) {
      return {
        satisfied: true,
        status: 'VALID',
        findings: []
      };
    }

    const findings: ContinuityFinding[] = [];
    let isBlocked = false;
    let reviewRequired = false;

    // Detect circular dependencies within the dependency list itself
    const visited = new Set<string>();
    for (const dep of dependencies) {
      const depKey = `${dep.type}:${dep.targetId}`;
      if (visited.has(depKey)) {
        findings.push({
          code: EngineErrorCode.CIRCULAR_DEPENDENCY,
          message: `Duplicate / circular dependency reference detected for target "${dep.targetId}"`,
          severity: 'CRITICAL',
          details: { targetId: dep.targetId }
        });
        isBlocked = true;
      }
      visited.add(depKey);
    }

    for (const dep of dependencies) {
      const severity: ContinuitySeverity = dep.severity || 'CRITICAL';

      switch (dep.type) {
        case 'CONTINUITY_ITEM': {
          const item = context.items?.get(dep.targetId);
          if (!item) {
            findings.push({
              code: EngineErrorCode.MISSING_DEPENDENCY,
              message: `Required continuity item dependency "${dep.targetId}" not found`,
              severity,
              details: { targetId: dep.targetId }
            });
            if (severity === 'CRITICAL' || severity === 'ERROR') isBlocked = true;
            else reviewRequired = true;
          } else if (dep.expectedStatus && item.status !== dep.expectedStatus) {
            findings.push({
              code: EngineErrorCode.DEPENDENCY_FAILED,
              message: `Continuity item "${dep.targetId}" has status "${item.status}", expected "${dep.expectedStatus}"`,
              severity,
              details: { targetId: dep.targetId, actual: item.status, expected: dep.expectedStatus }
            });
            if (severity === 'CRITICAL' || severity === 'ERROR') isBlocked = true;
            else reviewRequired = true;
          }
          break;
        }

        case 'CONDITION': {
          const cond = context.conditions?.get(dep.targetId);
          if (!cond) {
            findings.push({
              code: EngineErrorCode.MISSING_DEPENDENCY,
              message: `Required condition dependency "${dep.targetId}" not found`,
              severity,
              details: { targetId: dep.targetId }
            });
            if (severity === 'CRITICAL' || severity === 'ERROR') isBlocked = true;
            else reviewRequired = true;
          }
          break;
        }

        case 'TEMPORAL_CONSTRAINT': {
          if (dep.temporalConstraint) {
            const constraintResult = TemporalQueryAPI.validateTemporalConstraint(dep.temporalConstraint, {
              clock: context.clock as any
            });
            if (!constraintResult.satisfied) {
              findings.push({
                code: EngineErrorCode.TEMPORAL_CONSTRAINT_VIOLATION,
                message: `Temporal constraint dependency failed: ${constraintResult.reason || 'constraint not satisfied'}`,
                severity,
                details: { constraint: dep.temporalConstraint, constraintResult }
              });
              if (severity === 'CRITICAL' || severity === 'ERROR') isBlocked = true;
              else reviewRequired = true;
            }
          }
          break;
        }

        case 'VALIDATION_RULE':
          // Evaluated externally or via rule engine
          break;
      }
    }

    if (isBlocked) {
      return {
        satisfied: false,
        status: 'BLOCKED',
        findings
      };
    }

    if (reviewRequired) {
      return {
        satisfied: false,
        status: 'REVIEW_REQUIRED',
        findings
      };
    }

    return {
      satisfied: true,
      status: 'VALID',
      findings
    };
  }
}
