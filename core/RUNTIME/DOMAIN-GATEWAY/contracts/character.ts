/**
 * Character / Actor Domain Integration Contract
 *
 * Authoritative Owner: CHARACTER_SYSTEM
 * Domain ID: CHARACTER
 *
 * Character System owns Actor identity/classification and Character data.
 * Consumers may READ and REQUEST changes; only the owner may APPLY.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../../SHARED/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';
import {
  ActorDataSource,
  ActorEntityType,
  ActorGender,
  ActorLevel
} from '../../../CHARACTER/actor.ts';

export const CHARACTER_DOMAIN_ID: DomainID = makeDomainID('CHARACTER');
export const CHARACTER_OWNER_ID: SystemID = makeSystemID('CHARACTER_SYSTEM');

export enum CharacterOperation {
  IDENTIFY = 'IDENTIFY',
  GET_PROFILE_REF = 'GET_PROFILE_REF',
  GET_STATE_REF = 'GET_STATE_REF',
  GET_KNOWLEDGE_REF = 'GET_KNOWLEDGE_REF',
  GET_AVAILABILITY = 'GET_AVAILABILITY',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION',
  REQUEST_GROUP_CHANGE = 'REQUEST_GROUP_CHANGE',
  REQUEST_LEVEL_CHANGE = 'REQUEST_LEVEL_CHANGE'
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
  gender?: ActorGender;
  level?: ActorLevel;
  groupId?: string | null;
  entityType?: ActorEntityType;
  source?: ActorDataSource;
  roleReferences?: readonly string[];
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

export interface CharacterGroupChangePayload {
  characterId: string;
  currentGroupId: string | null;
  targetGroupId: string | null;
  effectiveFrom: string;
  reason?: string;
  source: ActorDataSource;
}

export interface CharacterLevelChangePayload {
  characterId: string;
  currentLevel: ActorLevel;
  targetLevel: ActorLevel;
  currentGroupId: string | null;
  targetGroupId: string | null;
  effectiveFrom: string;
  reason?: string;
  source: ActorDataSource;
}

export type CharacterQueryRequest = DomainQueryRequest<{
  characterId?: string;
  scope?: string;
}>;

export type CharacterQueryResult = DomainQueryResult<
  CharacterProfileRef | CharacterStateRef | CharacterKnowledgeRef | CharacterAvailabilityRef | CharacterProfileRef[]
>;

export type CharacterChangeRequest =
  DomainChangeRequest<CharacterTransitionPayload | CharacterGroupChangePayload | CharacterLevelChangePayload>;

export type CharacterChangeResult =
  DomainChangeResult<CharacterStateRef | CharacterAvailabilityRef | CharacterProfileRef>;
