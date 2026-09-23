/**
 * Phase 8: Cross-Domain Reference Architecture
 *
 * Defines typed references connecting entities across distinct domains
 * using stable identifiers without full entity duplication.
 */

import { EntityID, DomainID } from './identifiers.ts';
import { EntityType } from './model-types.ts';

export interface CrossDomainReference {
  readonly referenceType: 'ENTITY_REF' | 'RELATIONSHIP_REF' | 'LOCATION_REF' | 'STATE_REF' | 'KNOWLEDGE_REF' | 'EVENT_REF' | 'PROCESS_REF' | 'CONTINUITY_REF';
  readonly sourceEntityId: string;
  readonly sourceDomain: DomainID;
  readonly targetEntityId: string;
  readonly targetEntityType: EntityType;
  readonly relationshipLabel: string;
}

export class CrossDomainReferenceResolver {
  /**
   * Helper to format a typed entity reference tag.
   */
  public static makeRef(entityType: EntityType, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  /**
   * Parses a typed entity reference tag.
   */
  public static parseRef(ref: string): { entityType: EntityType; entityId: string } | null {
    const parts = ref.split(':');
    if (parts.length < 2) return null;
    const typeStr = parts[0] as EntityType;
    const id = parts.slice(1).join(':');
    if (Object.values(EntityType).includes(typeStr)) {
      return { entityType: typeStr, entityId: id };
    }
    return null;
  }
}
