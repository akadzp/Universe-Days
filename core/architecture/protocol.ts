import { SystemID, RequestID, CorrelationID, makeRequestID, makeSystemID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';

export enum MessageType {
  READ = 'READ',
  CONTEXT = 'CONTEXT',
  REQUEST = 'REQUEST',
  RESULT = 'RESULT',
  VALIDATION = 'VALIDATION',
  CONFLICT = 'CONFLICT',
  BLOCK = 'BLOCK'
}

export type SourceSystem = SystemID;
export type TargetSystem = SystemID;

export enum ProtocolStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface ProtocolMessage<T = unknown> {
  requestId: RequestID;
  correlationId?: CorrelationID;
  type: MessageType;
  source: SourceSystem;
  target: TargetSystem;
  status: ProtocolStatus;
  payload?: T;
  timestamp: number;
}

/**
 * Validates whether a given object is a compliant ProtocolMessage.
 */
export function validateProtocolMessage(msg: unknown): Result<ProtocolMessage> {
  if (!msg || typeof msg !== 'object') {
    return failure('Message must be a non-null object');
  }

  const candidate = msg as Partial<ProtocolMessage>;

  if (!candidate.requestId || typeof candidate.requestId !== 'string' || candidate.requestId.trim() === '') {
    return failure('Missing required field: requestId');
  }

  if (!candidate.source || typeof candidate.source !== 'string' || candidate.source.trim() === '') {
    return failure('Missing required field: source system');
  }

  if (!candidate.target || typeof candidate.target !== 'string' || candidate.target.trim() === '') {
    return failure('Missing required field: target system');
  }

  const validTypes = Object.values(MessageType) as string[];
  if (!candidate.type || !validTypes.includes(candidate.type)) {
    return failure(`Invalid message type: "${candidate.type}". Supported types: ${validTypes.join(', ')}`);
  }

  const validStatuses = Object.values(ProtocolStatus) as string[];
  if (candidate.status && !validStatuses.includes(candidate.status)) {
    return failure(`Invalid protocol status: "${candidate.status}"`);
  }

  const validatedMessage: ProtocolMessage = {
    requestId: candidate.requestId,
    correlationId: candidate.correlationId,
    type: candidate.type,
    source: candidate.source,
    target: candidate.target,
    status: candidate.status || ProtocolStatus.PENDING,
    payload: candidate.payload,
    timestamp: candidate.timestamp || Date.now()
  };

  return success(validatedMessage);
}

/**
 * Convenience factory to create a strongly typed protocol message.
 */
export function createProtocolMessage<T>(
  type: MessageType,
  source: SourceSystem,
  target: TargetSystem,
  payload?: T,
  correlationId?: CorrelationID
): ProtocolMessage<T> {
  return {
    requestId: makeRequestID(`REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`),
    correlationId,
    type,
    source,
    target,
    status: ProtocolStatus.PENDING,
    payload,
    timestamp: Date.now()
  };
}
