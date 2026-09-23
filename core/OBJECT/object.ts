/**
 * Object System Domain Model & Lifecycle
 *
 * Authoritative Owner: OBJECT_SYSTEM
 * Domain ID: OBJECT
 *
 * Manages object identity, physical/digital nature, category hierarchies,
 * attributes, ownership, possession, current user, wearer, location,
 * containment, condition, status, access, revision history, provenance,
 * story emergence, and validated mutations.
 *
 * Non-goals:
 * Does NOT govern Actor identity, behavior, knowledge, or Actor-Actor relationships.
 */

import { EntityIdentity, EntityIdentityFactory } from '../SHARED/identity.ts';
import { EntityID, makeDomainID, makeEntityID, makeSystemID, SystemID } from '../SHARED/identifiers.ts';
import { RevisionHistory, RevisionHistoryManager } from '../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../SHARED/provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from '../SHARED/model-types.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';

/**
 * Fundamental nature of an object.
 */
export enum ObjectType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Identity verification status of an object.
 */
export enum ObjectIdentityStatus {
  CONFIRMED = 'CONFIRMED',
  PROVISIONAL = 'PROVISIONAL',
  UNKNOWN = 'UNKNOWN',
  RETIRED = 'RETIRED'
}

/**
 * Access availability state of an object.
 */
export type ObjectAccessStatus =
  | 'ACCESSIBLE'
  | 'RESTRICTED'
  | 'LOCKED'
  | 'INACCESSIBLE'
  | 'DESTROYED'
  | 'UNKNOWN';

/**
 * Physical possession / holding status.
 */
export enum ObjectPossessionStatus {
  HELD = 'HELD',
  STORED = 'STORED',
  EQUIPPED = 'EQUIPPED',
  UNCLAIMED = 'UNCLAIMED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Physical or structural condition of an object.
 */
export enum ObjectCondition {
  INTACT = 'INTACT',
  DAMAGED = 'DAMAGED',
  DEPLETED = 'DEPLETED',
  WORN = 'WORN',
  BROKEN = 'BROKEN',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Operational / lifecycle status of an object.
 */
export enum ObjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MISSING = 'MISSING',
  DESTROYED = 'DESTROYED',
  RETIRED = 'RETIRED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Origin source for object facts.
 */
export enum ObjectDataSource {
  USER_DEFINED = 'USER_DEFINED',
  STORY_DERIVED = 'STORY_DERIVED',
  AI_PROPOSAL = 'AI_PROPOSAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Outcome of evaluating an object emergence candidate from story.
 */
export enum ObjectEmergenceResult {
  CREATED = 'CREATED',
  IGNORED_TRANSIENT = 'IGNORED_TRANSIENT',
  REQUIRES_RESOLUTION = 'REQUIRES_RESOLUTION',
  BLOCKED = 'BLOCKED'
}

/**
 * Semantic relationships between objects.
 */
export enum ObjectRelationType {
  PART_OF = 'PART_OF',
  CONTAINS = 'CONTAINS',
  ATTACHED_TO = 'ATTACHED_TO',
  CONNECTED_TO = 'CONNECTED_TO',
  DEPENDS_ON = 'DEPENDS_ON',
  FUNCTIONALLY_RELATED = 'FUNCTIONALLY_RELATED',
  ASSOCIATED_WITH = 'ASSOCIATED_WITH'
}

/**
 * Object-to-object relation entity.
 */
export interface ObjectRelationEntity {
  readonly relationId: string;
  readonly subjectRef: EntityID;
  readonly targetRef: EntityID;
  readonly relationType: ObjectRelationType | string;
  readonly direction: 'UNIDIRECTIONAL' | 'BIDIRECTIONAL';
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

/**
 * Full Object Entity schema.
 * Preserves all legacy Phase 8 fields for backwards compatibility while adding
 * first-class semantic fields for the complete Object System.
 */
export interface ObjectEntity {
  // Core Identity & Legacy compatibility
  readonly identity: EntityIdentity;
  readonly category: string;
  readonly ownershipRef: EntityID | null;    // Authoritative owner (Actor or System)
  readonly possessionRef: EntityID | null;   // Current physical holder / possessor
  readonly locationRef: string;              // Current physical location ID
  readonly accessStatus: ObjectAccessStatus;
  readonly quantity?: number;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;

  // Semantic Object System enhancements
  readonly objectName?: string;
  readonly aliases: readonly string[];
  readonly objectType: ObjectType | string;
  readonly categoryPath?: readonly string[];
  readonly identityStatus?: ObjectIdentityStatus;
  readonly possessionStatus?: ObjectPossessionStatus;
  readonly currentUserRef?: EntityID | null;         // Actor currently using the object
  readonly currentWearerRef?: EntityID | null;       // Actor currently wearing the object
  readonly containedWithinObjectRef?: EntityID | null; // Parent container object
  readonly condition?: ObjectCondition | string;
  readonly status?: ObjectStatus | string;
  readonly source?: ObjectDataSource;
  readonly fieldSources?: Readonly<Record<string, ObjectDataSource>>;
  readonly relations?: readonly ObjectRelationEntity[];
}

export interface CreateObjectInput {
  readonly objectId: string;
  readonly displayName?: string;
  readonly objectName?: string;
  readonly aliases?: readonly string[];
  readonly objectType?: ObjectType | string;
  readonly category: string;
  readonly categoryPath?: readonly string[];
  readonly ownershipRef?: EntityID | null;
  readonly possessionRef?: EntityID | null;
  readonly possessionStatus?: ObjectPossessionStatus;
  readonly currentUserRef?: EntityID | null;
  readonly currentWearerRef?: EntityID | null;
  readonly locationRef?: string;
  readonly containedWithinObjectRef?: EntityID | null;
  readonly accessStatus?: ObjectAccessStatus;
  readonly condition?: ObjectCondition | string;
  readonly status?: ObjectStatus | string;
  readonly identityStatus?: ObjectIdentityStatus;
  readonly quantity?: number;
  readonly properties?: Record<string, unknown>;
  readonly effectiveTime?: string;
  readonly source?: ObjectDataSource;
  readonly trigger?: string;
  readonly actorId?: SystemID;
  readonly relations?: readonly ObjectRelationEntity[];
  readonly continuityReference?: string;
}

export interface EmergeFromStoryInput {
  readonly mention: string;
  readonly contextDescription?: string;
  readonly objectType?: ObjectType | string;
  readonly category?: string;
  readonly categoryPath?: readonly string[];
  readonly ownerCandidate?: EntityID | null;
  readonly holderCandidate?: EntityID | null;
  readonly userCandidate?: EntityID | null;
  readonly wearerCandidate?: EntityID | null;
  readonly locationCandidate?: string;
  readonly conditionCandidate?: ObjectCondition | string;
  readonly isNarrativelySignificant?: boolean;
  readonly isRecurring?: boolean;
  readonly isOwnedOrPossessed?: boolean;
  readonly hasSubstantialInteraction?: boolean;
  readonly existingObjects?: Readonly<Record<string, ObjectEntity>>;
  readonly effectiveTime?: string;
  readonly source?: ObjectDataSource;
  readonly proposedId?: string;
}

export interface ObjectEmergenceEvaluation {
  readonly result: ObjectEmergenceResult;
  readonly object?: ObjectEntity;
  readonly candidateObjectIds?: readonly string[];
  readonly reason: string;
}

export interface BaseObjectMutationInput {
  readonly effectiveTime: string;
  readonly trigger: string;
  readonly source: ObjectDataSource;
  readonly actorId?: SystemID;
}

export interface TransferOwnershipInput extends BaseObjectMutationInput {
  readonly currentOwner: EntityID | null; // Predecessor check to prevent stale write
  readonly targetOwner: EntityID | null;
}

export interface TransferPossessionInput extends BaseObjectMutationInput {
  readonly currentHolder?: EntityID | null;
  readonly targetHolder: EntityID | null;
  readonly possessionStatus?: ObjectPossessionStatus;
}

export interface ChangeUserInput extends BaseObjectMutationInput {
  readonly targetUser: EntityID | null;
}

export interface ChangeWearerInput extends BaseObjectMutationInput {
  readonly targetWearer: EntityID | null;
}

export interface RelocateObjectInput extends BaseObjectMutationInput {
  readonly targetLocationRef: string;
  readonly containedWithinObjectRef?: EntityID | null;
}

export interface ChangeContainerInput extends BaseObjectMutationInput {
  readonly containedWithinObjectRef: EntityID | null;
}

export interface ChangeConditionInput extends BaseObjectMutationInput {
  readonly targetCondition: ObjectCondition | string;
}

export interface ChangeStatusInput extends BaseObjectMutationInput {
  readonly targetStatus: ObjectStatus | string;
}

export interface ChangeAccessInput extends BaseObjectMutationInput {
  readonly targetAccess: ObjectAccessStatus;
}

export interface RenameObjectInput extends BaseObjectMutationInput {
  readonly newName: string;
  readonly preserveOldAsAlias?: boolean;
}

export interface UpdateAliasesInput extends BaseObjectMutationInput {
  readonly aliases: readonly string[];
}

export interface UpdateCategoryInput extends BaseObjectMutationInput {
  readonly category: string;
  readonly categoryPath?: readonly string[];
}

export interface UpdateAttributesInput extends BaseObjectMutationInput {
  readonly properties: Record<string, unknown>;
}

export interface CreateObjectRelationInput {
  readonly relationId: string;
  readonly subjectRef: EntityID;
  readonly targetRef: EntityID;
  readonly relationType: ObjectRelationType | string;
  readonly direction?: 'UNIDIRECTIONAL' | 'BIDIRECTIONAL';
  readonly effectiveTime?: string;
  readonly source?: ObjectDataSource;
  readonly actorId?: SystemID;
}

/**
 * Object System Domain Lifecycle Manager
 *
 * Implements authoritative, deterministic mutations and queries for objects.
 */
export class ObjectSystem {
  public static readonly DOMAIN_ID = makeDomainID('OBJECT');
  public static readonly OWNER_ID = makeSystemID('OBJECT_SYSTEM');

  /**
   * Creates a new ObjectEntity with complete validation.
   */
  public static createObject(input: CreateObjectInput): Result<ObjectEntity> {
    if (!input.objectId || !EntityIdentityFactory.isValidId(input.objectId)) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        `Invalid or empty objectId: "${input.objectId}"`
      );
    }

    if (!input.category || input.category.trim() === '') {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        'Category is required for ObjectEntity creation.'
      );
    }

    const source = input.source ?? ObjectDataSource.USER_DEFINED;
    if (!input.effectiveTime?.trim()) {
      return failure(EngineErrorCode.INVALID_DOMAIN_REQUEST, 'Object creation requires explicit effectiveTime from Universe/command context; wall-clock fallback is prohibited.');
    }
    if (source === ObjectDataSource.AI_PROPOSAL) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'AI_PROPOSAL cannot create an authoritative Canon object directly without human/story validation.'
      );
    }

    if (source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'UNKNOWN source cannot create an authoritative Canon object.'
      );
    }

    const effectiveTime = input.effectiveTime.trim();
    const actor = input.actorId ?? this.OWNER_ID;
    const displayName = input.displayName ?? input.objectName ?? input.objectId;
    const objectName = input.objectName ?? displayName;

    const identity = EntityIdentityFactory.create({
      id: input.objectId,
      entityType: EntityType.OBJECT,
      displayName,
      status: EntityLifecycleStatus.ACTIVE
    });

    const revisionHistory = RevisionHistoryManager.createInitial(
      actor,
      effectiveTime,
      input.trigger ?? `Object ${input.objectId} initialized`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      revisionHistory.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources: Record<string, ObjectDataSource> = {
      identity: source,
      objectName: source,
      category: source,
      ownershipRef: source,
      possessionRef: source,
      locationRef: source,
      condition: source,
      status: source,
      accessStatus: source
    };

    const entity: ObjectEntity = Object.freeze({
      identity,
      category: input.category,
      ownershipRef: input.ownershipRef ?? null,
      possessionRef: input.possessionRef ?? null,
      locationRef: input.locationRef ?? '',
      accessStatus: input.accessStatus ?? 'ACCESSIBLE',
      quantity: input.quantity ?? 1,
      properties: input.properties ? Object.freeze({ ...input.properties }) : undefined,
      temporalValidity: Object.freeze({
        effectiveFrom: effectiveTime,
        temporalCategory: TemporalStatus.ACTUAL
      }),
      continuityReference: input.continuityReference,
      history: revisionHistory,
      provenance,

      objectName,
      aliases: Object.freeze([...(input.aliases ?? [])]),
      objectType: input.objectType ?? ObjectType.PHYSICAL,
      categoryPath: input.categoryPath ? Object.freeze([...input.categoryPath]) : undefined,
      identityStatus: input.identityStatus ?? ObjectIdentityStatus.CONFIRMED,
      possessionStatus: input.possessionStatus ?? (input.possessionRef ? ObjectPossessionStatus.HELD : ObjectPossessionStatus.UNCLAIMED),
      currentUserRef: input.currentUserRef ?? null,
      currentWearerRef: input.currentWearerRef ?? null,
      containedWithinObjectRef: input.containedWithinObjectRef ?? null,
      condition: input.condition ?? ObjectCondition.INTACT,
      status: input.status ?? ObjectStatus.ACTIVE,
      source,
      fieldSources: Object.freeze(fieldSources),
      relations: input.relations ? Object.freeze([...input.relations]) : undefined
    });

    return success(entity);
  }

  /**
   * Deterministically evaluates whether a mentioned object from story should emerge
   * as a persistent ObjectEntity, be ignored as transient, or requires resolution.
   */
  public static emergeFromStory(input: EmergeFromStoryInput): ObjectEmergenceEvaluation {
    const mention = (input.mention ?? '').trim();
    if (!mention) {
      return {
        result: ObjectEmergenceResult.BLOCKED,
        reason: 'Mention cannot be empty.'
      };
    }

    const source = input.source ?? ObjectDataSource.STORY_DERIVED;
    if (source === ObjectDataSource.AI_PROPOSAL) {
      return {
        result: ObjectEmergenceResult.BLOCKED,
        reason: 'AI proposals cannot establish Canon objects directly without human/story validation.'
      };
    }

    // Check transient condition:
    // Mere mentions ("sebuah gelas", "sebuah kursi") without narrative influence or persistence
    const isSignificant =
      Boolean(input.isNarrativelySignificant) ||
      Boolean(input.isRecurring) ||
      Boolean(input.isOwnedOrPossessed) ||
      Boolean(input.hasSubstantialInteraction) ||
      Boolean(input.ownerCandidate) ||
      Boolean(input.holderCandidate) ||
      Boolean(input.wearerCandidate);

    if (!isSignificant) {
      return {
        result: ObjectEmergenceResult.IGNORED_TRANSIENT,
        reason: `Object mention "${mention}" lacks continuity relevance, ownership, or narrative significance to warrant persistence.`
      };
    }

    // Check existing objects to prevent duplicate emergence
    const existing = Object.values(input.existingObjects ?? {});
    const normalizedMention = mention.toLowerCase();

    const matchingCandidates: string[] = [];
    for (const obj of existing) {
      const namesToTest = [
        obj.identity.displayName.toLowerCase(),
        (obj.objectName ?? '').toLowerCase(),
        ...obj.aliases.map(a => a.toLowerCase())
      ];
      if (namesToTest.includes(normalizedMention)) {
        matchingCandidates.push(obj.identity.id);
      }
    }

    if (matchingCandidates.length === 1) {
      return {
        result: ObjectEmergenceResult.REQUIRES_RESOLUTION,
        candidateObjectIds: matchingCandidates,
        reason: `Mention "${mention}" matches existing object ${matchingCandidates[0]}. Requires reference resolution instead of creating duplicate.`
      };
    } else if (matchingCandidates.length > 1) {
      return {
        result: ObjectEmergenceResult.REQUIRES_RESOLUTION,
        candidateObjectIds: matchingCandidates,
        reason: `Mention "${mention}" ambiguously matches multiple existing objects (${matchingCandidates.join(', ')}). Requires explicit resolution.`
      };
    }

    // Story text is evidence/proposal only. Canon materialization must use an explicit authoritative Event/Command path.
    return {
      result: ObjectEmergenceResult.REQUIRES_RESOLUTION,
      reason: `Story mention "${mention}" is eligible for persistence but cannot create Canon directly. Resolve it through an authoritative Event/Command mutation.`
    };
  }

  /**
   * Transfers ownership of an object with mandatory predecessor matching to prevent stale writes.
   */
  public static transferOwnership(
    obj: ObjectEntity,
    input: TransferOwnershipInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot transfer ownership using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    // Predecessor verification
    if (obj.ownershipRef !== input.currentOwner) {
      return failure(
        EngineErrorCode.IDEMPOTENCY_CONFLICT,
        `Stale write detected for object ${obj.identity.id}: expected current owner "${input.currentOwner ?? 'null'}", but found "${obj.ownershipRef ?? 'null'}".`
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['ownershipRef'],
      `Ownership transferred from ${input.currentOwner ?? 'none'} to ${input.targetOwner ?? 'none'}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      ownershipRef: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      ownershipRef: input.targetOwner,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Transfers possession / current physical holder of an object.
   */
  public static transferPossession(
    obj: ObjectEntity,
    input: TransferPossessionInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot transfer possession using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    if (input.currentHolder !== undefined && obj.possessionRef !== input.currentHolder) {
      return failure(
        EngineErrorCode.IDEMPOTENCY_CONFLICT,
        `Stale possession write for object ${obj.identity.id}: expected holder "${input.currentHolder ?? 'null'}", but found "${obj.possessionRef ?? 'null'}".`
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['possessionRef', 'possessionStatus'],
      `Possession transferred to ${input.targetHolder ?? 'none'}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const newPossessionStatus = input.possessionStatus ?? (input.targetHolder ? ObjectPossessionStatus.HELD : ObjectPossessionStatus.UNCLAIMED);

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      possessionRef: input.source,
      possessionStatus: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      possessionRef: input.targetHolder,
      possessionStatus: newPossessionStatus,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Updates current user of the object.
   */
  public static changeUser(
    obj: ObjectEntity,
    input: ChangeUserInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change user using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['currentUserRef'],
      `Current user changed to ${input.targetUser ?? 'none'}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      currentUserRef: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      currentUserRef: input.targetUser,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Updates current wearer of the object (clothing, accessory, jewelry).
   */
  public static changeWearer(
    obj: ObjectEntity,
    input: ChangeWearerInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change wearer using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['currentWearerRef'],
      `Current wearer changed to ${input.targetWearer ?? 'none'}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      currentWearerRef: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      currentWearerRef: input.targetWearer,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Relocates the object to a spatial location or within another object.
   */
  public static relocateObject(
    obj: ObjectEntity,
    input: RelocateObjectInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot relocate object using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['locationRef', 'containedWithinObjectRef'],
      `Relocated to ${input.targetLocationRef || 'UNKNOWN'}${input.containedWithinObjectRef ? ` (inside ${input.containedWithinObjectRef})` : ''}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      locationRef: input.source,
      containedWithinObjectRef: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      locationRef: input.targetLocationRef,
      containedWithinObjectRef: input.containedWithinObjectRef ?? null,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Changes container parent object.
   */
  public static changeContainer(
    obj: ObjectEntity,
    input: ChangeContainerInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change container using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    if (input.containedWithinObjectRef === obj.identity.id) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        `Object ${obj.identity.id} cannot be contained within itself.`
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['containedWithinObjectRef'],
      `Container changed to ${input.containedWithinObjectRef ?? 'none'}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      containedWithinObjectRef: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      containedWithinObjectRef: input.containedWithinObjectRef,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Modifies condition (e.g. damage, repair, wear). Preserves Object ID!
   */
  public static changeCondition(
    obj: ObjectEntity,
    input: ChangeConditionInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change condition using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['condition'],
      `Condition changed from ${obj.condition ?? 'UNKNOWN'} to ${input.targetCondition}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      condition: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      condition: input.targetCondition,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Modifies status (e.g. active, missing, destroyed). Preserves Object ID historically!
   */
  public static changeStatus(
    obj: ObjectEntity,
    input: ChangeStatusInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change status using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['status'],
      `Status changed from ${obj.status ?? 'UNKNOWN'} to ${input.targetStatus}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      status: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      status: input.targetStatus,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Modifies access status.
   */
  public static changeAccess(
    obj: ObjectEntity,
    input: ChangeAccessInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot change access status using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['accessStatus'],
      `Access changed from ${obj.accessStatus} to ${input.targetAccess}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      accessStatus: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      accessStatus: input.targetAccess,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Renames object. Preserves Object ID and optionally retains old name as alias.
   */
  public static renameObject(
    obj: ObjectEntity,
    input: RenameObjectInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot rename object using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const oldName = obj.objectName ?? obj.identity.displayName;
    const aliases = new Set(obj.aliases);
    if (input.preserveOldAsAlias && oldName && oldName !== input.newName) {
      aliases.add(oldName);
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['objectName', 'aliases'],
      `Renamed from "${oldName}" to "${input.newName}". Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const updatedIdentity = EntityIdentityFactory.create({
      id: obj.identity.id,
      entityType: obj.identity.entityType,
      displayName: input.newName,
      status: obj.identity.status
    });

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      objectName: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      identity: updatedIdentity,
      objectName: input.newName,
      aliases: Object.freeze(Array.from(aliases)),
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Updates aliases for the object.
   */
  public static updateAliases(
    obj: ObjectEntity,
    input: UpdateAliasesInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot update aliases using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['aliases'],
      `Aliases updated to: [${input.aliases.join(', ')}]. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      aliases: Object.freeze([...input.aliases]),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Updates category and categoryPath.
   */
  public static updateCategory(
    obj: ObjectEntity,
    input: UpdateCategoryInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot update category using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['category', 'categoryPath'],
      `Category updated to ${input.category}${input.categoryPath ? ` (path: [${input.categoryPath.join(', ')}])` : ''}. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const fieldSources = {
      ...(obj.fieldSources ?? {}),
      category: input.source
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      category: input.category,
      categoryPath: input.categoryPath ? Object.freeze([...input.categoryPath]) : obj.categoryPath,
      fieldSources: Object.freeze(fieldSources),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Updates extensible properties/attributes.
   */
  public static updateAttributes(
    obj: ObjectEntity,
    input: UpdateAttributesInput
  ): Result<ObjectEntity> {
    if (input.source === ObjectDataSource.AI_PROPOSAL || input.source === ObjectDataSource.UNKNOWN) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        'Cannot update attributes using unvalidated AI_PROPOSAL or UNKNOWN source.'
      );
    }

    const actor = input.actorId ?? this.OWNER_ID;
    const history = RevisionHistoryManager.appendRevision(
      obj.history,
      actor,
      input.effectiveTime,
      ['properties'],
      `Attributes updated: keys [${Object.keys(input.properties).join(', ')}]. Trigger: ${input.trigger}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const updatedProperties = {
      ...(obj.properties ?? {}),
      ...input.properties
    };

    const updated: ObjectEntity = Object.freeze({
      ...obj,
      properties: Object.freeze(updatedProperties),
      history,
      provenance
    });

    return success(updated);
  }

  /**
   * Creates an object-to-object relation entity.
   */
  public static createObjectRelation(input: CreateObjectRelationInput): Result<ObjectRelationEntity> {
    if (!input.relationId || !EntityIdentityFactory.isValidId(input.relationId)) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        `Invalid relationId: "${input.relationId}"`
      );
    }

    if (!input.subjectRef || !input.targetRef) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        'Both subjectRef and targetRef are required for ObjectRelationEntity.'
      );
    }

    if (input.subjectRef === input.targetRef) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        `Illegal self-relation: subjectRef and targetRef cannot both be "${input.subjectRef}".`
      );
    }

    const effectiveTime = input.effectiveTime ?? new Date().toISOString();
    const actor = input.actorId ?? this.OWNER_ID;

    const history = RevisionHistoryManager.createInitial(
      actor,
      effectiveTime,
      `Relation ${input.relationId} established: ${input.subjectRef} -[${input.relationType}]-> ${input.targetRef}`
    );

    const provenance = createProvenanceMetadata(
      actor,
      this.DOMAIN_ID,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const relation: ObjectRelationEntity = Object.freeze({
      relationId: input.relationId,
      subjectRef: input.subjectRef,
      targetRef: input.targetRef,
      relationType: input.relationType,
      direction: input.direction ?? 'UNIDIRECTIONAL',
      temporalValidity: Object.freeze({
        effectiveFrom: effectiveTime,
        temporalCategory: TemporalStatus.ACTUAL
      }),
      history,
      provenance
    });

    return success(relation);
  }

  /**
   * Attaches an object relation to an ObjectEntity.
   */
  public static attachRelation(obj: ObjectEntity, relation: ObjectRelationEntity): ObjectEntity {
    const existing = obj.relations ?? [];
    const filtered = existing.filter(r => r.relationId !== relation.relationId);
    return Object.freeze({
      ...obj,
      relations: Object.freeze([...filtered, relation])
    });
  }
}
