/**
 * Phase 8: Entity Type and Domain Metadata Registry
 *
 * Provides architectural metadata describing registered entity types, their authoritative owner systems,
 * identifier strategies, validation schemas, and relation capabilities.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import { EntityType } from './types.ts';

export interface EntityTypeMetadata {
  readonly entityType: EntityType;
  readonly domainId: DomainID;
  readonly defaultOwnerSystem: SystemID;
  readonly schemaVersion: string;
  readonly identifierStrategy: 'STABLE_PREFIXED' | 'UUID' | 'SEMANTIC_ID';
  readonly validationStrategy: 'STRICT_SCHEMA' | 'STRUCTURAL';
  readonly supportsTemporalValidity: boolean;
  readonly supportsHistoryRevision: boolean;
  readonly supportsContinuityHandoff: boolean;
  readonly relationCapabilities: readonly string[];
}

export class EntityTypeRegistry {
  private static registry: Map<EntityType, EntityTypeMetadata> = new Map();

  static {
    this.registerDefaults();
  }

  private static registerDefaults(): void {
    this.register({
      entityType: EntityType.CHARACTER,
      domainId: makeDomainID('CHARACTER'),
      defaultOwnerSystem: makeSystemID('CHARACTER_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['RELATIONSHIP', 'LOCATION', 'KNOWLEDGE', 'STATE', 'EVENT', 'PROCESS']
    });

    this.register({
      entityType: EntityType.RELATIONSHIP,
      domainId: makeDomainID('RELATIONSHIP'),
      defaultOwnerSystem: makeSystemID('RELATIONSHIP_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER']
    });

    this.register({
      entityType: EntityType.OBJECT,
      domainId: makeDomainID('OBJECT'),
      defaultOwnerSystem: makeSystemID('OBJECT_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER', 'LOCATION', 'EVENT', 'PROCESS']
    });

    this.register({
      entityType: EntityType.KNOWLEDGE,
      domainId: makeDomainID('KNOWLEDGE'),
      defaultOwnerSystem: makeSystemID('KNOWLEDGE_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER', 'OBJECT', 'EVENT']
    });

    this.register({
      entityType: EntityType.STATE,
      domainId: makeDomainID('STATE'),
      defaultOwnerSystem: makeSystemID('STATE_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER', 'OBJECT', 'LOCATION']
    });

    this.register({
      entityType: EntityType.LOCATION,
      domainId: makeDomainID('LOCATION'),
      defaultOwnerSystem: makeSystemID('LOCATION_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['LOCATION', 'CHARACTER', 'OBJECT', 'EVENT']
    });

    this.register({
      entityType: EntityType.EVENT,
      domainId: makeDomainID('ENGINE'),
      defaultOwnerSystem: makeSystemID('ENGINE_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER', 'OBJECT', 'LOCATION', 'PROCESS']
    });

    this.register({
      entityType: EntityType.PROCESS,
      domainId: makeDomainID('DAILY_UNIVERSE'),
      defaultOwnerSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['CHARACTER', 'OBJECT', 'LOCATION', 'EVENT', 'UNRESOLVED_CONDITION']
    });

    this.register({
      entityType: EntityType.UNRESOLVED_CONDITION,
      domainId: makeDomainID('DAILY_UNIVERSE'),
      defaultOwnerSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      schemaVersion: '1.0.0',
      identifierStrategy: 'STABLE_PREFIXED',
      validationStrategy: 'STRICT_SCHEMA',
      supportsTemporalValidity: true,
      supportsHistoryRevision: true,
      supportsContinuityHandoff: true,
      relationCapabilities: ['PROCESS', 'EVENT', 'CHARACTER', 'STATE']
    });
  }

  public static register(metadata: EntityTypeMetadata): void {
    this.registry.set(metadata.entityType, Object.freeze({ ...metadata }));
  }

  public static get(entityType: EntityType): EntityTypeMetadata | undefined {
    return this.registry.get(entityType);
  }

  public static getAll(): EntityTypeMetadata[] {
    return Array.from(this.registry.values());
  }
}
