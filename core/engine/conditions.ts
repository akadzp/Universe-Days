import { Condition, ConditionOperator, ConditionTrace } from '../types/rules.ts';
import { ExecutionContextData } from '../types/execution-context.ts';
import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';

export interface ConditionEvaluationResult {
  matched: boolean;
  trace: ConditionTrace;
  error?: string;
}

/**
 * Resolves a dot-delimited path from a context object.
 * e.g., 'flags.ACTIVE', 'values.temperature', 'enums.STATE'
 */
export function resolveContextPath(context: ExecutionContextData | Record<string, unknown>, path?: string): unknown {
  if (!path || typeof path !== 'string') return undefined;

  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Evaluates a single condition or composite condition tree against the given execution context.
 * Strictly deterministic; no LLM, random state, or implicit coercion.
 */
export function evaluateCondition(
  condition: Condition,
  context: ExecutionContextData
): ConditionEvaluationResult {
  if (!condition || !condition.operator) {
    return {
      matched: false,
      trace: {
        operator: condition?.operator || ('' as ConditionOperator),
        matched: false,
        reason: 'Condition is undefined or missing operator'
      },
      error: EngineErrorCode.INVALID_CONDITION
    };
  }

  switch (condition.operator) {
    case ConditionOperator.AND: {
      if (!Array.isArray(condition.children) || condition.children.length === 0) {
        return {
          matched: true,
          trace: {
            operator: ConditionOperator.AND,
            matched: true,
            reason: 'Empty AND condition vacuously true'
          }
        };
      }
      for (const child of condition.children) {
        const res = evaluateCondition(child, context);
        if (!res.matched) {
          return {
            matched: false,
            trace: {
              operator: ConditionOperator.AND,
              matched: false,
              reason: `Child condition failed: ${res.trace.reason || res.trace.field || ''}`
            }
          };
        }
      }
      return {
        matched: true,
        trace: {
          operator: ConditionOperator.AND,
          matched: true,
          reason: 'All AND child conditions matched'
        }
      };
    }

    case ConditionOperator.OR: {
      if (!Array.isArray(condition.children) || condition.children.length === 0) {
        return {
          matched: false,
          trace: {
            operator: ConditionOperator.OR,
            matched: false,
            reason: 'Empty OR condition has no matching branches'
          }
        };
      }
      for (const child of condition.children) {
        const res = evaluateCondition(child, context);
        if (res.matched) {
          return {
            matched: true,
            trace: {
              operator: ConditionOperator.OR,
              matched: true,
              reason: 'At least one OR child condition matched'
            }
          };
        }
      }
      return {
        matched: false,
        trace: {
          operator: ConditionOperator.OR,
          matched: false,
          reason: 'None of the OR child conditions matched'
        }
      };
    }

    case ConditionOperator.NOT: {
      if (!Array.isArray(condition.children) || condition.children.length === 0) {
        return {
          matched: false,
          trace: {
            operator: ConditionOperator.NOT,
            matched: false,
            reason: 'NOT operator requires exactly one child condition'
          },
          error: EngineErrorCode.INVALID_CONDITION
        };
      }
      const childRes = evaluateCondition(condition.children[0], context);
      const inverted = !childRes.matched;
      return {
        matched: inverted,
        trace: {
          operator: ConditionOperator.NOT,
          matched: inverted,
          reason: `NOT inverted child result: child was ${childRes.matched}`
        }
      };
    }

    case ConditionOperator.EXISTS: {
      const actual = resolveContextPath(context, condition.field);
      const exists = actual !== undefined && actual !== null;
      return {
        matched: exists,
        trace: {
          operator: ConditionOperator.EXISTS,
          field: condition.field,
          actual,
          matched: exists,
          reason: exists ? `Field ${condition.field} exists` : `Field ${condition.field} does not exist`
        }
      };
    }

    case ConditionOperator.NOT_EXISTS: {
      const actual = resolveContextPath(context, condition.field);
      const notExists = actual === undefined || actual === null;
      return {
        matched: notExists,
        trace: {
          operator: ConditionOperator.NOT_EXISTS,
          field: condition.field,
          actual,
          matched: notExists,
          reason: notExists ? `Field ${condition.field} does not exist` : `Field ${condition.field} exists`
        }
      };
    }

    case ConditionOperator.EQ: {
      const actual = resolveContextPath(context, condition.field);
      const matched = actual === condition.value;
      return {
        matched,
        trace: {
          operator: ConditionOperator.EQ,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: matched ? 'Values strictly equal' : `Expected ${condition.value}, got ${actual}`
        }
      };
    }

    case ConditionOperator.NEQ: {
      const actual = resolveContextPath(context, condition.field);
      const matched = actual !== condition.value;
      return {
        matched,
        trace: {
          operator: ConditionOperator.NEQ,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: matched ? 'Values not equal' : `Expected not equal to ${condition.value}`
        }
      };
    }

    case ConditionOperator.GT: {
      const actual = resolveContextPath(context, condition.field);
      const isNum = typeof actual === 'number' && typeof condition.value === 'number';
      const matched = isNum && (actual as number) > (condition.value as number);
      return {
        matched,
        trace: {
          operator: ConditionOperator.GT,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isNum ? 'Operands must both be numbers for GT' : matched ? 'Greater than satisfied' : 'Not greater than'
        }
      };
    }

    case ConditionOperator.GTE: {
      const actual = resolveContextPath(context, condition.field);
      const isNum = typeof actual === 'number' && typeof condition.value === 'number';
      const matched = isNum && (actual as number) >= (condition.value as number);
      return {
        matched,
        trace: {
          operator: ConditionOperator.GTE,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isNum ? 'Operands must both be numbers for GTE' : matched ? 'Greater than or equal satisfied' : 'Not greater than or equal'
        }
      };
    }

    case ConditionOperator.LT: {
      const actual = resolveContextPath(context, condition.field);
      const isNum = typeof actual === 'number' && typeof condition.value === 'number';
      const matched = isNum && (actual as number) < (condition.value as number);
      return {
        matched,
        trace: {
          operator: ConditionOperator.LT,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isNum ? 'Operands must both be numbers for LT' : matched ? 'Less than satisfied' : 'Not less than'
        }
      };
    }

    case ConditionOperator.LTE: {
      const actual = resolveContextPath(context, condition.field);
      const isNum = typeof actual === 'number' && typeof condition.value === 'number';
      const matched = isNum && (actual as number) <= (condition.value as number);
      return {
        matched,
        trace: {
          operator: ConditionOperator.LTE,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isNum ? 'Operands must both be numbers for LTE' : matched ? 'Less than or equal satisfied' : 'Not less than or equal'
        }
      };
    }

    case ConditionOperator.IN: {
      const actual = resolveContextPath(context, condition.field);
      const isArray = Array.isArray(condition.value);
      const matched = isArray && (condition.value as unknown[]).includes(actual);
      return {
        matched,
        trace: {
          operator: ConditionOperator.IN,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isArray ? 'Expected value must be an array for IN' : matched ? 'Value found in target array' : 'Value not found in target array'
        }
      };
    }

    case ConditionOperator.NOT_IN: {
      const actual = resolveContextPath(context, condition.field);
      const isArray = Array.isArray(condition.value);
      const matched = isArray && !(condition.value as unknown[]).includes(actual);
      return {
        matched,
        trace: {
          operator: ConditionOperator.NOT_IN,
          field: condition.field,
          actual,
          expected: condition.value,
          matched,
          reason: !isArray ? 'Expected value must be an array for NOT_IN' : matched ? 'Value not in target array' : 'Value found in target array'
        }
      };
    }

    default:
      return {
        matched: false,
        trace: {
          operator: condition.operator,
          matched: false,
          reason: `Unsupported operator: ${condition.operator}`
        },
        error: EngineErrorCode.UNSUPPORTED_OPERATOR
      };
  }
}
