/**
 * Phase 7: Character Domain Integration Contract
 *
 * Authoritative Owner: CHARACTER_SYSTEM
 * Domain ID: CHARACTER
 *
 * Defines abstract integration types for character queries, state references,
 * availability checks, and transition change requests.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const CHARACTER_DOMAIN_ID: DomainID = makeDomainID('CHARACTER');
export const CHARACTER_OWNER_ID: SystemID = makeSystemID('CHARACTER_SYSTEM');

export enum CharacterOperation {
  IDENTIFY = 'IDENTIFY',
  GET_PROFILE_REF = 'GET_PROFILE_REF',
  GET_STATE_REF = 'GET_STATE_REF',
  GET_KNOWLEDGE_REF = 'GET_KNOWLEDGE_REF',
  GET_AVAILABILITY = 'GET_AVAILABILITY',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION'
}

export interface CharacterRef {
  characterId: string;
  scope?: string;
}

export interface CharacterProfileRef {
  characterId: string;
  archetypeReference: string;
  canonicalName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DORMANT' | 'DECEASED' | 'UNKNOWN';
}

export interface CharacterStateRef {
  characterId: string;
  stateVectorRef: string;
  conditionStatus: string;
  lastUpdated: string;
}

export interface CharacterKnowledgeRef {
  characterId: string;
  epistemicBoundaryRef: string;
  knownItemCount: number;
}

export interface CharacterAvailabilityRef {
  characterId: string;
  isAvailable: boolean;
  occupancyStatus: 'FREE' | 'ENGAGED' | 'UNAVAILABLE' | 'SUSPENDED';
  locationRef?: string;
  reason?: string;
}

export interface CharacterTransitionPayload {
  characterId: string;
  targetCondition: string;
  previousConditionRef?: string;
  transitionReason: string;
  metadata?: Record<string, unknown>;
}

export type CharacterQueryRequest = DomainQueryRequest<{
  characterId?: string;
  scope?: string;
}>;

export type CharacterQueryResult = DomainQueryResult<
  CharacterProfileRef | CharacterStateRef | CharacterKnowledgeRef | CharacterAvailabilityRef | CharacterProfileRef[]
>;

export type CharacterChangeRequest = DomainChangeRequest<CharacterTransitionPayload>;
export type CharacterChangeResult = DomainChangeResult<CharacterStateRef | CharacterAvailabilityRef>;
