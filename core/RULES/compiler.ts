import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { RuleRegistryEngine } from '../RUNTIME/ENGINE/rule-engine.ts';
import { RuntimeRule, RuleType, RuleSeverity, ConditionOperator, ActionType } from '../RULES/types.ts';
import { RuleSpecification, SpecificationRegistryDocument } from '../RULES/specification.ts';

export interface CompileOptions {
  readonly strict?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateConditionTree(condition: unknown, path: string): string[] {
  const errors: string[] = [];
  if (!isObject(condition)) return [`${path} must be an object`];

  const operator = condition.operator;
  if (typeof operator !== 'string' || !Object.values(ConditionOperator).includes(operator as ConditionOperator)) {
    errors.push(`${path}.operator is invalid`);
    return errors;
  }

  const composite = operator === ConditionOperator.AND || operator === ConditionOperator.OR || operator === ConditionOperator.NOT;
  if (composite) {
    if (!Array.isArray(condition.children) || condition.children.length === 0) {
      errors.push(`${path}.children must contain at least one condition`);
    } else {
      for (let i = 0; i < condition.children.length; i += 1) {
        errors.push(...validateConditionTree(condition.children[i], `${path}.children[${i}]`));
      }
    }
  } else {
    if (operator !== ConditionOperator.EXISTS && operator !== ConditionOperator.NOT_EXISTS && typeof condition.field !== 'string') {
      errors.push(`${path}.field is required for ${operator}`);
    }
  }

  return errors;
}

export class RuleSpecificationCompiler {
  public static validateSpecification(spec: RuleSpecification): string[] {
    const errors: string[] = [];

    if (!spec.ruleId?.trim()) errors.push('ruleId is required');
    if (!spec.version?.trim()) errors.push('version is required');
    if (!spec.owner?.trim()) errors.push('owner is required');
    if (!spec.domain?.trim()) errors.push('domain is required');
    if (!Object.values(RuleType).includes(spec.type)) errors.push(`invalid rule type: ${String(spec.type)}`);
    if (spec.priority !== undefined && (!Number.isInteger(spec.priority) || spec.priority < 0)) errors.push('priority must be a non-negative integer');
    if (spec.severity !== undefined && !Object.values(RuleSeverity).includes(spec.severity)) errors.push(`invalid severity: ${String(spec.severity)}`);

    for (const [label, collection] of [
      ['preconditions', spec.preconditions],
      ['conditions', spec.conditions],
      ['forbiddenConditions', spec.forbiddenConditions]
    ] as const) {
      if (collection) {
        for (let i = 0; i < collection.length; i += 1) {
          errors.push(...validateConditionTree(collection[i], `${label}[${i}]`));
        }
      }
    }

    if (spec.actions) {
      for (let i = 0; i < spec.actions.length; i += 1) {
        const action = spec.actions[i];
        if (!action?.type || !Object.values(ActionType).includes(action.type)) errors.push(`actions[${i}].type is invalid`);
        if (!action?.target?.trim()) errors.push(`actions[${i}].target is required`);
      }
    }

    return errors;
  }

  public static compile(spec: RuleSpecification, options: CompileOptions = {}): Result<RuntimeRule> {
    const errors = this.validateSpecification(spec);
    if (errors.length > 0) {
      return failure(
        { code: EngineErrorCode.INVALID_RULE, message: `Specification ${spec.ruleId || '<unknown>'} is invalid: ${errors.join('; ')}` },
        'Rule specification validation failed.'
      );
    }

    const compiled: RuntimeRule = Object.freeze({
      ruleId: spec.ruleId,
      version: spec.version,
      owner: spec.owner,
      domain: spec.domain,
      type: spec.type,
      enabled: spec.enabled !== false,
      priority: spec.priority ?? 100,
      dependencies: Object.freeze([...(spec.dependencies ?? [])]),
      preconditions: Object.freeze([...(spec.preconditions ?? [])]),
      conditions: Object.freeze([...(spec.conditions ?? [])]),
      actions: Object.freeze([...(spec.actions ?? [])]),
      forbiddenConditions: Object.freeze([...(spec.forbiddenConditions ?? [])]),
      severity: spec.severity ?? RuleSeverity.MEDIUM,
      metadata: Object.freeze({
        ...(spec.metadata ?? {}),
        specificationVersion: spec.version,
        ...(spec.rationale ? { rationale: spec.rationale } : {}),
        ...(spec.invariants ? { invariants: [...spec.invariants] } : {})
      }),
      description: spec.description
    });

    if (options.strict !== false) {
      const registry = new RuleRegistryEngine();
      const registered = registry.register(compiled);
      if (!registered.success || !registered.data) {
        return failure(registered.error ?? EngineErrorCode.INVALID_RULE, registered.message ?? 'Compiled rule rejected by runtime registry.');
      }
    }

    return success(compiled);
  }

  public static compileRegistry(document: SpecificationRegistryDocument, options: CompileOptions = {}): Result<readonly RuntimeRule[]> {
    if (!document?.registryName?.trim()) {
      return failure(EngineErrorCode.INVALID_RULE, 'Specification registryName is required.');
    }

    const compiled: RuntimeRule[] = [];
    for (const spec of document.specifications ?? []) {
      const result = this.compile(spec, options);
      if (!result.success || !result.data) {
        return failure(result.error ?? EngineErrorCode.INVALID_RULE, result.message ?? `Failed to compile rule ${spec.ruleId}.`);
      }
      compiled.push(result.data);
    }

    const ids = new Set<string>();
    for (const rule of compiled) {
      const key = `${String(rule.ruleId)}@${String(rule.version)}`;
      if (ids.has(key)) return failure(EngineErrorCode.DUPLICATE_RULE, `Duplicate compiled rule ${key}.`);
      ids.add(key);
    }

    const compiledIds = new Set(compiled.map(rule => String(rule.ruleId)));
    for (const rule of compiled) {
      for (const dependency of rule.dependencies ?? []) {
        if (!compiledIds.has(String(dependency))) {
          return failure(EngineErrorCode.MISSING_DEPENDENCY, `Rule "${rule.ruleId}" references missing dependency "${dependency}".`);
        }
      }
    }

    return success(Object.freeze(compiled));
  }
}
