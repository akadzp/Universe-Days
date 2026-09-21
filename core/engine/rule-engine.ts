import { RuleID, DomainID, SystemID, makeRuleID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import {
  RuleType,
  RuleSeverity,
  RuntimeRule,
  Condition,
  RuleAction
} from '../types/rules.ts';

export { RuleType, RuleSeverity };

/**
 * Backward-compatible Rule interface mapping to RuntimeRule.
 */
export interface Rule extends Partial<RuntimeRule> {
  id: RuleID | string;
  owner: SystemID | string;
  domain: DomainID | string;
  type: RuleType;
  dependencies: (RuleID | string)[];
  metadata: Record<string, unknown>;
  enabled: boolean;
  version?: number | string;
  description?: string;
}

export class RuleRegistryEngine {
  // Keyed by ruleId -> Map of version -> RuntimeRule
  private rulesById: Map<string, Map<string, RuntimeRule>> = new Map();

  /**
   * Registers a runtime rule. Rejects duplicate rule ID + version, or duplicates when unversioned.
   * Validates required metadata: non-empty id, owner, and domain.
   */
  public register(rule: Rule | RuntimeRule): Result<RuntimeRule> {
    const rawId = (rule as Rule).id || (rule as RuntimeRule).ruleId;
    if (!rawId || typeof rawId !== 'string' || rawId.trim() === '') {
      return failure('Rule must have a valid non-empty id', EngineErrorCode.INVALID_RULE);
    }

    if (!rule.owner || typeof rule.owner !== 'string' || rule.owner.trim() === '') {
      return failure('Rule must have a valid non-empty owner metadata', EngineErrorCode.INVALID_RULE);
    }

    if (!rule.domain || typeof rule.domain !== 'string' || rule.domain.trim() === '') {
      return failure('Rule must have a valid non-empty domain metadata', EngineErrorCode.INVALID_RULE);
    }

    if (!rule.type || !Object.values(RuleType).includes(rule.type)) {
      return failure(`Rule type "${rule.type}" is invalid`, EngineErrorCode.INVALID_RULE);
    }

    const key = String(rawId);
    const versionKey = rule.version !== undefined ? String(rule.version) : '1.0.0';

    let versionMap = this.rulesById.get(key);
    if (!versionMap) {
      versionMap = new Map();
      this.rulesById.set(key, versionMap);
    } else {
      if (versionMap.has(versionKey)) {
        return failure(
          `Rule with ID "${key}" (version ${versionKey}) is already registered. Duplicate IDs are forbidden.`,
          EngineErrorCode.DUPLICATE_RULE
        );
      }
    }

    const normalizedRule: RuntimeRule = {
      ruleId: makeRuleID(key),
      version: versionKey,
      owner: rule.owner,
      domain: rule.domain,
      type: rule.type,
      enabled: rule.enabled !== false,
      priority: rule.priority ?? 100,
      dependencies: rule.dependencies ? [...rule.dependencies] : [],
      preconditions: rule.preconditions ? [...rule.preconditions] : [],
      conditions: rule.conditions ? [...rule.conditions] : [],
      actions: rule.actions ? [...rule.actions] : [],
      forbiddenConditions: rule.forbiddenConditions ? [...rule.forbiddenConditions] : [],
      severity: rule.severity || RuleSeverity.MEDIUM,
      metadata: rule.metadata ? { ...rule.metadata } : {},
      description: rule.description
    };

    // Attach backward-compatible 'id' getter/property
    Object.defineProperty(normalizedRule, 'id', {
      value: normalizedRule.ruleId,
      enumerable: true,
      writable: false
    });

    versionMap.set(versionKey, normalizedRule);
    return success(normalizedRule, `Rule ${key} (v${versionKey}) registered successfully.`);
  }

  /**
   * Retrieves a rule by its ID. If version is specified, returns that exact version;
   * otherwise returns the latest registered version.
   */
  public getRule(id: string | RuleID, version?: number | string): (RuntimeRule & { id: RuleID }) | undefined {
    const key = String(id);
    const versionMap = this.rulesById.get(key);
    if (!versionMap || versionMap.size === 0) return undefined;

    if (version !== undefined) {
      return versionMap.get(String(version)) as (RuntimeRule & { id: RuleID }) | undefined;
    }

    // Default to latest version in insertion or semver order
    const versions = Array.from(versionMap.values());
    return versions[versions.length - 1] as (RuntimeRule & { id: RuleID }) | undefined;
  }

  /**
   * Enables a registered rule.
   */
  public enable(id: string | RuleID, version?: number | string): Result<boolean> {
    const rule = this.getRule(id, version);
    if (!rule) {
      return failure(`Rule with ID "${id}" not found.`, EngineErrorCode.MISSING_RULE);
    }
    rule.enabled = true;
    return success(true);
  }

  /**
   * Disables a registered rule.
   */
  public disable(id: string | RuleID, version?: number | string): Result<boolean> {
    const rule = this.getRule(id, version);
    if (!rule) {
      return failure(`Rule with ID "${id}" not found.`, EngineErrorCode.MISSING_RULE);
    }
    rule.enabled = false;
    return success(false);
  }

  /**
   * Returns only rules that are currently enabled for execution.
   * Disabled rules are strictly excluded.
   */
  public getExecutableRules(): (RuntimeRule & { id: RuleID })[] {
    const executable: (RuntimeRule & { id: RuleID })[] = [];
    for (const versionMap of this.rulesById.values()) {
      for (const rule of versionMap.values()) {
        if (rule.enabled) {
          executable.push(rule as (RuntimeRule & { id: RuleID }));
        }
      }
    }
    return executable;
  }

  /**
   * Returns all registered rules across all versions.
   */
  public getAllRules(): (RuntimeRule & { id: RuleID })[] {
    const all: (RuntimeRule & { id: RuleID })[] = [];
    for (const versionMap of this.rulesById.values()) {
      for (const rule of versionMap.values()) {
        all.push(rule as (RuntimeRule & { id: RuleID }));
      }
    }
    return all;
  }

  /**
   * Validates internal registry consistency (e.g. checking dependency integrity).
   */
  public validate(): Result<boolean> {
    const allMap = new Map<string, RuntimeRule>();
    for (const r of this.getAllRules()) {
      allMap.set(String(r.ruleId), r);
    }

    for (const r of allMap.values()) {
      for (const dep of r.dependencies || []) {
        if (!allMap.has(String(dep))) {
          return failure(
            `Rule "${r.ruleId}" references unregistered dependency "${dep}"`,
            EngineErrorCode.MISSING_DEPENDENCY
          );
        }
      }
    }

    return success(true);
  }

  /**
   * Clears all registered rules.
   */
  public clear(): void {
    this.rulesById.clear();
  }
}

export { RuleRegistryEngine as RuleRegistry };
