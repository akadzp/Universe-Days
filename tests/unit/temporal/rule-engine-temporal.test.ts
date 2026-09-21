import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RuleEvaluator } from '../../../core/engine/rule-evaluator.ts';
import { RuleRegistry } from '../../../core/engine/rule-engine.ts';
import { RuleRouter } from '../../../core/engine/rule-router.ts';
import {
  RuntimeRule,
  RuleType,
  RuleSeverity,
  RuleEvaluationStatus,
  ConditionOperator,
  ActionType
} from '../../../core/types/rules.ts';
import { ExecutionContextData } from '../../../core/types/execution-context.ts';
import { UniverseClock } from '../../../core/temporal/clock.ts';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TemporalPositionClassifier } from '../../../core/temporal/position.ts';
import { TemporalPosition, TemporalRelation } from '../../../core/types/temporal.ts';
import { TemporalRelationEngine } from '../../../core/temporal/relations.ts';

describe('Phase 3 - Rule Engine Temporal Integration Tests', () => {
  it('1. Evaluates temporal condition (target position is PAST) in RuleEvaluator', () => {
    const clock = UniverseClock.create(TimePoint.parse('2024-06-01T12:00:00Z').data!).data!;
    const eventTime = TimePoint.parse('2024-05-15T00:00:00Z').data!;
    const posResult = TemporalPositionClassifier.classify(eventTime, clock);

    assert.strictEqual(posResult.position, TemporalPosition.PAST);

    const context: ExecutionContextData = {
      flags: {},
      enums: {
        temporalPosition: posResult.position
      },
      values: {
        eventTime: eventTime.toCanonical(),
        clockTime: clock.readCurrentTime().toCanonical()
      },
      references: [],
      constraints: [],
      metadata: {}
    };

    const pastRule: RuntimeRule = {
      ruleId: 'RULE-TEMPORAL-PAST-1',
      version: '1.0.0',
      owner: 'TEMPORAL_SYSTEM',
      domain: 'TEMPORAL',
      type: RuleType.DETERMINISTIC,
      severity: RuleSeverity.MEDIUM,
      enabled: true,
      conditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'enums.temporalPosition',
          value: 'PAST'
        }
      ],
      actions: [
        {
          type: ActionType.EMIT_EVENT,
          target: 'EVENT_PAST_VERIFIED',
          value: { verified: true },
          description: 'Verified that the target event occurred in the past'
        }
      ]
    };

    const evalResult = RuleEvaluator.evaluate(pastRule, context);
    assert.strictEqual(evalResult.status, RuleEvaluationStatus.PASSED);
    assert.ok(evalResult.producedActions);
    assert.strictEqual(evalResult.producedActions.length, 1);
    assert.strictEqual(evalResult.producedActions[0].type, ActionType.EMIT_EVENT);
  });

  it('2. Routes and evaluates temporal sequence rule via RuleRegistry and RuleRouter', () => {
    const registry = new RuleRegistry();
    const router = new RuleRouter(registry);

    const rule: RuntimeRule = {
      ruleId: 'RULE-CHRONOLOGY-CHECK',
      version: '1.0.0',
      owner: 'TEMPORAL_SYSTEM',
      domain: 'TEMPORAL',
      type: RuleType.VALIDATION,
      severity: RuleSeverity.CRITICAL,
      enabled: true,
      conditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'enums.relation',
          value: 'BEFORE'
        }
      ],
      actions: [
        {
          type: ActionType.SET_FLAG,
          target: 'CHRONOLOGY_CONFIRMED',
          value: true
        }
      ]
    };

    registry.register(rule);
    const routingResult = router.resolveRulesForTask({
      taskId: 'TASK-TEMPORAL-AUDIT',
      requiredDomains: ['TEMPORAL']
    });

    assert.strictEqual(routingResult.selectedRules.length, 1);
    assert.strictEqual(routingResult.selectedRules[0].ruleId, 'RULE-CHRONOLOGY-CHECK');

    const t1 = TimePoint.parse('2024-01-01').data!;
    const t2 = TimePoint.parse('2024-02-01').data!;
    const rel = TemporalRelationEngine.compareTimePoints(t1, t2);
    assert.strictEqual(rel, TemporalRelation.BEFORE);

    const context: ExecutionContextData = {
      flags: {},
      enums: {
        relation: rel
      },
      values: {},
      references: [],
      constraints: [],
      metadata: {}
    };

    const result = RuleEvaluator.evaluate(routingResult.selectedRules[0], context);
    assert.strictEqual(result.status, RuleEvaluationStatus.PASSED);
  });
});
