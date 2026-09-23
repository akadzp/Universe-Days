/**
 * Phase 7: Object Domain Integration Contract
 *
 * Authoritative Owner: OBJECT_SYSTEM
 * Domain ID: OBJECT
 *
 * Defines abstract integration contracts for querying items, possession,
 * spatial locations, and requesting object transitions (possession transfer, relocation, status changes).
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../../SHARED/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const OBJECT_DOMAIN_ID: DomainID = makeDomainID('OBJECT');
export const OBJECT_OWNER_ID: SystemID = makeSystemID('OBJECT_SYSTEM');

export enum ObjectOperation {
  IDENTIFY = 'IDENTIFY',
  GET_OBJECT = 'GET_OBJECT',
  GET_POSSESSION_REF = 'GET_POSSESSION_REF',
  GET_LOCATION_REF = 'GET_LOCATION_REF',
  GET_OWNER = 'GET_OWNER',
  GET_USER = 'GET_USER',
  GET_WEARER = 'GET_WEARER',
  GET_OBJECT_RELATIONS = 'GET_OBJECT_RELATIONS',
  RESOLVE_OBJECT_REFERENCE = 'RESOLVE_OBJECT_REFERENCE',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION',
  REQUEST_OWNERSHIP_TRANSFER = 'REQUEST_OWNERSHIP_TRANSFER'
}

export interface ObjectRef {
  objectId: string;
  category: string;
  scope?: string;
}

export interface ObjectDetailsRef {
  objectId: string;
  name: string;
  category: string;
  status: 'INTACT' | 'DEPLETED' | 'DAMAGED' | 'DESTROYED' | 'UNKNOWN' | string;
  ownerEntityRef?: string;
  holderEntityRef?: string;
  userEntityRef?: string;
  wearerEntityRef?: string;
  locationRef?: string;
  containedWithinObjectRef?: string;
  aliases?: readonly string[];
  objectType?: string;
  categoryPath?: readonly string[];
  lastUpdated: string;
}

export interface ObjectPossessionRef {
  objectId: string;
  legalOwnerRef?: string;
  currentHolderRef?: string;
  possessionType: 'HELD' | 'STORED' | 'EQUIPPED' | 'UNCLAIMED';
}

export interface ObjectLocationRef {
  objectId: string;
  locationRef: string;
  containedWithinObjectRef?: string;
}

export interface ObjectTransitionPayload {
  objectId: string;
  transferToHolderRef?: string;
  transferToLocationRef?: string;
  targetStatus?: string;
  transitionReason: string;
  metadata?: Record<string, unknown>;
}

export type ObjectQueryRequest = DomainQueryRequest<{
  objectId?: string;
  holderId?: string;
  locationId?: string;
  category?: string;
}>;

export type ObjectQueryResult = DomainQueryResult<
  ObjectDetailsRef | ObjectPossessionRef | ObjectLocationRef | ObjectRef[]
>;

export type ObjectChangeRequest = DomainChangeRequest<ObjectTransitionPayload>;
export type ObjectChangeResult = DomainChangeResult<ObjectDetailsRef | ObjectPossessionRef>;
