import {
  GateDefinition,
  GateResult,
  GateMode,
  RuleResult,
  RuleEvaluationStatus
} from '../types/rules.ts';

export class GateEngine {
  /**
   * Evaluates a gate definition across a dictionary of rule results.
   * Deterministic logical reduction.
   */
  public static evaluateGate(
    gate: GateDefinition,
    ruleResults: Record<string, RuleResult>
  ): GateResult {
    const relevantRuleIds = gate.ruleIds.map(String);
    let passedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    const relevantResults: Record<string, RuleResult> = {};

    for (const ruleId of relevantRuleIds) {
      const result = ruleResults[ruleId];
      if (result) {
        relevantResults[ruleId] = result;
        if (result.status === RuleEvaluationStatus.PASSED) {
          passedCount++;
        } else if (result.status === RuleEvaluationStatus.BLOCKED) {
          blockedCount++;
        } else if (result.status === RuleEvaluationStatus.FAILED) {
          failedCount++;
        }
      } else {
        // Missing rule result treated as blocked/failed
        blockedCount++;
      }
    }

    const totalRules = relevantRuleIds.length;
    let passed = false;
    let summary = '';

    switch (gate.mode) {
      case GateMode.ALL:
        passed = totalRules > 0 && passedCount === totalRules && blockedCount === 0 && failedCount === 0;
        summary = passed
          ? `Gate [ALL] passed: All ${totalRules} rules passed.`
          : `Gate [ALL] failed: ${passedCount}/${totalRules} passed, ${failedCount} failed, ${blockedCount} blocked.`;
        break;

      case GateMode.ANY:
        passed = passedCount > 0;
        summary = passed
          ? `Gate [ANY] passed: ${passedCount} rules passed.`
          : `Gate [ANY] failed: 0 rules passed out of ${totalRules}.`;
        break;

      case GateMode.NONE:
        passed = passedCount === 0;
        summary = passed
          ? `Gate [NONE] passed: No rules passed.`
          : `Gate [NONE] failed: ${passedCount} rules passed unexpectedly.`;
        break;

      default:
        passed = false;
        summary = `Unknown gate mode "${gate.mode}".`;
    }

    return {
      gateId: gate.gateId,
      mode: gate.mode,
      passed,
      totalRules,
      passedCount,
      failedCount,
      blockedCount,
      ruleResults: relevantResults,
      summary
    };
  }
}
