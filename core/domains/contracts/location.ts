/**
 * Phase 7: Location Domain Integration Contract
 *
 * Authoritative Owner: LOCATION_SYSTEM
 * Domain ID: LOCATION
 *
 * Defines abstract integration contracts for querying location nodes, spatial/conceptual
 * occupancy, availability, and requesting location transitions.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const LOCATION_DOMAIN_ID: DomainID = makeDomainID('LOCATION');
export const LOCATION_OWNER_ID: SystemID = makeSystemID('LOCATION_SYSTEM');

export enum LocationType {
  PHYSICAL = 'PHYSICAL',
  ABSTRACT = 'ABSTRACT',
  CONCEPTUAL = 'CONCEPTUAL',
  VIRTUAL = 'VIRTUAL',
  TEMPORAL_NODE = 'TEMPORAL_NODE'
}

export enum LocationOperation {
  IDENTIFY = 'IDENTIFY',
  GET_LOCATION = 'GET_LOCATION',
  GET_OCCUPANCY_REF = 'GET_OCCUPANCY_REF',
  GET_AVAILABILITY = 'GET_AVAILABILITY',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION'
}

export interface LocationRef {
  locationId: string;
  locationType: LocationType;
  scope?: string;
}

export interface LocationDetailsRef {
  locationId: string;
  name: string;
  locationType: LocationType;
  parentLocationRef?: string;
  status: 'ACCESSIBLE' | 'RESTRICTED' | 'LOCKED' | 'DESTROYED' | 'UNKNOWN';
  capacity?: number;
  lastUpdated: string;
}

export interface LocationOccupancyRef {
  locationId: string;
  occupantEntityRefs: string[];
  containedObjectRefs: string[];
  occupancyCount: number;
}

export interface LocationAvailabilityRef {
  locationId: string;
  isAccessible: boolean;
  lockStatus: 'UNLOCKED' | 'LOCKED' | 'SEALED' | 'CONDITIONAL';
  accessibilityConditions?: string[];
  reason?: string;
}

export interface LocationTransitionPayload {
  locationId: string;
  entityToRelocateRef?: string;
  targetParentLocationRef?: string;
  targetLockStatus?: 'UNLOCKED' | 'LOCKED' | 'SEALED' | 'CONDITIONAL';
  transitionReason: string;
  metadata?: Record<string, unknown>;
}

export type LocationQueryRequest = DomainQueryRequest<{
  locationId?: string;
  locationType?: LocationType;
  entityId?: string;
}>;

export type LocationQueryResult = DomainQueryResult<
  LocationDetailsRef | LocationOccupancyRef | LocationAvailabilityRef | LocationRef[]
>;

export type LocationChangeRequest = DomainChangeRequest<LocationTransitionPayload>;
export type LocationChangeResult = DomainChangeResult<LocationDetailsRef | LocationOccupancyRef>;
