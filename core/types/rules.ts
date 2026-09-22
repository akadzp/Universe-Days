import { RuleID, DomainID, SystemID } from './identifiers.ts';

/**
 * Supported rule types.
 * Deterministic, validation, gate, and derivation rules execute strictly locally without LLM inference.
 */
export enum RuleType {
  DETERMINISTIC = 'DETERMINISTIC',
  SEMANTIC = 'SEMANTIC',
  VALIDATION = 'VALIDATION',
  GATE = 'GATE',
  DERIVATION = 'DERIVATION'
}

/**
 * Standard severity classification for rules.
 */
export enum RuleSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

/**
 * Supported comparison and logical operators for conditions.
 */
export enum ConditionOperator {
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT'
}

/**
 * Composable condition definition.
 * Can be a leaf comparison or a composite logical condition (AND, OR, NOT).
 */
export interface Condition {
  operator: ConditionOperator;
  field?: string; // Path or key in execution context (e.g., 'flags.CAN_CONTINUE', 'values.temperature')
  value?: unknown; // Expected value or array of values for comparison
  children?: Condition[]; // Nested conditions for composite operators AND, OR, NOT
  description?: string;
}

/**
 * Standard action types produced or applied by rules.
 */
export enum ActionType {
  SET_FLAG = 'SET_FLAG',
  SET_VALUE = 'SET_VALUE',
  SET_ENUM = 'SET_ENUM',
  TRANSITION_STATE = 'TRANSITION_STATE',
  EMIT_EVENT = 'EMIT_EVENT'
}

export interface RuleAction {
  type: ActionType;
  target: string;
  value: unknown;
  description?: string;
}

/**
 * Runtime Rule definition model.
 * Distinguishes compact machine-readable runtime rules from human-readable specification.
 */
export interface RuntimeRule {
  ruleId: RuleID | string;
  version: number | string;
  owner: SystemID | string;
  domain: DomainID | string;
  type: RuleType;
  enabled: boolean;
  priority?: number;
  dependencies?: readonly (RuleID | string)[];
  preconditions?: readonly Condition[];
  conditions?: readonly Condition[];
  actions?: readonly RuleAction[];
  forbiddenConditions?: readonly Condition[];
  severity?: RuleSeverity;
  metadata?: Record<string, unknown>;
  description?: string;
}

/**
 * Evaluation statuses for rule execution results.
 */
export enum RuleEvaluationStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  ERROR = 'ERROR'
}

/**
 * Trace record for a single condition evaluation.
 */
export interface ConditionTrace {
  operator: ConditionOperator;
  field?: string;
  actual?: unknown;
  expected?: unknown;
  matched: boolean;
  reason?: string;
}

/**
 * Trace record for full rule evaluation.
 */
export interface RuleEvaluationTrace {
  ruleId: string;
  ruleVersion: number | string;
  startedAt: number;
  completedAt: number;
  evaluatedDependencies: {
    dependencyId: string;
    status: RuleEvaluationStatus;
  }[];
  preconditionsPassed: boolean;
  conditionTraces: ConditionTrace[];
  forbiddenConditionTraces: ConditionTrace[];
  executedActions: RuleAction[];
}

/**
 * Structured rule evaluation result.
 */
export interface RuleResult {
  ruleId: string;
  ruleVersion: number | string;
  status: RuleEvaluationStatus;
  severity: RuleSeverity;
  matchedConditions: string[];
  failedConditions: string[];
  dependencyResults: Record<string, RuleEvaluationStatus>;
  producedActions?: RuleAction[];
  trace: RuleEvaluationTrace;
  error?: string;
}

/**
 * Gate logical aggregation mode.
 */
export enum GateMode {
  ALL = 'ALL',
  ANY = 'ANY',
  NONE = 'NONE'
}

/**
 * Gate definition and evaluation result.
 */
export interface GateDefinition {
  gateId: string;
  mode: GateMode;
  ruleIds: (RuleID | string)[];
  description?: string;
}

export interface GateResult {
  gateId: string;
  mode: GateMode;
  passed: boolean;
  totalRules: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  ruleResults: Record<string, RuleResult>;
  summary: string;
}
