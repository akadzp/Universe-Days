/**
 * Phase 4: Continuity Query API.
 * Single unified query and execution facade for the Continuity Engine.
 */

import { ConditionReference } from '../../UNIVERSE/CONTINUITY/condition-reference.ts';
import { ContinuityItem, ContinuityStatus } from '../../UNIVERSE/CONTINUITY/continuity-model.ts';
import { Transition } from '../../UNIVERSE/CONTINUITY/transition.ts';
import {
  ContinuityQueryResult,
  ContinuityConflict,
  TransitionResult
} from '../../UNIVERSE/CONTINUITY/result.ts';
import { ContinuityValidator, TransitionValidationInput } from '../../UNIVERSE/CONTINUITY/validator.ts';
import { ContinuityHistory, ContinuityHistoryRecord } from '../../UNIVERSE/CONTINUITY/history.ts';
import { ContinuityLifecycleManager } from '../../UNIVERSE/CONTINUITY/lifecycle.ts';
import { ContinuityDependency } from '../../UNIVERSE/CONTINUITY/dependency.ts';

export class ContinuityQueryAPI {
  private items: Map<string, ContinuityItem> = new Map();
  private history: ContinuityHistory;
  private dependenciesByItem: Map<string, ContinuityDependency[]> = new Map();

  constructor(history?: ContinuityHistory) {
    this.history = history || new ContinuityHistory();
  }

  /**
   * Registers or updates a ContinuityItem in the registry.
   */
  public registerItem(item: ContinuityItem): void {
    this.items.set(item.identity.continuityId, { ...item });
  }

  /**
   * Registers dependencies for a continuity item.
   */
  public setDependencies(continuityId: string, dependencies: ContinuityDependency[]): void {
    this.dependenciesByItem.set(continuityId, [...dependencies]);
  }

  /**
   * Retrieves a continuity item by ID.
   */
  public getContinuity(id: string): ContinuityQueryResult<ContinuityItem> {
    const item = this.items.get(id);
    if (!item) {
      return {
        success: false,
        findings: [
          {
            code: 'NOT_FOUND',
            message: `Continuity item "${id}" not found`,
            severity: 'WARNING'
          }
        ]
      };
    }
    return {
      success: true,
      data: { ...item }
    };
  }

  /**
   * Retrieves the current condition reference for a continuity item.
   */
  public getCurrentCondition(id: string): ContinuityQueryResult<ConditionReference | null> {
    const item = this.items.get(id);
    if (!item) {
      return {
        success: false,
        findings: [{ code: 'NOT_FOUND', message: `Continuity item "${id}" not found`, severity: 'WARNING' }]
      };
    }
    return {
      success: true,
      data: item.currentConditionRef || null
    };
  }

  /**
   * Retrieves the previous condition reference for a continuity item.
   */
  public getPreviousCondition(id: string): ContinuityQueryResult<ConditionReference | null> {
    const item = this.items.get(id);
    if (!item) {
      return {
        success: false,
        findings: [{ code: 'NOT_FOUND', message: `Continuity item "${id}" not found`, severity: 'WARNING' }]
      };
    }
    return {
      success: true,
      data: item.previousConditionRef || null
    };
  }

  /**
   * Retrieves the current ContinuityStatus for a continuity item.
   */
  public getContinuityStatus(id: string): ContinuityQueryResult<ContinuityStatus> {
    const item = this.items.get(id);
    if (!item) {
      return {
        success: false,
        data: ContinuityStatus.UNKNOWN,
        findings: [{ code: 'NOT_FOUND', message: `Continuity item "${id}" not found`, severity: 'WARNING' }]
      };
    }
    return {
      success: true,
      data: item.status
    };
  }

  /**
   * Retrieves all dependencies registered for a continuity item.
   */
  public getDependencies(id: string): ContinuityQueryResult<ContinuityDependency[]> {
    const deps = this.dependenciesByItem.get(id) || [];
    return {
      success: true,
      data: [...deps]
    };
  }

  /**
   * Validates a candidate transition without mutating state.
   */
  public validateTransition(input: TransitionValidationInput): TransitionResult {
    const targetItem = input.item || this.items.get(input.transition.continuityId);
    return ContinuityValidator.validateTransition({
      ...input,
      item: targetItem,
      context: {
        ...input.context,
        items: new Map(Array.from(this.items.entries()).map(([k, v]) => [k, { status: v.status, entityRef: v.identity.entityRef }]))
      }
    });
  }

  /**
   * Validates and applies a transition to a continuity item, updating history and state.
   */
  public applyTransition(input: TransitionValidationInput): TransitionResult {
    const targetItem = input.item || this.items.get(input.transition.continuityId);
    const validation = this.validateTransition({ ...input, item: targetItem });

    if (!validation.allowed) {
      return validation;
    }

    const currentStatus = targetItem ? targetItem.status : ContinuityStatus.UNKNOWN;
    const lifecycle = new ContinuityLifecycleManager(currentStatus);
    const transitionRes = lifecycle.applyTransition(input.transition, {
      allowReopen: input.context?.allowReopen,
      identity: targetItem?.identity
    });

    const newStatus = transitionRes.status === 'SUCCESS' ? transitionRes.data! : targetItem?.status || ContinuityStatus.ACTIVE;

    // Create or update item
    const updatedItem: ContinuityItem = targetItem
      ? {
          ...targetItem,
          status: newStatus,
          previousConditionRef: input.transition.previousConditionRef || targetItem.currentConditionRef,
          currentConditionRef: input.transition.currentConditionRef || targetItem.currentConditionRef,
          lastTransitionType: input.transition.type,
          effectiveTime: input.transition.effectiveTime
        }
      : {
          identity: input.transition.predecessorIdentity || {
            continuityId: input.transition.continuityId,
            entityRef: input.transition.currentConditionRef?.entityRef || 'UNKNOWN_ENTITY',
            domainRef: input.transition.currentConditionRef?.domain || 'UNKNOWN_DOMAIN',
            version: 1
          },
          status: newStatus,
          previousConditionRef: input.transition.previousConditionRef,
          currentConditionRef: input.transition.currentConditionRef,
          lastTransitionType: input.transition.type,
          effectiveTime: input.transition.effectiveTime
        };

    this.registerItem(updatedItem);

    // Record in history
    this.history.append({
      continuityId: updatedItem.identity.continuityId,
      identity: updatedItem.identity,
      previousConditionRef: updatedItem.previousConditionRef,
      currentConditionRef: updatedItem.currentConditionRef,
      transition: input.transition,
      effectiveTime: input.transition.effectiveTime,
      version: updatedItem.identity.version,
      validationResult: {
        status: validation.status,
        valid: validation.allowed,
        findings: validation.findings,
        trace: validation.trace,
        affectedReferences: validation.affectedReferences
      },
      sourceReference: input.transition.sourceReference
    });

    return validation;
  }

  /**
   * Compares two continuity items or conditions to identify changes.
   */
  public compareContinuity(
    previous?: ContinuityItem | ConditionReference | null,
    current?: ContinuityItem | ConditionReference | null
  ): { changed: boolean; details?: Record<string, unknown> } {
    if (!previous && !current) return { changed: false };
    if (!previous || !current) return { changed: true, details: { previous, current } };

    const prevCond = 'conditionId' in previous ? previous : previous.currentConditionRef;
    const currCond = 'conditionId' in current ? current : current.currentConditionRef;

    const changed = prevCond?.conditionId !== currCond?.conditionId || (prevCond?.version ?? 1) !== (currCond?.version ?? 1);
    return {
      changed,
      details: {
        previousConditionId: prevCond?.conditionId,
        currentConditionId: currCond?.conditionId
      }
    };
  }

  /**
   * Retrieves historical records for a continuity item.
   */
  public getContinuityHistory(id: string): ContinuityQueryResult<ContinuityHistoryRecord[]> {
    const list = this.history.getHistory(id);
    return {
      success: true,
      data: list
    };
  }

  /**
   * Scans items within scope for continuity conflicts (such as duplicates or inversions).
   */
  public findContinuityConflicts(scope?: { domainRef?: string }): ContinuityConflict[] {
    const items = Array.from(this.items.values()).filter((item) =>
      scope?.domainRef ? item.identity.domainRef === scope.domainRef : true
    );
    return ContinuityValidator.detectDuplicates(items);
  }
}
