/**
 * Relationship System
 *
 * Sistem pemilik fakta hubungan antar-aktor. Group bukan Relationship,
 * dan kemunculan bersama tidak otomatis membentuk hubungan.
 *
 * File ini mempertahankan field RelationshipEntity lama untuk kompatibilitas
 * runtime/seed, lalu menambahkan semantic fields dan lifecycle yang dibutuhkan
 * oleh sistem Relationship Pocer.
 */

import { EntityID, makeDomainID, makeEntityID, makeSystemID } from '../../SHARED/identifiers.ts';
import { EntityIdentityFactory } from '../../SHARED/identity.ts';
import { AuthorityLevel, EntityLifecycleStatus } from '../../SHARED/model-types.ts';
import { RevisionHistory, RevisionHistoryManager } from '../../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../../SHARED/provenance.ts';
import { TemporalStatus } from '../../RUNTIME/TEMPORAL/types.ts';
import { ActorDataSource, ActorGender } from '../../CHARACTER/actor.ts';

export type RelationshipDirection = 'UNIDIRECTIONAL' | 'BIDIRECTIONAL';

export enum RelationshipRomanticStatus {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN'
}

export enum RelationshipPartnershipStatus {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN'
}

export interface RelationshipChangeRecord {
  readonly changeId: string;
  readonly date?: string;
  readonly event?: string;
  readonly previousType: string;
  readonly newType: string;
  readonly previousStatus?: string;
  readonly newStatus?: string;
  readonly previousDirection: RelationshipDirection;
  readonly newDirection: RelationshipDirection;
  readonly previousDynamic?: string;
  readonly newDynamic?: string;
  readonly trigger: string;
  readonly sourceEvent?: string;
  readonly source: ActorDataSource;
}

export interface RelationshipEntity {
  readonly relationshipId: string;
  readonly subjectRef: EntityID;
  readonly targetRef: EntityID;
  readonly relationshipType: string;
  readonly direction: RelationshipDirection;
  readonly status: EntityLifecycleStatus;
  readonly strength?: number;
  readonly contextNotes?: string;

  /** Semantic Relationship System fields. */
  readonly relationshipStatus?: string;
  readonly currentDynamic?: string;
  readonly startDate?: string;
  readonly currentSince?: string;
  readonly publicStatus?: string;
  readonly changes?: readonly RelationshipChangeRecord[];
  readonly romanticStatus?: RelationshipRomanticStatus;
  readonly partnershipStatus?: RelationshipPartnershipStatus;
  readonly source?: ActorDataSource;
  readonly confidence?: string;
  readonly basisReference?: string;
  readonly sourceEvent?: string;
  readonly createdDate?: string;
  readonly lastUpdated?: string;
  readonly createdBy?: string;
  readonly lastUpdatedBy?: string;
  readonly notes?: string;

  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

export interface RelationshipCreationInput {
  readonly relationshipId: string;
  readonly characterA: string;
  readonly characterB: string;
  readonly relationshipType: string;
  readonly relationshipStatus?: string;
  readonly relationshipDynamic?: string;
  readonly direction?: RelationshipDirection;
  readonly publicStatus?: string;
  readonly startDate?: string;
  readonly currentSince?: string;
  readonly romanticStatus?: RelationshipRomanticStatus;
  readonly partnershipStatus?: RelationshipPartnershipStatus;
  readonly effectiveFrom: string;
  readonly temporalStatus?: TemporalStatus;
  readonly source?: ActorDataSource;
  readonly basisReference?: string;
  readonly sourceEvent?: string;
  readonly confidence?: string;
  readonly notes?: string;
  readonly contextNotes?: string;
  readonly subjectGender?: ActorGender;
  readonly targetGender?: ActorGender;
}

export interface RelationshipStoryInput extends RelationshipCreationInput {
  /** Bukti naratif wajib; co-appearance saja tidak cukup. */
  readonly narrativeBasis: string;
}

export interface RelationshipChangeInput {
  readonly changeId: string;
  readonly changeDate?: string;
  readonly event?: string;
  readonly previousType: string;
  readonly newType: string;
  readonly previousStatus?: string;
  readonly newStatus?: string;
  readonly previousDirection: RelationshipDirection;
  readonly newDirection: RelationshipDirection;
  readonly previousDynamic?: string;
  readonly newDynamic?: string;
  readonly trigger: string;
  readonly sourceEvent?: string;
  readonly source: ActorDataSource;
  readonly effectiveFrom: string;
  readonly temporalStatus?: TemporalStatus;
  readonly romanticStatus?: RelationshipRomanticStatus;
  readonly partnershipStatus?: RelationshipPartnershipStatus;
  readonly publicStatus?: string;
  readonly confidence?: string;
  readonly notes?: string;
}

export interface RelationshipValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface RelationshipValidationReport {
  readonly valid: boolean;
  readonly issues: readonly RelationshipValidationIssue[];
}

export interface RelationshipLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

function issue(
  issues: RelationshipValidationIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function authoritativeSourceIssues(source: ActorDataSource, operation: string): string[] {
  if (source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN) {
    return [`${operation} tidak dapat menjadi data otoritatif dari source "${source}".`];
  }
  return [];
}

/**
 * Validates the user's explicit romantic/partnership gender rule.
 * Non-romantic relationships remain unrestricted.
 */
export function validateRelationshipGenderCompatibility(
  romanticStatus: RelationshipRomanticStatus | undefined,
  partnershipStatus: RelationshipPartnershipStatus | undefined,
  subjectGender: ActorGender | undefined,
  targetGender: ActorGender | undefined
): RelationshipValidationIssue[] {
  const issues: RelationshipValidationIssue[] = [];
  const romanticOrPartner =
    romanticStatus === RelationshipRomanticStatus.YES ||
    partnershipStatus === RelationshipPartnershipStatus.YES;

  if (!romanticOrPartner) return issues;

  if (!subjectGender || subjectGender === ActorGender.UNKNOWN || !targetGender || targetGender === ActorGender.UNKNOWN) {
    issue(
      issues,
      'ROMANTIC_RELATIONSHIP_REQUIRES_KNOWN_GENDER',
      'gender',
      'Relationship romantis/partner tidak dapat ditetapkan ketika gender salah satu pihak masih UNKNOWN.'
    );
    return issues;
  }

  const complementary =
    (subjectGender === ActorGender.ACTOR && targetGender === ActorGender.ACTRESS) ||
    (subjectGender === ActorGender.ACTRESS && targetGender === ActorGender.ACTOR);

  if (!complementary) {
    issue(
      issues,
      'SAME_GENDER_ROMANTIC_RELATIONSHIP_FORBIDDEN',
      'gender',
      'Relationship romantis/partner hanya valid untuk pasangan ACTOR dan ACTRESS.'
    );
  }

  return issues;
}

export function validateRelationship(
  relationship: RelationshipEntity,
  endpointGenders?: { subjectGender?: ActorGender; targetGender?: ActorGender }
): RelationshipValidationReport {
  const issues: RelationshipValidationIssue[] = [];

  if (!relationship.relationshipId || !EntityIdentityFactory.isValidId(relationship.relationshipId)) {
    issue(issues, 'INVALID_RELATIONSHIP_ID', 'relationshipId', 'Relationship ID tidak valid.');
  }
  if (!relationship.subjectRef || !EntityIdentityFactory.isValidId(relationship.subjectRef)) {
    issue(issues, 'INVALID_SUBJECT_REF', 'subjectRef', 'Character A/subject reference tidak valid.');
  }
  if (!relationship.targetRef || !EntityIdentityFactory.isValidId(relationship.targetRef)) {
    issue(issues, 'INVALID_TARGET_REF', 'targetRef', 'Character B/target reference tidak valid.');
  }
  if (relationship.subjectRef === relationship.targetRef) {
    issue(issues, 'SELF_RELATIONSHIP_FORBIDDEN', 'targetRef', 'Relationship tidak boleh menghubungkan karakter dengan dirinya sendiri.');
  }
  if (!relationship.relationshipType.trim()) {
    issue(issues, 'EMPTY_RELATIONSHIP_TYPE', 'relationshipType', 'Relationship type tidak boleh kosong.');
  }
  if (!['UNIDIRECTIONAL', 'BIDIRECTIONAL'].includes(relationship.direction)) {
    issue(issues, 'INVALID_RELATIONSHIP_DIRECTION', 'direction', 'Relationship direction tidak valid.');
  }
  if (!Object.values(EntityLifecycleStatus).includes(relationship.status)) {
    issue(issues, 'INVALID_RELATIONSHIP_LIFECYCLE', 'status', 'Lifecycle status relationship tidak valid.');
  }
  if (!Object.values(TemporalStatus).includes(relationship.temporalValidity.temporalCategory)) {
    issue(issues, 'INVALID_TEMPORAL_STATUS', 'temporalValidity.temporalCategory', 'Temporal status tidak valid.');
  }
  if (relationship.strength !== undefined && (!Number.isFinite(relationship.strength) || relationship.strength < 0 || relationship.strength > 1)) {
    issue(issues, 'INVALID_RELATIONSHIP_STRENGTH', 'strength', 'Relationship strength harus berada pada rentang 0..1 jika digunakan.');
  }
  if (relationship.romanticStatus !== undefined && !Object.values(RelationshipRomanticStatus).includes(relationship.romanticStatus)) {
    issue(issues, 'INVALID_ROMANTIC_STATUS', 'romanticStatus', 'Romantic status tidak valid.');
  }
  if (relationship.partnershipStatus !== undefined && !Object.values(RelationshipPartnershipStatus).includes(relationship.partnershipStatus)) {
    issue(issues, 'INVALID_PARTNERSHIP_STATUS', 'partnershipStatus', 'Partnership status tidak valid.');
  }
  if (relationship.source !== undefined && !Object.values(ActorDataSource).includes(relationship.source)) {
    issue(issues, 'INVALID_RELATIONSHIP_SOURCE', 'source', 'Relationship source tidak valid.');
  }
  if (relationship.source === ActorDataSource.AI_PROPOSAL || relationship.source === ActorDataSource.UNKNOWN) {
    issue(issues, 'NON_AUTHORITATIVE_RELATIONSHIP_SOURCE', 'source', 'AI_PROPOSAL atau UNKNOWN tidak dapat menjadi sumber otoritatif Relationship.');
  }

  for (const change of relationship.changes ?? []) {
    if (!change.trigger.trim()) {
      issue(issues, 'MISSING_RELATIONSHIP_CHANGE_TRIGGER', `changes.${change.changeId}.trigger`, 'Perubahan relationship wajib memiliki trigger.');
    }
    if (!change.previousType.trim() || !change.newType.trim()) {
      issue(issues, 'INVALID_RELATIONSHIP_CHANGE_TYPE', `changes.${change.changeId}`, 'Previous type dan new type wajib terisi.');
    }
    if (!Object.values(ActorDataSource).includes(change.source)) {
      issue(issues, 'INVALID_RELATIONSHIP_CHANGE_SOURCE', `changes.${change.changeId}.source`, 'Source perubahan relationship tidak valid.');
    }
    if (change.source === ActorDataSource.AI_PROPOSAL || change.source === ActorDataSource.UNKNOWN) {
      issue(issues, 'NON_AUTHORITATIVE_RELATIONSHIP_CHANGE_SOURCE', `changes.${change.changeId}.source`, 'AI_PROPOSAL atau UNKNOWN tidak dapat menjadi sumber otoritatif perubahan Relationship.');
    }
  }

  issues.push(
    ...validateRelationshipGenderCompatibility(
      relationship.romanticStatus,
      relationship.partnershipStatus,
      endpointGenders?.subjectGender,
      endpointGenders?.targetGender
    )
  );

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function createRelationshipEntity(
  input: RelationshipCreationInput,
  source: ActorDataSource,
  reason: string
): RelationshipEntity {
  const owner = makeSystemID('RELATIONSHIP_SYSTEM');
  const domain = makeDomainID('RELATIONSHIP');
  const revision = RevisionHistoryManager.createInitial(
    owner,
    input.effectiveFrom,
    `${reason}: ${input.relationshipId}`
  );

  return Object.freeze({
    relationshipId: input.relationshipId,
    subjectRef: makeEntityID(input.characterA),
    targetRef: makeEntityID(input.characterB),
    relationshipType: input.relationshipType,
    direction: input.direction ?? 'BIDIRECTIONAL',
    status: EntityLifecycleStatus.ACTIVE,
    strength: undefined,
    contextNotes: input.contextNotes,
    relationshipStatus: input.relationshipStatus,
    currentDynamic: input.relationshipDynamic,
    startDate: input.startDate,
    currentSince: input.currentSince,
    publicStatus: input.publicStatus,
    changes: Object.freeze([]),
    romanticStatus: input.romanticStatus ?? RelationshipRomanticStatus.UNKNOWN,
    partnershipStatus: input.partnershipStatus ?? RelationshipPartnershipStatus.UNKNOWN,
    source,
    confidence: input.confidence,
    basisReference: input.basisReference,
    sourceEvent: input.sourceEvent,
    createdDate: input.effectiveFrom,
    lastUpdated: input.effectiveFrom,
    createdBy: source,
    lastUpdatedBy: source,
    notes: input.notes,
    temporalValidity: Object.freeze({
      effectiveFrom: input.effectiveFrom,
      temporalCategory: input.temporalStatus ?? TemporalStatus.ACTUAL
    }),
    history: revision,
    provenance: createProvenanceMetadata(
      owner,
      domain,
      revision.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    )
  });
}

export class RelationshipLifecycle {
  public static createManual(input: RelationshipCreationInput): RelationshipLifecycleResult<RelationshipEntity> {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Pembuatan manual Relationship');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };

    if (input.characterA === input.characterB) {
      return { result: 'REJECTED', reasons: Object.freeze(['Relationship tidak boleh menghubungkan karakter dengan dirinya sendiri.']) };
    }

    const relationship = createRelationshipEntity(input, source, 'Pembuatan manual Relationship');
    const validation = validateRelationship(relationship, {
      subjectGender: input.subjectGender,
      targetGender: input.targetGender
    });
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: relationship, reasons: Object.freeze([]) };
  }

  public static deriveFromStory(input: RelationshipStoryInput): RelationshipLifecycleResult<RelationshipEntity> {
    if (!input.narrativeBasis.trim()) {
      return { result: 'BLOCKED', reasons: Object.freeze(['Story-derived Relationship wajib memiliki narrative basis.']) };
    }

    const relationship = createRelationshipEntity(
      { ...input, basisReference: input.basisReference ?? input.narrativeBasis },
      ActorDataSource.STORY_DERIVED,
      'Story-derived Relationship'
    );
    const validation = validateRelationship(relationship, {
      subjectGender: input.subjectGender,
      targetGender: input.targetGender
    });
    if (!validation.valid) {
      return { result: 'BLOCKED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: relationship, reasons: Object.freeze([]) };
  }

  public static recordChange(
    current: RelationshipEntity,
    input: RelationshipChangeInput,
    endpointGenders?: { subjectGender?: ActorGender; targetGender?: ActorGender }
  ): RelationshipLifecycleResult<RelationshipEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Perubahan Relationship');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (!input.trigger.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Perubahan Relationship wajib memiliki trigger.']) };
    if (input.previousType !== current.relationshipType) {
      return { result: 'REJECTED', reasons: Object.freeze(['Previous relationship type tidak cocok dengan state authoritative saat ini.']) };
    }
    if (input.previousDirection !== current.direction) {
      return { result: 'REJECTED', reasons: Object.freeze(['Previous relationship direction tidak cocok dengan state authoritative saat ini.']) };
    }
    if ((input.previousStatus ?? current.relationshipStatus) !== current.relationshipStatus) {
      return { result: 'REJECTED', reasons: Object.freeze(['Previous relationship status tidak cocok dengan state authoritative saat ini.']) };
    }

    const nextRomanticStatus = input.romanticStatus ?? current.romanticStatus ?? RelationshipRomanticStatus.UNKNOWN;
    const nextPartnershipStatus = input.partnershipStatus ?? current.partnershipStatus ?? RelationshipPartnershipStatus.UNKNOWN;

    const genderIssues = validateRelationshipGenderCompatibility(
      nextRomanticStatus,
      nextPartnershipStatus,
      endpointGenders?.subjectGender,
      endpointGenders?.targetGender
    );
    if (genderIssues.length) {
      return { result: 'REJECTED', reasons: Object.freeze(genderIssues.map(x => x.message)) };
    }

    const nextChange: RelationshipChangeRecord = Object.freeze({
      changeId: input.changeId,
      date: input.changeDate,
      event: input.event,
      previousType: input.previousType,
      newType: input.newType,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      previousDirection: input.previousDirection,
      newDirection: input.newDirection,
      previousDynamic: input.previousDynamic,
      newDynamic: input.newDynamic,
      trigger: input.trigger,
      sourceEvent: input.sourceEvent,
      source: input.source
    });

    const nextRevision = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('RELATIONSHIP_SYSTEM'),
      input.effectiveFrom,
      ['relationshipType', 'direction', 'relationshipStatus', 'currentDynamic', 'changes', 'temporalValidity'],
      input.trigger
    );

    const next: RelationshipEntity = Object.freeze({
      ...current,
      relationshipType: input.newType,
      direction: input.newDirection,
      relationshipStatus: input.newStatus,
      currentDynamic: input.newDynamic,
      currentSince: input.changeDate ?? current.currentSince,
      publicStatus: input.publicStatus ?? current.publicStatus,
      romanticStatus: nextRomanticStatus,
      partnershipStatus: nextPartnershipStatus,
      confidence: input.confidence ?? current.confidence,
      lastUpdated: input.changeDate ?? current.lastUpdated,
      lastUpdatedBy: input.source,
      notes: input.notes ?? current.notes,
      changes: Object.freeze([...(current.changes ?? []), nextChange]),
      temporalValidity: Object.freeze({
        ...current.temporalValidity,
        effectiveFrom: input.effectiveFrom,
        temporalCategory: input.temporalStatus ?? current.temporalValidity.temporalCategory
      }),
      history: nextRevision,
      source: input.source,
      provenance: Object.freeze({
        ...current.provenance,
        revision: nextRevision.currentRevisionId,
        recordedTimestamp: Date.now()
      })
    });

    const validation = validateRelationship(next, endpointGenders);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }

    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }
}

export function toRelationshipSubjectID(characterId: string): EntityID {
  return makeEntityID(characterId);
}

export function toRelationshipTargetID(characterId: string): EntityID {
  return makeEntityID(characterId);
}
