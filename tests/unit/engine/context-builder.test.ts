import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContextBuilder } from '../../../core/engine/context-builder.ts';
import { makeEntityID } from '../../../core/types/identifiers.ts';

describe('Phase 2 - Context Builder & Compact Representation', () => {
  it('1. Constructs compact runtime context without unnecessary document bloat', () => {
    const builder = new ContextBuilder();
    builder.setTask('TASK-CYCLE-01')
      .setActiveRules(['RULE-ARCH-001', 'RULE-ARCH-002'])
      .setFlag('READY', true)
      .setEnum('CYCLE_STAGE', 'EXECUTION')
      .setValue('cycleIndex', 5)
      .setEntityReferences([makeEntityID('ENT-01')])
      .addConstraint('NON_RETROGRADE_PROGRESSION');

    const compact = builder.buildCompactContext();

    assert.strictEqual(compact.task, 'TASK-CYCLE-01');
    assert.deepStrictEqual(compact.activeRuleIds, ['RULE-ARCH-001', 'RULE-ARCH-002']);
    assert.strictEqual(compact.requiredFlags['READY'], true);
    assert.strictEqual(compact.enumValues['CYCLE_STAGE'], 'EXECUTION');
    assert.strictEqual(compact.stateValues['cycleIndex'], 5);
    assert.deepStrictEqual(compact.constraints, ['NON_RETROGRADE_PROGRESSION']);
  });

  it('2. Transforms cleanly to ExecutionContextData for RuleEvaluator', () => {
    const builder = new ContextBuilder();
    builder.setFlag('IS_VALID', true)
      .setEnum('STATUS', 'ACTIVE')
      .setValue('totalCount', 100);

    const execData = builder.toExecutionContextData();

    assert.strictEqual(execData.flags['IS_VALID'], true);
    assert.strictEqual(execData.enums['STATUS'], 'ACTIVE');
    assert.strictEqual(execData.values['totalCount'], 100);
  });
});
