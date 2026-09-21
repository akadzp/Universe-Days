/**
 * Phase 9: Execution Context
 *
 * Scoped runtime execution context containing minimal necessary context,
 * loaded entities, resolved authority, rules, traces, and state tracking.
 */

import { SystemID, DomainID, makeSystemID } from '../types/identifiers.ts';
import { UniverseCommand } from './command.ts';
import { ExecutionLifecycleStateMachine, ExecutionLifecycleStatus } from './lifecycle.ts';
import { ExecutionTracer } from './trace.ts';
import { RuntimeRule } from '../types/rules.ts';
import { ConflictRecord } from '../architecture/conflict.ts';
import { DomainChangeResult } from '../domains/contracts/common.ts';
import { UniverseModel } from '../universe/model/universe.ts';

export interface ScopedTemporalContext {
  universeTime: string;
  engineTime: number;
  periodRef?: string;
}

export interface ValidationRecord {
  validatorName: string;
  valid: boolean;
  violations: string[];
  checkedAt: number;
}

export interface ExecutionContextParams {
  executionId: string;
  command: UniverseCommand;
  universe: UniverseModel;
  actor: SystemID | string;
  temporalContext: ScopedTemporalContext;
  relevantRules?: RuntimeRule[];
  permissions?: Set<string>;
}

export class ExecutionContext {
  public readonly executionId: string;
  public readonly command: UniverseCommand;
  public readonly actor: SystemID;
  public readonly universeSnapshot: UniverseModel;
  public readonly temporalContext: ScopedTemporalContext;
  public readonly lifecycle: ExecutionLifecycleStateMachine;
  public readonly tracer: ExecutionTracer;

  public relevantRules: RuntimeRule[] = [];
  public permissions: Set<string> = new Set();
  public loadedEntities: Map<string, unknown> = new Map();
  public domainResults: Map<string, DomainChangeResult> = new Map();
  public validationResults: ValidationRecord[] = [];
  public conflicts: ConflictRecord[] = [];
  public metadata: Record<string, unknown> = {};

  // Track changed entity IDs for transaction boundary and notifications
  public changedEntityRefs: Set<string> = new Set();
  public openUnresolvedConditions: string[] = [];

  constructor(params: ExecutionContextParams) {
    this.executionId = params.executionId;
    this.command = params.command;
    this.actor = typeof params.actor === 'string' ? makeSystemID(params.actor) : params.actor;
    this.universeSnapshot = params.universe;
    this.temporalContext = params.temporalContext;
    this.relevantRules = params.relevantRules ?? [];
    this.permissions = params.permissions ?? new Set();
    this.lifecycle = new ExecutionLifecycleStateMachine(ExecutionLifecycleStatus.CREATED);
    this.tracer = new ExecutionTracer(this.executionId);
  }

  /**
   * Helper to add a validation result to the context.
   */
  public recordValidation(validatorName: string, valid: boolean, violations: string[] = []): void {
    const record: ValidationRecord = {
      validatorName,
      valid,
      violations: [...violations],
      checkedAt: Date.now()
    };
    this.validationResults.push(record);
  }

  /**
   * Helper to record an identified conflict.
   */
  public recordConflict(conflictRecord: ConflictRecord): void {
    this.conflicts.push(conflictRecord);
  }

  /**
   * Check if any validation has failed.
   */
  public hasValidationFailures(): boolean {
    return this.validationResults.some(v => !v.valid);
  }

  /**
   * Check if any unresolved critical conflicts exist.
   */
  public hasCriticalConflicts(): boolean {
    return this.conflicts.some(c => c.severity === 'CRITICAL' && c.status !== 'RESOLVED');
  }

  /**
   * Minimized export of context data for rule evaluation.
   */
  public toRuleEvaluationContext(): Record<string, unknown> {
    return {
      command: {
        commandId: this.command.commandId,
        commandType: this.command.commandType,
        requestedBy: String(this.command.requestedBy),
        target: this.command.target,
        input: this.command.input,
        executionMode: this.command.executionMode
      },
      temporal: {
        universeTime: this.temporalContext.universeTime,
        engineTime: this.temporalContext.engineTime,
        periodRef: this.temporalContext.periodRef
      },
      actor: String(this.actor),
      permissions: Array.from(this.permissions),
      loadedEntityCount: this.loadedEntities.size,
      conflictCount: this.conflicts.length,
      flags: {
        HAS_CRITICAL_CONFLICT: this.hasCriticalConflicts(),
        HAS_VALIDATION_FAILURE: this.hasValidationFailures()
      },
      values: { ...this.metadata }
    };
  }
}
