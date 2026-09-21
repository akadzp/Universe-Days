/**
 * Phase 4: Continuity Chain and Graph Validation.
 * Validates ordered condition chains (A -> B -> C), branch graphs, and detects cycles/inversions.
 */

import { ConditionReference } from './condition-reference.ts';
import { Transition, TransitionType } from './transition.ts';
import { ContinuityValidationStatus, ContinuityFinding, ContinuityChainResult } from './result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { TemporalRelation } from '../../types/temporal.ts';

export interface ContinuityChainStep {
  fromCondition: ConditionReference;
  transition: Transition;
  toCondition: ConditionReference;
}

export class ContinuityChainValidator {
  /**
   * Validates a linear sequence of continuity chain steps:
   * Condition A -> Transition 1 -> Condition B -> Transition 2 -> Condition C ...
   */
  public static validateChain(
    steps: ContinuityChainStep[],
    chainId?: string
  ): ContinuityChainResult {
    if (!steps || steps.length === 0) {
      return {
        chainId,
        valid: true,
        status: 'VALID',
        nodes: [],
        transitions: [],
        findings: []
      };
    }

    const nodes: string[] = [];
    const transitions: string[] = [];
    const findings: ContinuityFinding[] = [];
    const visitedConditionIds = new Set<string>();

    let valid = true;
    let brokenAt: number | undefined;

    // Track first node
    nodes.push(steps[0].fromCondition.conditionId);
    visitedConditionIds.add(steps[0].fromCondition.conditionId);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      transitions.push(step.transition.type);

      // 1. Broken reference: toCondition of step i must match fromCondition of step i+1
      if (i > 0) {
        const prevStep = steps[i - 1];
        if (prevStep.toCondition.conditionId !== step.fromCondition.conditionId) {
          valid = false;
          brokenAt = i;
          findings.push({
            code: EngineErrorCode.CONTINUITY_CONFLICT,
            message: `Broken chain reference at step ${i}: expected fromCondition "${prevStep.toCondition.conditionId}", got "${step.fromCondition.conditionId}"`,
            severity: 'CRITICAL',
            details: { stepIndex: i, expected: prevStep.toCondition.conditionId, actual: step.fromCondition.conditionId }
          });
          break;
        }
      }

      // 2. Identity mismatch check across chain
      if (step.fromCondition.entityRef !== step.toCondition.entityRef) {
        if (step.transition.type !== TransitionType.TRANSFORM && step.transition.type !== TransitionType.REPLACE) {
          valid = false;
          brokenAt = i;
          findings.push({
            code: EngineErrorCode.INVALID_CONTINUITY_IDENTITY,
            message: `Entity mismatch in chain step ${i}: "${step.fromCondition.entityRef}" vs "${step.toCondition.entityRef}" without TRANSFORM or REPLACE transition`,
            severity: 'CRITICAL',
            details: { stepIndex: i, fromEntity: step.fromCondition.entityRef, toEntity: step.toCondition.entityRef }
          });
        }
      }

      // 3. Circular reference check
      if (visitedConditionIds.has(step.toCondition.conditionId)) {
        valid = false;
        brokenAt = i;
        findings.push({
          code: EngineErrorCode.CIRCULAR_CONTINUITY,
          message: `Circular reference detected in chain: condition "${step.toCondition.conditionId}" already appeared earlier in the sequence`,
          severity: 'CRITICAL',
          details: { stepIndex: i, conditionId: step.toCondition.conditionId }
        });
        break;
      }

      // 4. Temporal progression check using EffectiveTime compare
      if (i > 0) {
        const prevTime = steps[i - 1].transition.effectiveTime;
        const currTime = step.transition.effectiveTime;
        if (prevTime && currTime) {
          const relation = prevTime.compare(currTime);
          if (relation === TemporalRelation.AFTER) {
            valid = false;
            brokenAt = i;
            findings.push({
              code: EngineErrorCode.TEMPORAL_CONFLICT,
              message: `Temporal inversion in chain step ${i}: transition time (${currTime.toString()}) is earlier than previous step (${prevTime.toString()})`,
              severity: 'CRITICAL',
              details: { stepIndex: i, prevTime: prevTime.toString(), currTime: currTime.toString() }
            });
          }
        }
      }

      visitedConditionIds.add(step.toCondition.conditionId);
      nodes.push(step.toCondition.conditionId);
    }

    const status: ContinuityValidationStatus = valid
      ? 'VALID'
      : findings.some((f) => f.severity === 'CRITICAL')
        ? 'CONFLICT'
        : 'INVALID';

    return {
      chainId,
      valid,
      status,
      nodes,
      transitions,
      brokenAt,
      findings
    };
  }

  /**
   * Validates a branching graph of conditions and transitions, detecting cycles.
   */
  public static validateGraph(
    edges: { from: string; to: string; transitionType: string }[]
  ): { valid: boolean; cycles: string[][]; findings: ContinuityFinding[] } {
    const adj = new Map<string, string[]>();
    const findings: ContinuityFinding[] = [];

    for (const edge of edges) {
      const list = adj.get(edge.from) || [];
      list.push(edge.to);
      adj.set(edge.from, list);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cyclePath = [...path, neighbor];
          cycles.push(cyclePath);
          findings.push({
            code: EngineErrorCode.CIRCULAR_CONTINUITY,
            message: `Circular dependency detected in graph: ${cyclePath.join(' -> ')}`,
            severity: 'CRITICAL',
            details: { cycle: cyclePath }
          });
        }
      }

      recursionStack.delete(node);
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return {
      valid: cycles.length === 0,
      cycles,
      findings
    };
  }
}
