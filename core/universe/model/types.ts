/**
 * Phase 8: Universe Data Model - Core Types & Enums
 *
 * Defines the fundamental classifications, status lifecycles, and categories
 * across all universe entities, temporal views, and structural references.
 */

import { DomainID, SystemID, EntityID } from '../../types/identifiers.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export enum EntityType {
  CHARACTER = 'CHARACTER',
  RELATIONSHIP = 'RELATIONSHIP',
  OBJECT = 'OBJECT',
  KNOWLEDGE = 'KNOWLEDGE',
  STATE = 'STATE',
  LOCATION = 'LOCATION',
  EVENT = 'EVENT',
  PROCESS = 'PROCESS',
  UNRESOLVED_CONDITION = 'UNRESOLVED_CONDITION',
  BEHAVIOR = 'BEHAVIOR',
  STYLE = 'STYLE',
  CONTINUITY = 'CONTINUITY'
}

export enum EntityLifecycleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  ARCHIVED = 'ARCHIVED',
  DESTROYED = 'DESTROYED'
}

export enum AuthorityLevel {
  AUTHORITATIVE = 'AUTHORITATIVE',
  DELEGATED = 'DELEGATED',
  OBSERVER = 'OBSERVER',
  PROVISIONAL = 'PROVISIONAL',
  HYPOTHETICAL = 'HYPOTHETICAL'
}

export enum ModelValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  REQUIRES_REVALIDATION = 'REQUIRES_REVALIDATION'
}

export { TemporalStatus as TemporalAssertionCategory, TemporalStatus };
