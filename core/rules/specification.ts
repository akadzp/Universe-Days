import { Condition, RuleAction, RuleSeverity, RuleType } from '../types/rules.ts';

export interface RuleSpecification {
  readonly ruleId: string;
  readonly version: string;
  readonly owner: string;
  readonly domain: string;
  readonly type: RuleType;
  readonly enabled?: boolean;
  readonly priority?: number;
  readonly dependencies?: readonly string[];
  readonly preconditions?: readonly Condition[];
  readonly conditions?: readonly Condition[];
  readonly forbiddenConditions?: readonly Condition[];
  readonly actions?: readonly RuleAction[];
  readonly severity?: RuleSeverity;
  readonly description?: string;
  readonly rationale?: string;
  readonly invariants?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SpecificationRegistryDocument {
  readonly version: string;
  readonly registryName: string;
  readonly specifications: readonly RuleSpecification[];
}
