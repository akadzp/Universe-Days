import {
  RuntimeRule,
  RuleResult,
  RuleEvaluationStatus,
  RuleSeverity,
  RuleEvaluationTrace,
  ConditionTrace,
  RuleAction
} from '../../RULES/types.ts';
import { ExecutionContextData } from './execution-context.ts';
import { evaluateCondition } from './conditions.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export class RuleEvaluator {
  /**
   * Deterministically evaluates a single RuntimeRule against the provided ExecutionContextData.
   *
   * Flow:
   * 1. Check enabled -> if disabled, returns NOT_APPLICABLE.
   * 2. Check dependencies -> if any dependency is FAILED, BLOCKED, or ERROR, returns BLOCKED.
   * 3. Evaluate preconditions -> if unsatisfied, returns NOT_APPLICABLE.
   * 4. Evaluate main conditions -> records matched/failed condition traces.
   * 5. Check forbidden conditions -> if any forbidden condition matches, returns BLOCKED or FAILED.
   * 6. Formulate deterministic RuleResult and trace.
   */
  public static evaluate(
    rule: RuntimeRule,
    context: ExecutionContextData,
    dependencyResults: Record<string, RuleEvaluationStatus> = {}
  ): RuleResult {
    const startedAt = Date.now();
    const ruleId = String(rule.ruleId);
    const ruleVersion = rule.version;
    const severity = rule.severity || RuleSeverity.MEDIUM;

    const conditionTraces: ConditionTrace[] = [];
    const forbiddenConditionTraces: ConditionTrace[] = [];
    const matchedConditions: string[] = [];
    const failedConditions: string[] = [];
    const evaluatedDependencies: { dependencyId: string; status: RuleEvaluationStatus }[] = [];

    // Step 1: Check enabled
    if (!rule.enabled) {
      const trace: RuleEvaluationTrace = {
        ruleId,
        ruleVersion,
        startedAt,
        completedAt: Date.now(),
        evaluatedDependencies: [],
        preconditionsPassed: false,
        conditionTraces: [],
        forbiddenConditionTraces: [],
        executedActions: []
      };

      return {
        ruleId,
        ruleVersion,
        status: RuleEvaluationStatus.NOT_APPLICABLE,
        severity,
        matchedConditions: [],
        failedConditions: [],
        dependencyResults,
        trace,
        error: 'Rule is disabled'
      };
    }

    // Step 2: Check declared dependencies against provided dependencyResults
    const dependencies = rule.dependencies || [];
    let blockedByDependency = false;
    let blockingDependencyId = '';

    for (const dep of dependencies) {
      const depId = String(dep);
      const depStatus = dependencyResults[depId];
      evaluatedDependencies.push({ dependencyId: depId, status: depStatus || RuleEvaluationStatus.BLOCKED });

      if (depStatus !== RuleEvaluationStatus.PASSED) {
        blockedByDependency = true;
        blockingDependencyId = depId;
        break;
      }
    }

    if (blockedByDependency) {
      const trace: RuleEvaluationTrace = {
        ruleId,
        ruleVersion,
        startedAt,
        completedAt: Date.now(),
        evaluatedDependencies,
        preconditionsPassed: false,
        conditionTraces: [],
        forbiddenConditionTraces: [],
        executedActions: []
      };

      return {
        ruleId,
        ruleVersion,
        status: RuleEvaluationStatus.BLOCKED,
        severity,
        matchedConditions: [],
        failedConditions: [`Blocked by dependency: ${blockingDependencyId}`],
        dependencyResults,
        trace,
        error: `Dependency "${blockingDependencyId}" was not passed.`
      };
    }

    // Step 3: Evaluate preconditions
    const preconditions = rule.preconditions || [];
    for (let i = 0; i < preconditions.length; i++) {
      const precond = preconditions[i];
      const res = evaluateCondition(precond, context);
      conditionTraces.push(res.trace);
      if (!res.matched) {
        const trace: RuleEvaluationTrace = {
          ruleId,
          ruleVersion,
          startedAt,
          completedAt: Date.now(),
          evaluatedDependencies,
          preconditionsPassed: false,
          conditionTraces,
          forbiddenConditionTraces: [],
          executedActions: []
        };

        return {
          ruleId,
          ruleVersion,
          status: RuleEvaluationStatus.NOT_APPLICABLE,
          severity,
          matchedConditions,
          failedConditions: [`Precondition [${i}] unsatisfied: ${res.trace.reason || ''}`],
          dependencyResults,
          trace
        };
      }
    }

    // Step 4: Check forbidden conditions (if any forbidden condition matches, the rule is blocked/failed)
    const forbidden = rule.forbiddenConditions || [];
    for (let i = 0; i < forbidden.length; i++) {
      const fCond = forbidden[i];
      const fRes = evaluateCondition(fCond, context);
      forbiddenConditionTraces.push(fRes.trace);

      if (fRes.matched) {
        const trace: RuleEvaluationTrace = {
          ruleId,
          ruleVersion,
          startedAt,
          completedAt: Date.now(),
          evaluatedDependencies,
          preconditionsPassed: true,
          conditionTraces,
          forbiddenConditionTraces,
          executedActions: []
        };

        return {
          ruleId,
          ruleVersion,
          status: RuleEvaluationStatus.BLOCKED,
          severity,
          matchedConditions,
          failedConditions: [`Forbidden condition [${i}] matched: ${fRes.trace.reason || ''}`],
          dependencyResults,
          trace,
          error: `Forbidden condition [${i}] matched`
        };
      }
    }

    // Step 5: Evaluate primary conditions
    const conditions = rule.conditions || [];
    let allConditionsPassed = true;

    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const condRes = evaluateCondition(cond, context);
      conditionTraces.push(condRes.trace);

      if (condRes.matched) {
        matchedConditions.push(cond.description || `Condition [${i}] ${cond.operator} passed`);
      } else {
        allConditionsPassed = false;
        failedConditions.push(cond.description || `Condition [${i}] ${cond.operator} failed: ${condRes.trace.reason || ''}`);
      }
    }

    const finalStatus = allConditionsPassed ? RuleEvaluationStatus.PASSED : RuleEvaluationStatus.FAILED;
    const producedActions: RuleAction[] = finalStatus === RuleEvaluationStatus.PASSED ? [...(rule.actions || [])] : [];

    const trace: RuleEvaluationTrace = {
      ruleId,
      ruleVersion,
      startedAt,
      completedAt: Date.now(),
      evaluatedDependencies,
      preconditionsPassed: true,
      conditionTraces,
      forbiddenConditionTraces,
      executedActions: producedActions
    };

    return {
      ruleId,
      ruleVersion,
      status: finalStatus,
      severity,
      matchedConditions,
      failedConditions,
      dependencyResults,
      producedActions,
      trace
    };
  }
}
