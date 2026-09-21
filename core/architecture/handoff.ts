import {
  SystemID,
  RequestID,
  CorrelationID,
  EntityID
} from '../types/identifiers.ts';
import { MessageType } from './protocol.ts';
import { TraceabilityMetadata } from '../types/common.ts';
import { Result, success, failure } from '../types/result.ts';

export enum HandoffStatus {
  INITIALIZED = 'INITIALIZED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED'
}

export interface HandoffContract<TChange = unknown> {
  sourceSystem: SystemID;
  targetSystem: SystemID;
  requestId: RequestID;
  correlationId?: CorrelationID;
  messageType: MessageType;
  temporalContextRef?: string;
  entityReferences: EntityID[];
  requestedChange: TChange;
  effectiveTime: number | string;
  dependencies: string[];
  constraints: string[];
  sourceReferences: string[];
  status: HandoffStatus;
  version: string;
  traceability: TraceabilityMetadata;
}

/**
 * Validates a generic handoff structure ensuring all invariant contracts are present.
 */
export function validateHandoff<T>(handoff: unknown): Result<HandoffContract<T>> {
  if (!handoff || typeof handoff !== 'object') {
    return failure('Handoff payload must be a non-null object');
  }

  const h = handoff as Partial<HandoffContract<T>>;

  if (!h.sourceSystem || typeof h.sourceSystem !== 'string') {
    return failure('Handoff missing required sourceSystem');
  }

  if (!h.targetSystem || typeof h.targetSystem !== 'string') {
    return failure('Handoff missing required targetSystem');
  }

  if (!h.requestId || typeof h.requestId !== 'string') {
    return failure('Handoff missing required requestId');
  }

  if (!h.messageType || !Object.values(MessageType).includes(h.messageType)) {
    return failure(`Handoff has invalid messageType: ${h.messageType}`);
  }

  if (!Array.isArray(h.entityReferences)) {
    return failure('Handoff entityReferences must be an array');
  }

  if (h.requestedChange === undefined) {
    return failure('Handoff missing requestedChange payload');
  }

  if (!h.version || typeof h.version !== 'string') {
    return failure('Handoff missing specification version string');
  }

  if (!h.traceability || typeof h.traceability !== 'object') {
    return failure('Handoff missing traceability metadata');
  }

  const validHandoff: HandoffContract<T> = {
    sourceSystem: h.sourceSystem,
    targetSystem: h.targetSystem,
    requestId: h.requestId,
    correlationId: h.correlationId,
    messageType: h.messageType,
    temporalContextRef: h.temporalContextRef,
    entityReferences: h.entityReferences,
    requestedChange: h.requestedChange,
    effectiveTime: h.effectiveTime ?? Date.now(),
    dependencies: Array.isArray(h.dependencies) ? h.dependencies : [],
    constraints: Array.isArray(h.constraints) ? h.constraints : [],
    sourceReferences: Array.isArray(h.sourceReferences) ? h.sourceReferences : [],
    status: h.status && Object.values(HandoffStatus).includes(h.status) ? h.status : HandoffStatus.INITIALIZED,
    version: h.version,
    traceability: h.traceability
  };

  return success(validHandoff);
}
