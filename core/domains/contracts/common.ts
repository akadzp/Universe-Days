/**
 * Phase 7: Domain System Integration - Common Contract Types
 *
 * Defines the unified communication protocol across all Pocer Universe domain ports.
 */

import {
  DomainID,
  SystemID,
  RequestID,
  CorrelationID,
  makeDomainID,
  makeSystemID,
  makeRequestID
} from '../../types/identifiers.ts';
import { Result } from '../../types/result.ts';
import { TimePoint } from '../../temporal/time-point.ts';
import { ConflictRecord } from '../../architecture/conflict.ts';

export enum DomainResultType {
  ACCEPTED = 'ACCEPTED',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
  REQUIRES_INPUT = 'REQUIRES_INPUT',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}

export type DomainValidationStatus = 'VALID' | 'INVALID' | 'BLOCKED' | 'REQUIRES_REVALIDATION';

export interface DomainVersionMetadata {
  domainVersion: string;
  entityVersion?: string | number;
  requestId: RequestID;
  correlationId?: CorrelationID;
  traceId: string;
}

export interface DomainTraceRecord {
  requestId: RequestID;
  correlationId?: CorrelationID;
  traceId: string;
  timestamp: number;
  sourceSystem: SystemID;
  targetDomain: DomainID;
  operation: string;
  entityReference?: string;
  result: DomainResultType;
  owner: SystemID;
  validationStatus: DomainValidationStatus;
  details?: Record<string, unknown>;
}

export interface DomainQueryRequest<TFilter = unknown> {
  requestId: RequestID;
  correlationId?: CorrelationID;
  sourceSystem: SystemID;
  targetDomain: DomainID;
  operation: string;
  entityReference?: string;
  filter?: TFilter;
  effectiveTime?: TimePoint | string;
}

export interface DomainQueryResult<TData = unknown> {
  requestId: RequestID;
  domain: DomainID;
  owner: SystemID;
  version: DomainVersionMetadata;
  data: TData;
  status: DomainResultType;
  message?: string;
}

export interface DomainChangeRequest<TPayload = unknown> {
  requestId: RequestID;
  correlationId?: CorrelationID;
  sourceSystem: SystemID;
  targetDomain: DomainID;
  operation: string;
  entityReference?: string;
  payload: TPayload;
  effectiveTime?: TimePoint | string;
  expectedPredecessorCondition?: string;
  continuityReference?: string;
}

export interface DomainChangeResult<TData = unknown> {
  requestId: RequestID;
  domain: DomainID;
  owner: SystemID;
  version: DomainVersionMetadata;
  resultType: DomainResultType;
  data?: TData;
  conflicts?: ConflictRecord[];
  reason?: string;
  revalidationRequired?: boolean;
}

export interface DomainValidationResult {
  valid: boolean;
  domain: DomainID;
  owner: SystemID;
  status: DomainValidationStatus;
  reasons: string[];
  temporalValid?: boolean;
  continuityValid?: boolean;
}

export interface DomainConflictResolutionRequest {
  conflictId: string;
  domain: DomainID;
  resolverActor: SystemID;
  resolutionDecision: 'ACCEPT_FIRST' | 'ACCEPT_SECOND' | 'MERGE' | 'REJECT_ALL' | 'CUSTOM';
  resolvedData?: unknown;
  rationale: string;
}

export interface DomainConflictResolutionResult {
  conflictId: string;
  status: 'RESOLVED' | 'REJECTED' | 'REVALIDATION_REQUIRED';
  revalidationRequired: boolean;
  resolutionSummary: string;
}

/**
 * Common Domain Port Interface.
 * Every domain adapter implements this interface to communicate with the engine.
 */
export interface DomainPort {
  readonly domainId: DomainID;
  readonly ownerId: SystemID;
  readonly version: string;
  readonly supportedOperations: readonly string[];

  query(request: DomainQueryRequest): Result<DomainQueryResult>;
  requestChange(request: DomainChangeRequest): Result<DomainChangeResult>;
  applyChange(request: DomainChangeRequest): Result<DomainChangeResult>;
  validate(request: DomainChangeRequest | DomainQueryRequest): Result<DomainValidationResult>;
  resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult>;
  getTraces(): DomainTraceRecord[];
  recordTrace(trace: DomainTraceRecord): void;
}

/**
 * Utility helper to deep-freeze an object ensuring read-only immutability.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj as object)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj as Readonly<T>;
}
