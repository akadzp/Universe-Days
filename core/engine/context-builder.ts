import { TaskID, RuleID, EntityID, makeTaskID } from '../types/identifiers.ts';
import { ExecutionContextData, CompactRuntimeContext } from '../types/execution-context.ts';
import { FixedRuntimeClock, RuntimeClock } from './runtime-clock.ts';

export interface ValidationState {
  isValid: boolean;
  checkedAt: number;
  violations: string[];
}

export interface ExecutionContext<TState = unknown> {
  task: TaskID;
  activeRules: RuleID[];
  relevantState: TState;
  flags: Record<string, boolean>;
  enums: Record<string, string>;
  values: Record<string, unknown>;
  entityReferences: EntityID[];
  constraints: string[];
  validationState: ValidationState;
  generatedAt: number;
}

export class ContextBuilder<TState = unknown> {
  private readonly clock: RuntimeClock;

  private task: TaskID = makeTaskID('TASK-UNASSIGNED');
  private activeRules: RuleID[] = [];
  private relevantState: TState = {} as TState;
  private flags: Record<string, boolean> = {};
  private enums: Record<string, string> = {};
  private values: Record<string, unknown> = {};
  private entityReferences: EntityID[] = [];
  private constraints: string[] = [];
  private dependencyStatus: Record<string, string> = {};
  private validationState: ValidationState;

  constructor(clock: RuntimeClock = new FixedRuntimeClock()) {
    this.clock = clock;
    this.validationState = {
      isValid: true,
      checkedAt: this.clock.now(),
      violations: []
    };
  }

  public setTask(taskId: TaskID | string): this {
    this.task = makeTaskID(String(taskId));
    return this;
  }

  public setActiveRules(ruleIds: (RuleID | string)[]): this {
    this.activeRules = ruleIds.map(id => String(id) as RuleID);
    return this;
  }

  public setRelevantState(state: TState): this {
    this.relevantState = state;
    return this;
  }

  public setFlags(flags: Record<string, boolean>): this {
    this.flags = { ...flags };
    return this;
  }

  public setFlag(name: string, value: boolean): this {
    this.flags[name] = value;
    return this;
  }

  public setEnums(enums: Record<string, string>): this {
    this.enums = { ...enums };
    return this;
  }

  public setEnum(name: string, value: string): this {
    this.enums[name] = value;
    return this;
  }

  public setValues(values: Record<string, unknown>): this {
    this.values = { ...values };
    return this;
  }

  public setValue(key: string, value: unknown): this {
    this.values[key] = value;
    return this;
  }

  public setEntityReferences(refs: EntityID[]): this {
    this.entityReferences = [...refs];
    return this;
  }

  public addConstraint(constraint: string): this {
    this.constraints.push(constraint);
    return this;
  }

  public setDependencyStatus(depStatus: Record<string, string>): this {
    this.dependencyStatus = { ...depStatus };
    return this;
  }

  public setValidationState(isValid: boolean, violations: string[] = []): this {
    this.validationState = {
      isValid,
      checkedAt: this.clock.now(),
      violations
    };
    return this;
  }

  public build(): ExecutionContext<TState> {
    return {
      task: this.task,
      activeRules: [...this.activeRules],
      relevantState: this.relevantState,
      flags: { ...this.flags },
      enums: { ...this.enums },
      values: { ...this.values },
      entityReferences: [...this.entityReferences],
      constraints: [...this.constraints],
      validationState: { ...this.validationState },
      generatedAt: this.clock.now()
    };
  }

  public toExecutionContextData(): ExecutionContextData {
    return {
      flags: { ...this.flags },
      enums: { ...this.enums },
      values: {
        ...this.values,
        ...(typeof this.relevantState === 'object' && this.relevantState !== null
          ? (this.relevantState as Record<string, unknown>)
          : {})
      },
      references: [...this.entityReferences],
      constraints: [...this.constraints],
      metadata: {
        task: this.task,
        activeRules: [...this.activeRules],
        validationState: { ...this.validationState }
      }
    };
  }

  public buildCompactContext(): CompactRuntimeContext {
    return {
      task: this.task,
      activeRuleIds: [...this.activeRules],
      requiredFlags: { ...this.flags },
      enumValues: { ...this.enums },
      stateValues: { ...this.values },
      entityReferences: [...this.entityReferences],
      constraints: [...this.constraints],
      dependencyStatus: { ...this.dependencyStatus },
      validationStatus: {
        isValid: this.validationState.isValid,
        violations: [...this.validationState.violations]
      },
      generatedAt: this.clock.now()
    };
  }
}
