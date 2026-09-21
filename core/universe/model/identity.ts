/**
 * Phase 8: Generic Entity Identity Model
 *
 * Provides stable, immutable identity metadata for all Universe entities.
 * Decoupled from display names, dates, story IDs, page IDs, file names, or array indices.
 */

import { EntityID, makeEntityID } from '../../types/identifiers.ts';
import { EntityType, EntityLifecycleStatus } from './types.ts';

export interface EntityIdentity {
  readonly id: EntityID;
  readonly entityType: EntityType;
  readonly displayName: string;
  readonly status: EntityLifecycleStatus;
  readonly createdAtUniverseTime?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CreateIdentityParams {
  id: string | EntityID;
  entityType: EntityType;
  displayName: string;
  status?: EntityLifecycleStatus;
  createdAtUniverseTime?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class EntityIdentityFactory {
  /**
   * Constructs an immutable, validated EntityIdentity instance.
   */
  public static create(params: CreateIdentityParams): EntityIdentity {
    if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
      throw new Error('EntityIdentity requires a non-empty stable string ID');
    }
    if (!params.displayName || typeof params.displayName !== 'string' || params.displayName.trim() === '') {
      throw new Error('EntityIdentity requires a non-empty display name');
    }

    return Object.freeze({
      id: makeEntityID(params.id.trim()),
      entityType: params.entityType,
      displayName: params.displayName.trim(),
      status: params.status ?? EntityLifecycleStatus.ACTIVE,
      createdAtUniverseTime: params.createdAtUniverseTime,
      tags: params.tags ? Object.freeze([...params.tags]) : undefined,
      metadata: params.metadata ? Object.freeze({ ...params.metadata }) : undefined
    });
  }

  /**
   * Deterministically validates that an ID conforms to standard stable format.
   */
  public static isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const trimmed = id.trim();
    // Non-empty, no whitespace within, alphanumeric with underscores/hyphens
    return trimmed.length >= 3 && /^[A-Za-z0-9_\-\.:]+$/.test(trimmed);
  }
}
