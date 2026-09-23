/**
 * Binary rule layer for Character indicators.
 *
 * Rules read indicators only. They never mutate Character, State, Behavior,
 * Style, or any other domain. Missing/unknown values are not interpreted as
 * FALSE; evaluation therefore uses TRUE / FALSE / UNKNOWN.
 */
import { CharacterIndicator } from './indicator.ts';

export type CharacterBinaryRuleResult = 'TRUE' | 'FALSE' | 'UNKNOWN';
export type CharacterBinaryOperator = 'IS_TRUE' | 'IS_FALSE' | 'IS_UNKNOWN';
export type CharacterRuleLogicalOperator = 'ALL' | 'ANY' | 'NOT';

export interface CharacterBinaryPredicate {
  readonly indicatorKey: string;
  readonly operator: CharacterBinaryOperator;
}

export interface CharacterBinaryRule {
  readonly ruleId: string;
  readonly description: string;
  readonly predicates: readonly CharacterBinaryPredicate[];
  readonly logicalOperator?: CharacterRuleLogicalOperator;
  readonly enabled: boolean;
}

export interface CharacterBinaryRuleEvaluation {
  readonly ruleId: string;
  readonly result: CharacterBinaryRuleResult;
  readonly matchedPredicates: readonly string[];
  readonly unknownPredicates: readonly string[];
}

/**
 * Evaluates a binary predicate without mutating any domain object.
 */
export function evaluateCharacterBinaryPredicate(
  indicator: CharacterIndicator | undefined,
  predicate: CharacterBinaryPredicate
): CharacterBinaryRuleResult {
  if (!indicator) return 'UNKNOWN';
  if (indicator.type !== 'BOOLEAN') return 'UNKNOWN';

  switch (predicate.operator) {
    case 'IS_TRUE':
      return indicator.current === true ? 'TRUE' : 'FALSE';
    case 'IS_FALSE':
      return indicator.current === false ? 'TRUE' : 'FALSE';
    case 'IS_UNKNOWN':
      return 'FALSE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Evaluates a rule using three-valued logic so absence is never silently
 * converted into FALSE.
 */
export function evaluateCharacterBinaryRule(
  rule: CharacterBinaryRule,
  indicators: readonly CharacterIndicator[]
): CharacterBinaryRuleEvaluation {
  if (!rule.enabled || rule.predicates.length === 0) {
    return Object.freeze({
      ruleId: rule.ruleId,
      result: 'UNKNOWN',
      matchedPredicates: Object.freeze([]),
      unknownPredicates: Object.freeze([])
    });
  }

  const byKey = new Map(indicators.map((indicator) => [indicator.key, indicator]));
  const results = rule.predicates.map((predicate) => ({
    key: predicate.indicatorKey,
    result: evaluateCharacterBinaryPredicate(byKey.get(predicate.indicatorKey), predicate)
  }));

  const matched = results.filter((item) => item.result === 'TRUE').map((item) => item.key);
  const unknown = results.filter((item) => item.result === 'UNKNOWN').map((item) => item.key);
  const operator = rule.logicalOperator ?? 'ALL';

  let result: CharacterBinaryRuleResult;
  if (operator === 'NOT') {
    if (results.length !== 1 || results[0].result === 'UNKNOWN') result = 'UNKNOWN';
    else result = results[0].result === 'TRUE' ? 'FALSE' : 'TRUE';
  } else if (operator === 'ANY') {
    result = results.some((item) => item.result === 'TRUE')
      ? 'TRUE'
      : unknown.length > 0 ? 'UNKNOWN' : 'FALSE';
  } else {
    result = results.every((item) => item.result === 'TRUE')
      ? 'TRUE'
      : results.some((item) => item.result === 'FALSE') ? 'FALSE' : 'UNKNOWN';
  }

  return Object.freeze({
    ruleId: rule.ruleId,
    result,
    matchedPredicates: Object.freeze(matched),
    unknownPredicates: Object.freeze(unknown)
  });
}
