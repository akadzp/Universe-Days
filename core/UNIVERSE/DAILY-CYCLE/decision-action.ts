/**
 * Phase 5: Decision vs Action & Future Information.
 * Enforces the strict invariant that Decision != Action and Future != Actualized.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { createUniverseEvent, UniverseEventStatus, UniverseEvent } from './event.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export enum DecisionStatus {
  PLANNED = 'PLANNED',
  PENDING = 'PENDING',
  POSSIBILITY = 'POSSIBILITY',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum FutureInfoType {
  PLAN = 'PLAN',
  PREDICTION = 'PREDICTION',
  POSSIBILITY = 'POSSIBILITY'
}

export interface UniverseDecision {
  decisionId: string;
  status: DecisionStatus;
  intent: string;
  targetRef?: string;
  temporalTarget?: string;
  actionRef?: string;
  traceability: TraceabilityMetadata;
}

export interface UniverseAction {
  actionId: string;
  decisionRef?: string;
  status: ActionStatus;
  effectiveTime: string;
  eventId?: string;
  executionPayload?: unknown;
  traceability: TraceabilityMetadata;
}

export interface FutureInformation {
  futureId: string;
  type: FutureInfoType;
  description: string;
  temporalHorizon: string;
  actualized: boolean;
  actualizedEventRef?: string;
  traceability: TraceabilityMetadata;
}

export class DecisionActionManager {
  private decisions: Map<string, UniverseDecision> = new Map();
  private actions: Map<string, UniverseAction> = new Map();
  private futureRecords: Map<string, FutureInformation> = new Map();
  /**
   * Converts an executed Action into an explicit Event proposal. This method
   * never marks the Event as occurred; occurrence remains an Event-authority operation.
   */
  public createEventProposalFromExecutedAction(actionId: string, eventId: string): Result<UniverseEvent> {
    const action = this.actions.get(actionId);
    if (!action || action.status !== ActionStatus.EXECUTED) {
      return failure(`Executed Action '${actionId}' is required before creating an Event proposal.`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    if (action.eventId && action.eventId !== eventId) {
      return failure(`Action '${actionId}' is already bound to Event '${action.eventId}'.`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    return success(createUniverseEvent({
      eventId,
      temporalReference: action.effectiveTime,
      sourceReference: actionId,
      initialStatus: UniverseEventStatus.PENDING,
      metadata: { actionRef: actionId }
    }));
  }


  public registerDecision(decision: UniverseDecision): Result<void> {
    this.decisions.set(decision.decisionId, { ...decision });
    return success(undefined);
  }

  public getDecision(id: string): UniverseDecision | undefined {
    const found = this.decisions.get(id);
    return found ? { ...found } : undefined;
  }

  /**
   * Explicitly converts an approved decision to an action.
   * Decisions NEVER become actions automatically.
   */
  public approveAndCreateAction(
    decisionId: string,
    actionId: string,
    effectiveTime: TimePoint | string
  ): Result<UniverseAction> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return failure(`Decision not found: ${decisionId}`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    if (decision.status === DecisionStatus.REJECTED || decision.status === DecisionStatus.SUPERSEDED) {
      return failure(`Cannot instantiate action from rejected or superseded decision: ${decisionId}`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }

    const timeStr = typeof effectiveTime === 'string' ? effectiveTime : effectiveTime.toCanonical();

    const action: UniverseAction = {
      actionId,
      decisionRef: decisionId,
      status: ActionStatus.PENDING,
      effectiveTime: timeStr,
      traceability: {
        requestId: makeRequestID(`REQ_ACT_${actionId}`),
        sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
        timestamp: 0,
        version: '1.0.0'
      }
    };

    const updatedDecision: UniverseDecision = {
      ...decision,
      status: DecisionStatus.APPROVED,
      actionRef: actionId
    };

    this.decisions.set(decisionId, updatedDecision);
    this.actions.set(actionId, action);
    return success(action);
  }

  public registerAction(action: UniverseAction): Result<void> {
    this.actions.set(action.actionId, { ...action });
    return success(undefined);
  }

  public getAction(id: string): UniverseAction | undefined {
    const found = this.actions.get(id);
    return found ? { ...found } : undefined;
  }

  public executeAction(actionId: string, eventId?: string): Result<UniverseAction> {
    const action = this.actions.get(actionId);
    if (!action) {
      return failure(`Action not found: ${actionId}`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    if (!eventId?.trim()) {
      return failure('Action execution requires an explicit occurred Event reference.', EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    if (action.status !== ActionStatus.PENDING && action.status !== ActionStatus.IN_PROGRESS) {
      return failure(`Action '${actionId}' cannot execute from status '${action.status}'.`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    if (!action.decisionRef) {
      return failure(`Action '${actionId}' has no Decision reference and cannot be actualized.`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }
    const decision = this.decisions.get(action.decisionRef);
    if (!decision || decision.status !== DecisionStatus.APPROVED) {
      return failure(`Action '${actionId}' requires an APPROVED Decision before execution.`, EngineErrorCode.DECISION_ACTION_CONFLICT);
    }

    const updated: UniverseAction = {
      ...action,
      status: ActionStatus.EXECUTED,
      eventId: eventId.trim()
    };
    this.actions.set(actionId, updated);
    return success(updated);
  }

  public registerFutureInfo(info: FutureInformation): Result<void> {
    this.futureRecords.set(info.futureId, { ...info, actualized: false });
    return success(undefined);
  }

  public getAllFutureInfo(): FutureInformation[] {
    return Array.from(this.futureRecords.values()).map(f => ({ ...f }));
  }

  /**
   * Future information remains non-actualized even if Universe Time reaches or passes it.
   * It can only become actualized via explicit occurrence registration.
   */
  public explicitlyActualizeFutureInfo(futureId: string, eventRef: string): Result<FutureInformation> {
    const found = this.futureRecords.get(futureId);
    if (!found) {
      return failure(`Future information record not found: ${futureId}`, EngineErrorCode.INVALID_CONDITION);
    }

    const updated: FutureInformation = {
      ...found,
      actualized: true,
      actualizedEventRef: eventRef
    };
    this.futureRecords.set(futureId, updated);
    return success(updated);
  }
}
