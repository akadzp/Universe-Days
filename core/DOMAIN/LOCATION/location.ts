/**
 * Location System Domain Model & Lifecycle
 *
 * Authoritative Owner: LOCATION_SYSTEM
 * Domain ID: LOCATION
 *
 * Implements structural and spatial location representation, supporting nested
 * containment hierarchies, adjacency relations, accessibility states, temporal
 * validity, revision history, and provenance metadata without conflating hierarchy
 * with temporal truth or character/object state.
 *
 * Non-goals:
 * - Does NOT govern Character identity, behavior, knowledge, or state.
 * - Does NOT govern Object identity, possession, or ownership.
 * - Does NOT act as Universe clock owner.
 * - Does NOT auto-repair structural inconsistencies.
 */

import { EntityIdentity, EntityIdentityFactory } from '../../SHARED/identity.ts';
import { EntityID, makeDomainID, makeEntityID, makeSystemID, SystemID } from '../../SHARED/identifiers.ts';
import { RevisionHistory, RevisionHistoryManager } from '../../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../../SHARED/provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from '../../SHARED/model-types.ts';
import { TemporalStatus } from '../../RUNTIME/TEMPORAL/types.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

/**
 * Origin source for location facts.
 */
export enum LocationDataSource {
  CANON_SEED = 'CANON_SEED',
  AUTHOR_DIRECT = 'AUTHOR_DIRECT',
  STORY_EMERGENCE = 'STORY_EMERGENCE',
  SYSTEM_IMPORT = 'SYSTEM_IMPORT',
  AI_PROPOSAL = 'AI_PROPOSAL',
  UNKNOWN = 'UNKNOWN',
  USER_DEFINED = 'USER_DEFINED',
  STORY_DERIVED = 'STORY_DERIVED'
}

/**
 * Accessibility status of a location.
 */
export const LocationAccessibilityStatus = {
  OPEN: 'OPEN',
  RESTRICTED: 'RESTRICTED',
  SEALED: 'SEALED',
  DESTROYED: 'DESTROYED'
} as const;

export type LocationAccessibilityStatus =
  (typeof LocationAccessibilityStatus)[keyof typeof LocationAccessibilityStatus];

/**
 * Spatial coordinate representation (optional, non-authoritative unless validated).
 */
export interface LocationCoordinates {
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  readonly system?: string;
}

/**
 * Temporal validity boundary for a location.
 */
export interface LocationTemporalValidity {
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly temporalCategory: TemporalStatus;
}

/**
 * Authoritative Location Entity.
 */
export interface LocationEntity {
  readonly identity: EntityIdentity;
  readonly locationType: string; // e.g. 'REALM', 'REGION', 'SETTLEMENT', 'STRUCTURE', 'ROOM', 'INTERIOR_SPACE'
  readonly parentLocationRef: string | null;
  readonly adjacentLocationRefs: readonly string[];
  readonly containedLocationRefs: readonly string[];
  readonly coordinates?: LocationCoordinates;
  readonly accessibilityStatus: LocationAccessibilityStatus;
  readonly temporalValidity: LocationTemporalValidity;
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
  readonly source?: LocationDataSource;
  readonly fieldSources?: Readonly<Record<string, LocationDataSource>>;
  readonly aliases?: readonly string[];
  readonly description?: string;
}

export interface CreateLocationInput {
  readonly id: string;
  readonly displayName: string;
  readonly locationType?: string;
  readonly parentLocationRef?: string | null;
  readonly adjacentLocationRefs?: readonly string[];
  readonly containedLocationRefs?: readonly string[];
  readonly coordinates?: LocationCoordinates;
  readonly accessibilityStatus?: LocationAccessibilityStatus;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly temporalCategory?: TemporalStatus;
  readonly source?: LocationDataSource;
  readonly continuityReference?: string;
  readonly aliases?: readonly string[];
  readonly description?: string;
  readonly authorityLevel?: AuthorityLevel;
  readonly recordedTime?: string;
  readonly reason?: string;
}

export interface RenameLocationInput {
  readonly newName: string;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
  readonly retainOldAsAlias?: boolean;
}

export interface ChangeLocationParentInput {
  readonly newParentLocationRef: string | null;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface ChangeLocationAccessibilityInput {
  readonly newStatus: LocationAccessibilityStatus;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface UpdateLocationAdjacencyInput {
  readonly adjacentLocationRefs: readonly string[];
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface UpdateLocationCoordinatesInput {
  readonly coordinates?: LocationCoordinates;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface UpdateLocationTypeInput {
  readonly newLocationType: string;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface UpdateLocationTemporalInput {
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly temporalCategory?: TemporalStatus;
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

export interface UpdateContainedLocationsInput {
  readonly containedLocationRefs: readonly string[];
  readonly actor: SystemID;
  readonly effectiveTime: string;
  readonly reason: string;
  readonly source?: LocationDataSource;
}

/**
 * Operational Location Domain Manager
 */
export class LocationManager {
  private static readonly LOCATION_OWNER: SystemID = makeSystemID('LOCATION_SYSTEM');
  private static readonly LOCATION_DOMAIN = makeDomainID('LOCATION');

  /**
   * Creates an authoritative Location via manual user definition.
   */
  public static createManual(input: CreateLocationInput): Result<LocationEntity> {
    const source = input.source ?? LocationDataSource.USER_DEFINED;

    // Reject AI proposal or unknown source claiming authoritative creation directly
    if (source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot create authoritative location from AI_PROPOSAL directly. Proposal must be reviewed.'
      );
    }
    if (source === LocationDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot create authoritative location with UNKNOWN source.'
      );
    }

    if (!input.id || !EntityIdentityFactory.isValidId(input.id)) {
      return failure(EngineErrorCode.INVALID_ENTITY_IDENTITY, `Location ID '${input.id}' is invalid`);
    }

    if (!input.displayName || input.displayName.trim() === '') {
      return failure(EngineErrorCode.INVALID_ENTITY_IDENTITY, 'Location display name cannot be empty');
    }

    // Self-parent check
    if (input.parentLocationRef && input.parentLocationRef === input.id) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot be its own parent');
    }

    // Self-adjacent check
    if (input.adjacentLocationRefs && input.adjacentLocationRefs.includes(input.id)) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot be adjacent to itself');
    }

    // Self-contained check
    if (input.containedLocationRefs && input.containedLocationRefs.includes(input.id)) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot contain itself');
    }

    // Temporal validity check
    const fromTime = Date.parse(input.effectiveFrom);
    if (isNaN(fromTime)) {
      return failure(EngineErrorCode.INVALID_DATE, `effectiveFrom date '${input.effectiveFrom}' is invalid`);
    }

    if (input.effectiveTo) {
      const toTime = Date.parse(input.effectiveTo);
      if (isNaN(toTime) || toTime < fromTime) {
        return failure(EngineErrorCode.INVALID_INTERVAL, 'effectiveTo cannot precede effectiveFrom');
      }
    }

    // Coordinates check
    if (input.coordinates) {
      const { x, y, z } = input.coordinates;
      if (x !== undefined && (typeof x !== 'number' || isNaN(x))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate x must be a valid number');
      }
      if (y !== undefined && (typeof y !== 'number' || isNaN(y))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate y must be a valid number');
      }
      if (z !== undefined && (typeof z !== 'number' || isNaN(z))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate z must be a valid number');
      }
    }

    const recordedTime = input.recordedTime ?? input.effectiveFrom;
    const history = RevisionHistoryManager.createInitial(
      this.LOCATION_OWNER,
      recordedTime,
      input.reason ?? `Created location ${input.displayName}`
    );

    const authorityLevel = input.authorityLevel ?? AuthorityLevel.AUTHORITATIVE;
    const provenance = createProvenanceMetadata(
      this.LOCATION_OWNER,
      this.LOCATION_DOMAIN,
      history.currentRevisionId,
      authorityLevel
    );

    const identity = EntityIdentityFactory.create({
      id: input.id,
      entityType: EntityType.LOCATION,
      displayName: input.displayName.trim(),
      status: EntityLifecycleStatus.ACTIVE
    });

    const location: LocationEntity = {
      identity,
      locationType: input.locationType ?? 'STRUCTURE',
      parentLocationRef: input.parentLocationRef ?? null,
      adjacentLocationRefs: input.adjacentLocationRefs ? Object.freeze([...input.adjacentLocationRefs]) : Object.freeze([]),
      containedLocationRefs: input.containedLocationRefs ? Object.freeze([...input.containedLocationRefs]) : Object.freeze([]),
      coordinates: input.coordinates ? Object.freeze({ ...input.coordinates }) : undefined,
      accessibilityStatus: input.accessibilityStatus ?? 'OPEN',
      temporalValidity: Object.freeze({
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        temporalCategory: input.temporalCategory ?? TemporalStatus.ACTUAL
      }),
      continuityReference: input.continuityReference,
      history,
      provenance,
      source,
      fieldSources: Object.freeze({
        identity: source,
        locationType: source,
        parentLocationRef: source,
        accessibilityStatus: source,
        temporalValidity: source
      }),
      aliases: input.aliases ? Object.freeze([...input.aliases]) : Object.freeze([]),
      description: input.description
    };

    return success(Object.freeze(location));
  }

  /**
   * Derives a Location from story text, strictly retaining unknown values.
   */
  public static deriveFromStory(input: CreateLocationInput): Result<LocationEntity> {
    return this.createManual({
      ...input,
      source: LocationDataSource.STORY_DERIVED
    });
  }

  /**
   * Renames a Location while preserving its stable ID and recording revision history.
   */
  public static renameLocation(loc: LocationEntity, input: RenameLocationInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location name from AI_PROPOSAL directly.'
      );
    }

    const trimmed = input.newName.trim();
    if (!trimmed) {
      return failure(EngineErrorCode.INVALID_ENTITY_IDENTITY, 'New location name cannot be empty');
    }

    if (trimmed === loc.identity.displayName) {
      return failure(
        EngineErrorCode.IDEMPOTENCY_CONFLICT,
        `Location '${loc.identity.id}' already has display name '${trimmed}'`
      );
    }

    const aliases = [...(loc.aliases ?? [])];
    if (input.retainOldAsAlias && !aliases.includes(loc.identity.displayName)) {
      aliases.push(loc.identity.displayName);
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['identity.displayName'],
      input.reason
    );

    const updatedIdentity = EntityIdentityFactory.create({
      id: loc.identity.id,
      entityType: loc.identity.entityType,
      displayName: trimmed,
      status: loc.identity.status
    });

    const updated: LocationEntity = {
      ...loc,
      identity: updatedIdentity,
      aliases: Object.freeze(aliases),
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Moves a Location to a new parent in the hierarchy.
   */
  public static changeParent(loc: LocationEntity, input: ChangeLocationParentInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location parent hierarchy from AI_PROPOSAL directly.'
      );
    }

    if (input.newParentLocationRef === loc.identity.id) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot be its own parent');
    }

    if (loc.parentLocationRef === input.newParentLocationRef) {
      return failure(
        EngineErrorCode.IDEMPOTENCY_CONFLICT,
        `Location '${loc.identity.id}' already has parent '${input.newParentLocationRef}'`
      );
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['parentLocationRef'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      parentLocationRef: input.newParentLocationRef,
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates accessibility status (e.g. OPEN, RESTRICTED, SEALED, DESTROYED).
   */
  public static changeAccessibility(loc: LocationEntity, input: ChangeLocationAccessibilityInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location accessibility from AI_PROPOSAL directly.'
      );
    }

    const validStatuses: LocationAccessibilityStatus[] = ['OPEN', 'RESTRICTED', 'SEALED', 'DESTROYED'];
    if (!validStatuses.includes(input.newStatus)) {
      return failure(EngineErrorCode.INVALID_STATE, `Invalid accessibility status '${input.newStatus}'`);
    }

    if (loc.accessibilityStatus === input.newStatus) {
      return failure(
        EngineErrorCode.IDEMPOTENCY_CONFLICT,
        `Location '${loc.identity.id}' already has accessibility '${input.newStatus}'`
      );
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['accessibilityStatus'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      accessibilityStatus: input.newStatus,
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates adjacency connections.
   */
  public static updateAdjacency(loc: LocationEntity, input: UpdateLocationAdjacencyInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location adjacency from AI_PROPOSAL directly.'
      );
    }

    if (input.adjacentLocationRefs.includes(loc.identity.id)) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot be adjacent to itself');
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['adjacentLocationRefs'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      adjacentLocationRefs: Object.freeze([...input.adjacentLocationRefs]),
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates coordinates.
   */
  public static updateCoordinates(loc: LocationEntity, input: UpdateLocationCoordinatesInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location coordinates from AI_PROPOSAL directly.'
      );
    }

    if (input.coordinates) {
      const { x, y, z } = input.coordinates;
      if (x !== undefined && (typeof x !== 'number' || isNaN(x))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate x must be a valid number');
      }
      if (y !== undefined && (typeof y !== 'number' || isNaN(y))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate y must be a valid number');
      }
      if (z !== undefined && (typeof z !== 'number' || isNaN(z))) {
        return failure(EngineErrorCode.INVALID_STATE, 'Coordinate z must be a valid number');
      }
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['coordinates'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      coordinates: input.coordinates ? Object.freeze({ ...input.coordinates }) : undefined,
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates location classification type.
   */
  public static updateType(loc: LocationEntity, input: UpdateLocationTypeInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location type from AI_PROPOSAL directly.'
      );
    }

    if (!input.newLocationType || input.newLocationType.trim() === '') {
      return failure(EngineErrorCode.INVALID_STATE, 'Location type cannot be empty');
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['locationType'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      locationType: input.newLocationType.trim(),
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates temporal validity.
   */
  public static updateTemporalValidity(loc: LocationEntity, input: UpdateLocationTemporalInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate location temporal validity from AI_PROPOSAL directly.'
      );
    }

    const fromTime = Date.parse(input.effectiveFrom);
    if (isNaN(fromTime)) {
      return failure(EngineErrorCode.INVALID_DATE, `effectiveFrom date '${input.effectiveFrom}' is invalid`);
    }

    if (input.effectiveTo) {
      const toTime = Date.parse(input.effectiveTo);
      if (isNaN(toTime) || toTime < fromTime) {
        return failure(EngineErrorCode.INVALID_INTERVAL, 'effectiveTo cannot precede effectiveFrom');
      }
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['temporalValidity'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      temporalValidity: Object.freeze({
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        temporalCategory: input.temporalCategory ?? loc.temporalValidity.temporalCategory
      }),
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }

  /**
   * Updates contained child locations.
   */
  public static updateContainedLocations(loc: LocationEntity, input: UpdateContainedLocationsInput): Result<LocationEntity> {
    if (input.source === LocationDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot mutate contained locations from AI_PROPOSAL directly.'
      );
    }

    if (input.containedLocationRefs.includes(loc.identity.id)) {
      return failure(EngineErrorCode.CIRCULAR_ENTITY_REFERENCE, 'Location cannot contain itself');
    }

    const updatedHistory = RevisionHistoryManager.appendRevision(
      loc.history,
      input.actor,
      input.effectiveTime,
      ['containedLocationRefs'],
      input.reason
    );

    const updated: LocationEntity = {
      ...loc,
      containedLocationRefs: Object.freeze([...input.containedLocationRefs]),
      history: updatedHistory
    };

    return success(Object.freeze(updated));
  }
}
