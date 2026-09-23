import { TaskID, EntityID, RuleID, makeTaskID } from '../../SHARED/identifiers.ts';

/**
 * Strongly typed execution context containing all explicit inputs for rule evaluation.
 * No hidden state, random numbers, or external clocks are permitted during rule evaluation.
 */
export interface ExecutionContextData {
  flags: Record<string, boolean>;
  enums: Record<string, string>;
  values: Record<string, unknown>;
  references: EntityID[];
  constraints: string[];
  metadata: Record<string, unknown>;
}

export interface CompactRuntimeContext {
  task: TaskID;
  activeRuleIds: RuleID[];
  requiredFlags: Record<string, boolean>;
  enumValues: Record<string, string>;
  stateValues: Record<string, unknown>;
  entityReferences: EntityID[];
  constraints: string[];
  dependencyStatus: Record<string, string>;
  validationStatus: {
    isValid: boolean;
    violations: string[];
  };
  generatedAt: number;
}
