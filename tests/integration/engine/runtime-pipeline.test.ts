import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RuleRegistryEngine } from '../../../core/engine/rule-engine.ts';
import { RuleRouter } from '../../../core/engine/rule-router.ts';
import { ContextBuilder } from '../../../core/engine/context-builder.ts';
import { RuleEvaluator } from '../../../core/engine/rule-evaluator.ts';
import { GateEngine } from '../../../core/engine/gate-engine.ts';
import { GenericStateMachine } from '../../../core/engine/state-machine.ts';
import { BooleanStateManager } from '../../../core/engine/state/boolean-state.ts';
import { EnumStateManager } from '../../../core/engine/state/enum-state.ts';
import {
  RuntimeRule,
  RuleType,
  RuleSeverity,
  ConditionOperator,
  ActionType,
  GateMode,
  RuleEvaluationStatus
} from '../../../core/types/rules.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Phase 2 Integration - Full Deterministic Rule Runtime Pipeline', () => {
  it('Executes Task -> Router -> Registry -> Evaluator -> Gate -> State Transition seamlessly', () => {
    // 1. Initialize Registry and register rules
    const registry = new RuleRegistryEngine();

    // Base Rule: Validates temporal continuity
    const ruleTemporal: RuntimeRule = {
      ruleId: 'RULE-TEMPORAL-CHECK',
      version: '1.0.0',
      owner: 'TEMPORAL_SYSTEM',
      domain: 'TEMPORAL',
      type: RuleType.VALIDATION,
      enabled: true,
      conditions: [
        {
          operator: ConditionOperator.GTE,
          field: 'values.currentCycle',
          value: 1,
          description: 'Current cycle must be at least 1'
        }
      ],
      actions: [
        {
          type: ActionType.SET_FLAG,
          target: 'TEMPORAL_VALID',
          value: true
        }
      ],
      severity: RuleSeverity.CRITICAL
    };

    // Dependent Rule: Validates state integrity (depends on RULE-TEMPORAL-CHECK)
    const ruleStateIntegrity: RuntimeRule = {
      ruleId: 'RULE-STATE-INTEGRITY',
      version: '1.0.0',
      owner: 'STATE_SYSTEM',
      domain: 'STATE',
      type: RuleType.DETERMINISTIC,
      enabled: true,
      dependencies: ['RULE-TEMPORAL-CHECK'],
      conditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'enums.SYSTEM_STATUS',
          value: 'ACTIVE'
        },
        {
          operator: ConditionOperator.EQ,
          field: 'flags.HAS_CORRUPTION',
          value: false
        }
      ],
      actions: [
        {
          type: ActionType.SET_FLAG,
          target: 'STATE_VERIFIED',
          value: true
        }
      ],
      severity: RuleSeverity.HIGH
    };

    registry.register(ruleTemporal);
    registry.register(ruleStateIntegrity);

    // 2. Route rules for task requiring STATE domain
    const router = new RuleRouter(registry);
    const routing = router.resolveRulesForTask({
      taskId: 'TASK-VERIFY-001',
      requiredDomains: ['STATE'],
      includeDependencies: true
    });

    assert.strictEqual(routing.selectedRules.length, 2);
    // Dependency must be first in topological ordering
    assert.strictEqual(routing.selectedRules[0].ruleId, 'RULE-TEMPORAL-CHECK');
    assert.strictEqual(routing.selectedRules[1].ruleId, 'RULE-STATE-INTEGRITY');

    // 3. Build Execution Context
    const boolState = new BooleanStateManager();
    boolState.setFlag('HAS_CORRUPTION', false);

    const enumState = new EnumStateManager();
    enumState.registerEnum({
      name: 'SYSTEM_STATUS',
      allowedValues: ['INITIALIZING', 'ACTIVE', 'SHUTDOWN'],
      defaultValue: 'ACTIVE'
    });

    const contextBuilder = new ContextBuilder();
    contextBuilder.setTask(routing.taskId)
      .setActiveRules(routing.resolvedRuleIds)
      .setFlags(boolState.toRecord())
      .setEnums(enumState.toRecord())
      .setValue('currentCycle', 3);

    const execContext = contextBuilder.toExecutionContextData();

    // 4. Sequentially evaluate rules in topological order
    const evaluationResults: Record<string, any> = {};

    for (const rule of routing.selectedRules) {
      const depResults: Record<string, RuleEvaluationStatus> = {};
      for (const dep of rule.dependencies || []) {
        depResults[String(dep)] = evaluationResults[String(dep)]?.status || RuleEvaluationStatus.BLOCKED;
      }

      const res = RuleEvaluator.evaluate(rule, execContext, depResults);
      evaluationResults[String(rule.ruleId)] = res;

      // Apply any produced actions to the boolean state
      if (res.status === RuleEvaluationStatus.PASSED && res.producedActions) {
        for (const action of res.producedActions) {
          if (action.type === ActionType.SET_FLAG) {
            boolState.setFlag(action.target, action.value as boolean);
          }
        }
      }
    }

    assert.strictEqual(evaluationResults['RULE-TEMPORAL-CHECK'].status, RuleEvaluationStatus.PASSED);
    assert.strictEqual(evaluationResults['RULE-STATE-INTEGRITY'].status, RuleEvaluationStatus.PASSED);
    assert.strictEqual(boolState.getFlag('TEMPORAL_VALID'), true);
    assert.strictEqual(boolState.getFlag('STATE_VERIFIED'), true);

    // 5. Evaluate Gate [ALL]
    const gateResult = GateEngine.evaluateGate(
      {
        gateId: 'GATE-COMMIT-PERMIT',
        mode: GateMode.ALL,
        ruleIds: ['RULE-TEMPORAL-CHECK', 'RULE-STATE-INTEGRITY']
      },
      evaluationResults
    );

    assert.strictEqual(gateResult.passed, true);
    assert.strictEqual(gateResult.passedCount, 2);

    // 6. Drive State Machine transition using Gate outcome
    type SystemLifecycle = 'EVALUATING' | 'COMMITTED' | 'REJECTED';
    const machine = new GenericStateMachine<SystemLifecycle>('EVALUATING');
    machine.addTransition(
      'EVALUATING',
      'COMMITTED',
      'COMMIT',
      undefined,
      (payload?: any) => payload?.gatePassed === true
    );

    const transitionRes = machine.transition('COMMITTED', { gatePassed: gateResult.passed });
    assert.strictEqual(transitionRes.status, ResultStatus.SUCCESS);
    assert.strictEqual(machine.getCurrentState(), 'COMMITTED');
    assert.strictEqual(machine.getHistory().length, 1);
  });
});
