/**
 * Phase 4: Continuity Engine Result and Validation Types.
 * Domain-neutral, strongly typed, deterministic result models.
 */

export type ContinuityValidationStatus =
  | 'VALID'
  | 'INVALID'
  | 'CONFLICT'
  | 'REVIEW_REQUIRED'
  | 'REVISION_REQUIRED'
  | 'BLOCKED'
  | 'UNKNOWN';

export type ContinuitySeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

export interface ContinuityFinding {
  code: string;
  message: string;
  severity: ContinuitySeverity;
  details?: Record<string, unknown>;
}

export interface ContinuityTrace {
  operation: string;
  timestamp: number;
  continuityId?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

export interface ContinuityValidationResult {
  status: ContinuityValidationStatus;
  valid: boolean;
  findings: ContinuityFinding[];
  trace?: ContinuityTrace;
  affectedReferences?: string[];
}

export interface TransitionResult {
  status: ContinuityValidationStatus;
  transitionType: string;
  previousStatus?: string;
  resultingStatus?: string;
  findings: ContinuityFinding[];
  trace?: ContinuityTrace;
  affectedReferences?: string[];
  allowed: boolean;
}

export interface ContinuityQueryResult<T = unknown> {
  success: boolean;
  data?: T;
  findings?: ContinuityFinding[];
  trace?: ContinuityTrace;
}

export type ContinuityConflictType =
  | 'DUPLICATE'
  | 'TEMPORAL_INVERSION'
  | 'CIRCULAR_REFERENCE'
  | 'STATUS_MISMATCH'
  | 'MUTUAL_EXCLUSION'
  | 'BROKEN_REFERENCE'
  | 'IDENTITY_MISMATCH';

export interface ContinuityConflict {
  conflictId: string;
  conflictType: ContinuityConflictType;
  description: string;
  severity: ContinuitySeverity;
  entities: string[];
  items: string[];
  details?: Record<string, unknown>;
}

export interface ContinuityChainResult {
  chainId?: string;
  valid: boolean;
  status: ContinuityValidationStatus;
  nodes: string[];
  transitions: string[];
  brokenAt?: number;
  findings: ContinuityFinding[];
}
