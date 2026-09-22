/**
 * Actor / Character System
 *
 * Semantic foundation for Actor/Actress data, classification, group membership,
 * manual character creation, story-derived emergence, and validated group changes.
 *
 * This module does not generate character content. It only stores structure,
 * source metadata, and deterministic rules.
 */

import { EntityIdentity, EntityIdentityFactory } from './identity.ts';
import { EntityID, makeEntityID, makeSystemID, makeDomainID } from '../../types/identifiers.ts';
import { RevisionHistoryManager, RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from './provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from './types.ts';

export enum ActorGender {
  ACTOR = 'ACTOR',
  ACTRESS = 'ACTRESS',
  UNKNOWN = 'UNKNOWN'
}

export enum ActorLevel {
  CORE = 'CORE',
  MAJOR = 'MAJOR',
  IMPACT = 'IMPACT',
  PERIPHERAL = 'PERIPHERAL',
  ENTITY = 'ENTITY'
}

/** Entity type is the form/nature of an Entity actor. */
export enum ActorEntityType {
  HUMAN = 'HUMAN',
  ANIMAL = 'ANIMAL',
  JIN = 'JIN',
  AI = 'AI',
  ROBOT = 'ROBOT',
  SUPERNATURAL = 'SUPERNATURAL',
  CREATURE = 'CREATURE',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN'
}

export enum ActorDataSource {
  USER_DEFINED = 'USER_DEFINED',
  STORY_DERIVED = 'STORY_DERIVED',
  AI_PROPOSAL = 'AI_PROPOSAL',
  UNKNOWN = 'UNKNOWN'
}

export enum ActorEmergenceResult {
  CREATED = 'CREATED',
  IGNORED_TRANSIENT = 'IGNORED_TRANSIENT',
  REQUIRES_INPUT = 'REQUIRES_INPUT',
  BLOCKED = 'BLOCKED'
}

export interface ActorGroupHistoryEntry {
  readonly groupId: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly reason?: string;
  readonly source: ActorDataSource;
}

export interface ActorGroupMembership {
  readonly currentGroupId: string | null;
  readonly history: readonly ActorGroupHistoryEntry[];
}

export interface ActorClassification {
  readonly gender: ActorGender;
  readonly level: ActorLevel;
  readonly groupMembership: ActorGroupMembership;
  readonly entityType: ActorEntityType;
  readonly roleReferences: readonly string[];
  readonly narrativeRole?: string;
  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface ActorEntity {
  readonly identity: EntityIdentity;
  readonly classification: ActorClassification;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
  };
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

export interface ActorCreationInput {
  readonly actorId: string;
  readonly displayName: string;
  readonly gender?: ActorGender;
  readonly level: ActorLevel;
  readonly groupId?: string | null;
  readonly entityType?: ActorEntityType;
  readonly roleReferences?: readonly string[];
  readonly narrativeRole?: string;
  readonly source?: ActorDataSource;
  readonly effectiveFrom: string;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface ActorEmergenceInput extends ActorCreationInput {
  readonly narrativeInfluence: boolean;
  readonly existingActorId?: string;
}

export interface ActorLifecycleResult<T> {
  readonly result: ActorEmergenceResult | 'ACCEPTED' | 'REJECTED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

export interface ActorGroupChangeRequest {
  readonly actorId: string;
  readonly actorLevel: ActorLevel;
  readonly currentGroupId: string | null;
  readonly targetGroupId: string | null;
  readonly effectiveFrom: string;
  readonly reason?: string;
  readonly source: ActorDataSource;
}

export interface ActorLevelChangeRequest {
  readonly actorId: string;
  readonly currentLevel: ActorLevel;
  readonly targetLevel: ActorLevel;
  readonly currentGroupId: string | null;
  readonly targetGroupId: string | null;
  readonly effectiveFrom: string;
  readonly source: ActorDataSource;
  readonly reason?: string;
}

export interface ActorClassificationValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ActorClassificationValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ActorClassificationValidationIssue[];
}

function pushIssue(
  issues: ActorClassificationValidationIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

export function validateActorClassification(
  classification: Pick<ActorClassification, 'gender' | 'level' | 'groupMembership' | 'entityType'>
): ActorClassificationValidationReport {
  const issues: ActorClassificationValidationIssue[] = [];
  const groupId = classification.groupMembership.currentGroupId;

  if (!Object.values(ActorGender).includes(classification.gender)) {
    pushIssue(issues, 'INVALID_ACTOR_GENDER', 'gender', `Unknown actor gender "${classification.gender}".`);
  }

  if (!Object.values(ActorLevel).includes(classification.level)) {
    pushIssue(issues, 'INVALID_ACTOR_LEVEL', 'level', `Unknown actor level "${classification.level}".`);
  }

  if (!Object.values(ActorEntityType).includes(classification.entityType)) {
    pushIssue(issues, 'INVALID_ENTITY_TYPE', 'entityType', `Unknown entity type "${classification.entityType}".`);
  }

  const requiresGroup =
    classification.level === ActorLevel.CORE ||
    classification.level === ActorLevel.MAJOR ||
    classification.level === ActorLevel.ENTITY;

  const forbidsGroup =
    classification.level === ActorLevel.IMPACT ||
    classification.level === ActorLevel.PERIPHERAL;

  if (requiresGroup && (!groupId || groupId.trim() === '')) {
    pushIssue(
      issues,
      'GROUP_REQUIRED',
      'groupMembership.currentGroupId',
      `${classification.level} actors must have exactly one active Group.`
    );
  }

  if (forbidsGroup && groupId !== null) {
    pushIssue(
      issues,
      'GROUP_FORBIDDEN',
      'groupMembership.currentGroupId',
      `${classification.level} actors must not have an active Group.`
    );
  }

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues)
  });
}

function authoritativeSourceIssues(source: ActorDataSource, operation: string): string[] {
  if (source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN) {
    return [`${operation} cannot become authoritative from source "${source}".`];
  }
  return [];
}

function makeGroupMembership(
  level: ActorLevel,
  groupId: string | null,
  effectiveFrom: string,
  source: ActorDataSource,
  reason?: string
): ActorGroupMembership {
  const requiresGroup =
    level === ActorLevel.CORE ||
    level === ActorLevel.MAJOR ||
    level === ActorLevel.ENTITY;

  const currentGroupId = requiresGroup ? groupId : null;
  const history = currentGroupId
    ? [{ groupId: currentGroupId, effectiveFrom, reason, source }]
    : [];

  return Object.freeze({
    currentGroupId,
    history: Object.freeze(history)
  });
}

function createActorEntity(input: ActorCreationInput, source: ActorDataSource, description: string): ActorEntity {
  const classification: ActorClassification = Object.freeze({
    gender: input.gender ?? ActorGender.UNKNOWN,
    level: input.level,
    groupMembership: makeGroupMembership(
      input.level,
      input.groupId ?? null,
      input.effectiveFrom,
      source,
      description
    ),
    entityType: input.entityType ?? ActorEntityType.UNKNOWN,
    roleReferences: Object.freeze([...(input.roleReferences ?? [])]),
    narrativeRole: input.narrativeRole,
    source,
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined
  });

  const owner = makeSystemID('CHARACTER_SYSTEM');
  const domain = makeDomainID('CHARACTER');
  const revision = RevisionHistoryManager.createInitial(
    owner,
    input.effectiveFrom,
    `${description}: ${input.actorId}`
  );
  const identity = EntityIdentityFactory.create({
    id: input.actorId,
    entityType: EntityType.CHARACTER,
    displayName: input.displayName,
    status: EntityLifecycleStatus.ACTIVE,
    createdAtUniverseTime: input.effectiveFrom
  });

  return Object.freeze({
    identity,
    classification,
    temporalValidity: Object.freeze({ effectiveFrom: input.effectiveFrom }),
    history: revision,
    provenance: createProvenanceMetadata(
      owner,
      domain,
      revision.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    )
  });
}

export class ActorLifecycle {
  public static createManual(input: ActorCreationInput): ActorLifecycleResult<ActorEntity> {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Manual Actor creation');
    if (sourceIssues.length > 0) {
      return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    }

    const actor = createActorEntity(input, source, 'Manual Actor creation');
    const validation = validateActorClassification(actor.classification);
    if (!validation.valid) {
      return {
        result: 'REJECTED',
        reasons: Object.freeze(validation.issues.map(issue => issue.message))
      };
    }

    return { result: 'ACCEPTED', data: actor, reasons: Object.freeze([]) };
  }

  public static emergeFromStory(input: ActorEmergenceInput): ActorLifecycleResult<ActorEntity> {
    if (input.existingActorId) {
      return {
        result: ActorEmergenceResult.BLOCKED,
        reasons: Object.freeze([`Story emergence cannot create a duplicate Actor for existing ID "${input.existingActorId}".`])
      };
    }

    if (!input.narrativeInfluence) {
      return {
        result: ActorEmergenceResult.IGNORED_TRANSIENT,
        reasons: Object.freeze([
          'Actor has no meaningful narrative influence and does not require a persistent Actor record.'
        ])
      };
    }

    const actor = createActorEntity(input, ActorDataSource.STORY_DERIVED, 'Story-derived Actor emergence');
    const validation = validateActorClassification(actor.classification);
    if (!validation.valid) {
      return {
        result: ActorEmergenceResult.BLOCKED,
        reasons: Object.freeze(validation.issues.map(issue => issue.message))
      };
    }

    return { result: ActorEmergenceResult.CREATED, data: actor, reasons: Object.freeze([]) };
  }

  public static changeGroup(
    current: ActorClassification,
    request: ActorGroupChangeRequest
  ): ActorLifecycleResult<ActorClassification> {
    const sourceIssues = authoritativeSourceIssues(request.source, 'Group change');
    if (sourceIssues.length > 0) {
      return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    }

    if (request.currentGroupId !== current.groupMembership.currentGroupId) {
      return { result: 'REJECTED', reasons: Object.freeze(['Group change predecessor does not match current authoritative Group membership.']) };
    }

    if (request.actorLevel !== current.level) {
      return { result: 'REJECTED', reasons: Object.freeze(['Group change level does not match the current Actor level.']) };
    }

    if (current.level === ActorLevel.CORE && request.targetGroupId !== current.groupMembership.currentGroupId) {
      return {
        result: 'REJECTED',
        reasons: Object.freeze(['Level 1 Core Actor Group is fixed and cannot be changed through normal Group transfer.'])
      };
    }

    if (
      (current.level === ActorLevel.IMPACT || current.level === ActorLevel.PERIPHERAL) &&
      request.targetGroupId !== null
    ) {
      return { result: 'REJECTED', reasons: Object.freeze([`${current.level} Actor cannot hold an active Group.`]) };
    }

    if (
      (current.level === ActorLevel.MAJOR || current.level === ActorLevel.ENTITY) &&
      (!request.targetGroupId || request.targetGroupId.trim() === '')
    ) {
      return { result: 'REJECTED', reasons: Object.freeze([`${current.level} Actor must always have exactly one active Group.`]) };
    }

    if (request.targetGroupId === current.groupMembership.currentGroupId) {
      return { result: 'REJECTED', reasons: Object.freeze(['Target Group is identical to current Group.']) };
    }

    const closedHistory = current.groupMembership.history.map((entry, index, entries) => {
      if (index !== entries.length - 1 || entry.effectiveTo || entry.groupId !== request.currentGroupId) {
        return entry;
      }
      return { ...entry, effectiveTo: request.effectiveFrom };
    });

    const nextHistory = request.targetGroupId
      ? [
          ...closedHistory,
          {
            groupId: request.targetGroupId,
            effectiveFrom: request.effectiveFrom,
            reason: request.reason,
            source: request.source
          }
        ]
      : closedHistory;

    const nextClassification: ActorClassification = Object.freeze({
      ...current,
      groupMembership: Object.freeze({
        currentGroupId: request.targetGroupId,
        history: Object.freeze(nextHistory)
      }),
      source: request.source
    });

    return { result: 'ACCEPTED', data: nextClassification, reasons: Object.freeze([]) };
  }

  public static changeLevel(
    current: ActorClassification,
    request: ActorLevelChangeRequest
  ): ActorLifecycleResult<ActorClassification> {
    const sourceIssues = authoritativeSourceIssues(request.source, 'Level change');
    if (sourceIssues.length > 0) {
      return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    }

    if (current.level !== request.currentLevel) {
      return { result: 'REJECTED', reasons: Object.freeze(['Level-change predecessor does not match the current Actor level.']) };
    }

    const proposed: ActorClassification = Object.freeze({
      ...current,
      level: request.targetLevel,
      groupMembership: makeGroupMembership(
        request.targetLevel,
        request.targetGroupId,
        request.effectiveFrom,
        request.source,
        request.reason
      ),
      source: request.source
    });

    const validation = validateActorClassification(proposed);
    if (!validation.valid) {
      return {
        result: 'REJECTED',
        reasons: Object.freeze(validation.issues.map(issue => issue.message))
      };
    }

    return { result: 'ACCEPTED', data: proposed, reasons: Object.freeze([]) };
  }
}

export function toActorEntityID(actorId: string): EntityID {
  return makeEntityID(actorId);
}
