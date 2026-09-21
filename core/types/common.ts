import { SystemID, DomainID, RequestID, CorrelationID } from './identifiers.ts';

export interface TraceabilityMetadata {
  requestId: RequestID;
  correlationId?: CorrelationID;
  sourceSystem: SystemID;
  targetSystem?: SystemID;
  timestamp: number;
  version: string;
}

export interface DomainMetadata {
  domainId: DomainID;
  ownerId: SystemID;
  authorityLevel: number;
  description: string;
}

export interface KeyValueMap<V = unknown> {
  [key: string]: V;
}
