/**
 * Phase 9: Rule & Gate Engine Integration
 *
 * Connects the Engine with Phase 2 RuleRouter, RuleEvaluator, and GateEngine.
 * Enforces context minimization so only relevant rules are evaluated.
 */

import { DomainID, RuleID } from '../types/identifiers.ts';
import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { RuleRegistryEngine } from './rule-engine.ts';
import { RuleRouter } from './rule-router.ts';
import { RuleEvaluator } from './rule-evaluator.ts';
import { GateEngine } from './gate-engine.ts';
import {
  RuntimeRule,
  RuleResult,
  RuleEvaluationStatus,
  GateDefinition,
  GateResult,
  GateMode
} from '../types/rules.ts';
import { ExecutionContext } from './context.ts';

export interface EvaluatedGateOutcome {
  passed: boolean;
  blocked: boolean;
  failedRuleIds: string[];
  blockedRuleIds: string[];
  ruleResults: Record<string, RuleResult>;
  summary: string;
}

export class EngineRuleIntegration {
  private router: RuleRouter;

  constructor(private ruleRegistry: RuleRegistryEngine) {
    this.router = new RuleRouter(ruleRegistry);
  }

  /**
   * Minimizes and loads relevant rules for the given task and domains.
   */
  public resolveRelevantRules(
    taskId: string,
    requiredDomains: (DomainID | string)[],
    specificRuleIds?: (RuleID | string)[]
  ): RuntimeRule[] {
    const routeRes = this.router.resolveRulesForTask({
      taskId,
      requiredDomains,
      requiredRuleIds: specificRuleIds,
      includeDependencies: true
    });

    return routeRes.selectedRules;
  }

  /**
   * Evaluates relevant rules against the scoped execution context and runs gate reduction.
   */
  public evaluateRulesAndGate(
    ctx: ExecutionContext,
    gateDefinition?: GateDefinition
  ): Result<EvaluatedGateOutcome> {
    const evalContextData = ctx.toRuleEvaluationContext();
    const ruleResults: Record<string, RuleResult> = {};
    const failedRuleIds: string[] = [];
    const blockedRuleIds: string[] = [];

    for (const rule of ctx.relevantRules) {
      if (!rule.enabled) continue;

      const evalRes = RuleEvaluator.evaluate(rule, evalContextData as any);
      ruleResults[String(rule.ruleId)] = evalRes;

      if (evalRes.status === RuleEvaluationStatus.FAILED) {
        failedRuleIds.push(String(rule.ruleId));
      } else if (evalRes.status === RuleEvaluationStatus.BLOCKED) {
        blockedRuleIds.push(String(rule.ruleId));
      }
    }

    // Default gate evaluates ALL loaded rules if no custom gate supplied
    const effectiveGate: GateDefinition = gateDefinition ?? {
      gateId: `GATE_${ctx.executionId}`,
      mode: GateMode.ALL,
      ruleIds: ctx.relevantRules.filter(r => r.enabled).map(r => String(r.ruleId)),
      description: 'Default execution gate evaluating all resolved rules'
    };

    let gateRes: GateResult;
    if (effectiveGate.ruleIds.length === 0) {
      // Empty rules pass by default
      gateRes = {
        gateId: effectiveGate.gateId,
        passed: true,
        evaluatedRuleResults: {},
        summary: 'No active rules required for execution; gate automatically passed.'
      };
    } else {
      gateRes = GateEngine.evaluateGate(effectiveGate, ruleResults);
    }

    const outcome: EvaluatedGateOutcome = {
      passed: gateRes.passed,
      blocked: blockedRuleIds.length > 0,
      failedRuleIds,
      blockedRuleIds,
      ruleResults,
      summary: gateRes.summary
    };

    ctx.tracer.record({
      stepId: 'GATE_EVALUATION',
      action: 'EVALUATE_RULES_AND_GATE',
      resultStatus: outcome.passed ? 'PASSED' : (outcome.blocked ? 'BLOCKED' : 'FAILED'),
      ruleRefs: Object.keys(ruleResults),
      details: {
        summary: outcome.summary,
        failedRuleCount: failedRuleIds.length,
        blockedRuleCount: blockedRuleIds.length
      }
    });

    if (outcome.blocked) {
      return blocked(
        EngineErrorCode.GATE_REJECTED,
        `Execution blocked by gate: ${outcome.summary}`
      );
    }

    if (!outcome.passed) {
      return failure(
        EngineErrorCode.GATE_REJECTED,
        `Execution gate failed: ${outcome.summary}`
      );
    }

    return success(outcome);
  }
}
