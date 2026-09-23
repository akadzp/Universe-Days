/**
 * Phase 5: Decision vs Action & Future Information.
 * Enforces the strict invariant that Decision != Action and Future != Actualized.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
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
        sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
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

    const updated: UniverseAction = {
      ...action,
      status: ActionStatus.EXECUTED,
      eventId
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
