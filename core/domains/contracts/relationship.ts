/**
 * Phase 7: Relationship Domain Integration Contract
 *
 * Authoritative Owner: RELATIONSHIP_SYSTEM
 * Domain ID: RELATIONSHIP
 *
 * Defines abstract integration contracts for querying inter-entity relationships,
 * participants, affinity dynamics, and requesting relationship transitions.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const RELATIONSHIP_DOMAIN_ID: DomainID = makeDomainID('RELATIONSHIP');
export const RELATIONSHIP_OWNER_ID: SystemID = makeSystemID('RELATIONSHIP_SYSTEM');

export enum RelationshipOperation {
  IDENTIFY = 'IDENTIFY',
  GET_RELATIONSHIP = 'GET_RELATIONSHIP',
  GET_PARTICIPANTS = 'GET_PARTICIPANTS',
  GET_STATUS = 'GET_STATUS',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION'
}

export interface RelationshipRef {
  relationshipId: string;
  sourceEntityRef: string;
  targetEntityRef: string;
  relationType: string;
}

export interface RelationshipStatusRef {
  relationshipId: string;
  participants: [string, string];
  relationType: string;
  status: 'ACTIVE' | 'DORMANT' | 'FRACTURED' | 'TERMINATED' | 'UNKNOWN';
  affinityLevel?: number;
  trustScore?: number;
  lastUpdated: string;
}

export interface RelationshipParticipantsRef {
  relationshipId: string;
  participants: string[];
  roles?: Record<string, string>;
}

export interface RelationshipTransitionPayload {
  relationshipId: string;
  targetStatus: string;
  affinityDelta?: number;
  transitionReason: string;
  metadata?: Record<string, unknown>;
}

export type RelationshipQueryRequest = DomainQueryRequest<{
  relationshipId?: string;
  participantId?: string;
  relationType?: string;
}>;

export type RelationshipQueryResult = DomainQueryResult<
  RelationshipStatusRef | RelationshipParticipantsRef | RelationshipRef[]
>;

export type RelationshipChangeRequest = DomainChangeRequest<RelationshipTransitionPayload>;
export type RelationshipChangeResult = DomainChangeResult<RelationshipStatusRef>;
