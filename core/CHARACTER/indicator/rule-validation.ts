/** Validates binary character rules without executing or mutating them. */
import { CharacterBinaryRule } from './rules.ts';

export interface CharacterRuleValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterRuleValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterRuleValidationIssue[];
}

export function validateCharacterBinaryRule(rule: CharacterBinaryRule): CharacterRuleValidationReport {
  const issues: CharacterRuleValidationIssue[] = [];
  if (!rule.ruleId.trim()) issues.push({ code: 'MISSING_RULE_ID', path: 'ruleId', message: 'ruleId is required.' });
  if (!rule.description.trim()) issues.push({ code: 'MISSING_RULE_DESCRIPTION', path: 'description', message: 'description is required.' });
  if (rule.predicates.length === 0) issues.push({ code: 'EMPTY_RULE', path: 'predicates', message: 'At least one predicate is required.' });
  if (rule.logicalOperator === 'NOT' && rule.predicates.length !== 1) {
    issues.push({ code: 'NOT_REQUIRES_ONE_PREDICATE', path: 'predicates', message: 'NOT rules require exactly one predicate.' });
  }
  for (const [index, predicate] of rule.predicates.entries()) {
    if (!predicate.indicatorKey.trim()) issues.push({ code: 'MISSING_INDICATOR_KEY', path: `predicates[${index}].indicatorKey`, message: 'indicatorKey is required.' });
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}
