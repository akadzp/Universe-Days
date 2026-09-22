/**
 * Character Continuity System
 *
 * Continuity adalah sistem pemeriksaan lintas-domain. Ia tidak memiliki hak
 * untuk mengubah Canon, memperbaiki sumber, atau mengarang fakta.
 */

import type { EntityIdentity } from './identity.ts';
import { EntityIdentityFactory } from './identity.ts';
import { RevisionHistory, RevisionHistoryManager } from './history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from './provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from './types.ts';
import { makeDomainID, makeEntityID, makeSystemID, EntityID } from '../../types/identifiers.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { ActorDataSource } from './actor.ts';
import type { UniverseModel } from './universe.ts';
import type { CharacterEntity } from './character.ts';

export enum ContinuityCheckType {
  IDENTITY = 'IDENTITY',
  ROLE = 'ROLE',
  RELATIONSHIP = 'RELATIONSHIP',
  BEHAVIOR = 'BEHAVIOR',
  KNOWLEDGE = 'KNOWLEDGE',
  STATE = 'STATE',
  STYLE = 'STYLE'
}

export enum ContinuityCheckStatus {
  NOT_CHECKED = 'NOT_CHECKED',
  CONSISTENT = 'CONSISTENT',
  NEW_INFORMATION = 'NEW_INFORMATION',
  VALID_CHANGE = 'VALID_CHANGE',
  CONFLICT = 'CONFLICT',
  BLOCKED = 'BLOCKED',
  UNKNOWN = 'UNKNOWN'
}

export enum ContinuityConflictType {
  IDENTITY = 'IDENTITY',
  ROLE = 'ROLE',
  RELATIONSHIP = 'RELATIONSHIP',
  BEHAVIOR = 'BEHAVIOR',
  KNOWLEDGE = 'KNOWLEDGE',
  STATE = 'STATE',
  STYLE = 'STYLE',
  TEMPORAL = 'TEMPORAL',
  SOURCE = 'SOURCE'
}

export enum ContinuityResolutionStatus {
  UNRESOLVED = 'UNRESOLVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED'
}

export interface CharacterContinuityCheck {
  readonly checkType: ContinuityCheckType;
  readonly status: ContinuityCheckStatus;
  readonly checkedAt: string;
  readonly evidenceReferences: readonly string[];
  readonly notes?: string;
}

export interface CharacterContinuityChange {
  readonly changeId: string;
  readonly changeType: ContinuityCheckType;
  readonly changeTrigger: string;
  readonly previousState?: unknown;
  readonly currentState?: unknown;
  readonly changeDate: string;
  readonly sourceEvent?: string;
  readonly source: ActorDataSource;
  readonly temporalStatus?: TemporalStatus;
}

export interface CharacterContinuityConflict {
  readonly conflictId: string;
  readonly conflictType: ContinuityConflictType;
  readonly conflictDescription: string;
  readonly affectedData: readonly string[];
  readonly resolutionStatus: ContinuityResolutionStatus;
  readonly resolution?: string;
  readonly detectedAt: string;
  readonly evidenceReferences: readonly string[];
}

export interface ContinuityValidationHistoryEntry {
  readonly validationDate: string;
  readonly validationResult: 'PASS' | 'REVIEW_REQUIRED' | 'CONFLICT' | 'BLOCKED';
  readonly validatedBy: string;
  readonly validationNotes?: string;
}

export interface CharacterContinuityEntity {
  readonly identity: EntityIdentity;
  readonly characterId: string;
  readonly checks: Readonly<Record<ContinuityCheckType, CharacterContinuityCheck>>;
  readonly changes: readonly CharacterContinuityChange[];
  readonly conflicts: readonly CharacterContinuityConflict[];
  readonly validationHistory: readonly ContinuityValidationHistoryEntry[];
  readonly notes?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

export interface CharacterContinuityValidationIssue {
  readonly code: string;
  readonly type: ContinuityCheckType;
  readonly message: string;
  readonly evidenceReferences: readonly string[];
}

export interface CharacterContinuityValidationReport {
  readonly characterId: string;
  readonly result: 'PASS' | 'REVIEW_REQUIRED' | 'CONFLICT' | 'BLOCKED';
  readonly checks: Readonly<Record<ContinuityCheckType, CharacterContinuityCheck>>;
  readonly issues: readonly CharacterContinuityValidationIssue[];
}

export interface CharacterContinuityChangeAssessment {
  readonly classification: 'NEW_INFORMATION' | 'VALID_CHANGE' | 'CONFLICT' | 'UNKNOWN';
  readonly reason: string;
}

const CHECK_TYPES = Object.values(ContinuityCheckType);

function freezeChecks(
  checks: Partial<Record<ContinuityCheckType, CharacterContinuityCheck>>,
  checkedAt: string
): Readonly<Record<ContinuityCheckType, CharacterContinuityCheck>> {
  const result = {} as Record<ContinuityCheckType, CharacterContinuityCheck>;
  for (const type of CHECK_TYPES) {
    result[type] = Object.freeze(
      checks[type] ?? {
        checkType: type,
        status: ContinuityCheckStatus.NOT_CHECKED,
        checkedAt,
        evidenceReferences: Object.freeze([])
      }
    );
  }
  return Object.freeze(result);
}

function issue(
  issues: CharacterContinuityValidationIssue[],
  code: string,
  type: ContinuityCheckType,
  message: string,
  refs: string[] = []
): void {
  issues.push({
    code,
    type,
    message,
    evidenceReferences: Object.freeze([...refs])
  });
}

function makeCheck(
  checkType: ContinuityCheckType,
  status: ContinuityCheckStatus,
  checkedAt: string,
  evidenceReferences: string[] = [],
  notes?: string
): CharacterContinuityCheck {
  return Object.freeze({
    checkType,
    status,
    checkedAt,
    evidenceReferences: Object.freeze([...evidenceReferences]),
    notes
  });
}

export function validateCharacterContinuity(
  universe: UniverseModel,
  characterId: string,
  checkedAt = universe.temporalContext.currentUniverseTime
): CharacterContinuityValidationReport {
  const character = universe.characters[characterId];
  if (!character) {
    const checks = freezeChecks({}, checkedAt);
    return Object.freeze({
      characterId,
      result: 'BLOCKED',
      checks,
      issues: Object.freeze([{
        code: 'CHARACTER_NOT_FOUND',
        type: ContinuityCheckType.IDENTITY,
        message: `Character '${characterId}' tidak ditemukan.`,
        evidenceReferences: Object.freeze([])
      }])
    });
  }

  const issues: CharacterContinuityValidationIssue[] = [];
  const checks: Partial<Record<ContinuityCheckType, CharacterContinuityCheck>> = {};

  if (character.identity.id !== characterId) {
    issue(issues, 'IDENTITY_ID_MISMATCH', ContinuityCheckType.IDENTITY,
      `Character identity '${character.identity.id}' tidak sama dengan requested character '${characterId}'.`);
    checks[ContinuityCheckType.IDENTITY] = makeCheck(ContinuityCheckType.IDENTITY, ContinuityCheckStatus.CONFLICT, checkedAt, [characterId]);
  } else {
    checks[ContinuityCheckType.IDENTITY] = makeCheck(ContinuityCheckType.IDENTITY, ContinuityCheckStatus.CONSISTENT, checkedAt, [characterId]);
  }

  checks[ContinuityCheckType.ROLE] = character.roleReferences.length
    ? makeCheck(ContinuityCheckType.ROLE, ContinuityCheckStatus.CONSISTENT, checkedAt, [...character.roleReferences])
    : makeCheck(ContinuityCheckType.ROLE, ContinuityCheckStatus.UNKNOWN, checkedAt, [], 'Role taxonomy belum tersedia; continuity hanya memastikan referensi tidak diubah otomatis.');

  const relationshipRefs = character.relationshipReferences ?? [];
  const relationshipEvidence: string[] = [];
  for (const ref of relationshipRefs) {
    const rel = universe.relationships[ref];
    if (!rel) {
      issue(issues, 'RELATIONSHIP_REFERENCE_MISSING', ContinuityCheckType.RELATIONSHIP,
        `Relationship '${ref}' tidak ditemukan.`, [ref]);
      continue;
    }
    relationshipEvidence.push(ref);
    if (rel.subjectRef !== characterId && rel.targetRef !== characterId) {
      issue(issues, 'RELATIONSHIP_CHARACTER_MISMATCH', ContinuityCheckType.RELATIONSHIP,
        `Relationship '${ref}' tidak menghubungkan Character '${characterId}'.`, [ref, characterId]);
    }
  }
  checks[ContinuityCheckType.RELATIONSHIP] = makeCheck(
    ContinuityCheckType.RELATIONSHIP,
    issues.some(i => i.type === ContinuityCheckType.RELATIONSHIP)
      ? ContinuityCheckStatus.CONFLICT
      : ContinuityCheckStatus.CONSISTENT,
    checkedAt,
    relationshipEvidence
  );

  const behaviorRefs = character.behaviorReferences ?? [];
  const behaviorEvidence: string[] = [];
  for (const ref of behaviorRefs) {
    const behavior = universe.behaviors[ref];
    if (!behavior) {
      issue(issues, 'BEHAVIOR_REFERENCE_MISSING', ContinuityCheckType.BEHAVIOR,
        `Behavior '${ref}' tidak ditemukan.`, [ref]);
      continue;
    }
    behaviorEvidence.push(ref);
    if (behavior.characterId !== characterId) {
      issue(issues, 'BEHAVIOR_CHARACTER_MISMATCH', ContinuityCheckType.BEHAVIOR,
        `Behavior '${ref}' bukan milik Character '${characterId}'.`, [ref, characterId]);
    }
  }
  checks[ContinuityCheckType.BEHAVIOR] = makeCheck(
    ContinuityCheckType.BEHAVIOR,
    issues.some(i => i.type === ContinuityCheckType.BEHAVIOR)
      ? ContinuityCheckStatus.CONFLICT
      : ContinuityCheckStatus.CONSISTENT,
    checkedAt,
    behaviorEvidence
  );

  const knowledgeRefs = character.knowledgeReferences ?? [];
  const knowledgeEvidence: string[] = [];
  for (const ref of knowledgeRefs) {
    const knowledge = universe.knowledge[ref];
    if (!knowledge) {
      issue(issues, 'KNOWLEDGE_REFERENCE_MISSING', ContinuityCheckType.KNOWLEDGE,
        `Knowledge '${ref}' tidak ditemukan.`, [ref]);
      continue;
    }
    knowledgeEvidence.push(ref);
    if (knowledge.knowerRef !== characterId) {
      issue(issues, 'KNOWLEDGE_KNOWER_MISMATCH', ContinuityCheckType.KNOWLEDGE,
        `Knowledge '${ref}' bukan milik Character '${characterId}'.`, [ref, characterId]);
    }
  }
  checks[ContinuityCheckType.KNOWLEDGE] = makeCheck(
    ContinuityCheckType.KNOWLEDGE,
    issues.some(i => i.type === ContinuityCheckType.KNOWLEDGE)
      ? ContinuityCheckStatus.CONFLICT
      : ContinuityCheckStatus.CONSISTENT,
    checkedAt,
    knowledgeEvidence
  );

  if (character.stateReference) {
    const state = universe.states[character.stateReference];
    if (!state) {
      issue(issues, 'STATE_REFERENCE_MISSING', ContinuityCheckType.STATE,
        `State '${character.stateReference}' tidak ditemukan.`, [character.stateReference]);
      checks[ContinuityCheckType.STATE] = makeCheck(ContinuityCheckType.STATE, ContinuityCheckStatus.CONFLICT, checkedAt, [character.stateReference]);
    } else if (String(state.entityRef) !== characterId) {
      issue(issues, 'STATE_CHARACTER_MISMATCH', ContinuityCheckType.STATE,
        `State '${character.stateReference}' bukan milik Character '${characterId}'.`, [character.stateReference, characterId]);
      checks[ContinuityCheckType.STATE] = makeCheck(ContinuityCheckType.STATE, ContinuityCheckStatus.CONFLICT, checkedAt, [character.stateReference, characterId]);
    } else {
      checks[ContinuityCheckType.STATE] = makeCheck(ContinuityCheckType.STATE, ContinuityCheckStatus.CONSISTENT, checkedAt, [character.stateReference]);
    }
  } else {
    checks[ContinuityCheckType.STATE] = makeCheck(ContinuityCheckType.STATE, ContinuityCheckStatus.UNKNOWN, checkedAt);
  }

  const styleRefs = character.styleReferences ?? [];
  const styleEvidence: string[] = [];
  for (const ref of styleRefs) {
    const style = universe.styles[ref];
    if (!style) {
      issue(issues, 'STYLE_REFERENCE_MISSING', ContinuityCheckType.STYLE,
        `Style '${ref}' tidak ditemukan.`, [ref]);
      continue;
    }
    styleEvidence.push(ref);
    if (style.characterId !== characterId) {
      issue(issues, 'STYLE_CHARACTER_MISMATCH', ContinuityCheckType.STYLE,
        `Style '${ref}' bukan milik Character '${characterId}'.`, [ref, characterId]);
    }
  }
  checks[ContinuityCheckType.STYLE] = makeCheck(
    ContinuityCheckType.STYLE,
    issues.some(i => i.type === ContinuityCheckType.STYLE)
      ? ContinuityCheckStatus.CONFLICT
      : (styleRefs.length ? ContinuityCheckStatus.CONSISTENT : ContinuityCheckStatus.UNKNOWN),
    checkedAt,
    styleEvidence
  );

  const checkMap = freezeChecks(checks, checkedAt);
  const result = issues.length > 0 ? 'CONFLICT' : 'PASS';
  return Object.freeze({
    characterId,
    result,
    checks: checkMap,
    issues: Object.freeze(issues)
  });
}

export function assessCharacterChange(input: {
  readonly previousKnown: boolean;
  readonly currentKnown: boolean;
  readonly hasNarrativeBasis: boolean;
  readonly contradictsExistingData: boolean;
}): CharacterContinuityChangeAssessment {
  if (!input.previousKnown && input.currentKnown) {
    return {
      classification: 'NEW_INFORMATION',
      reason: 'Data sekarang diketahui tetapi sebelumnya belum tercatat; ini tidak otomatis merupakan kontradiksi.'
    };
  }
  if (input.contradictsExistingData && !input.hasNarrativeBasis) {
    return {
      classification: 'CONFLICT',
      reason: 'Informasi baru bertentangan dengan data sebelumnya tanpa dasar naratif yang dapat ditelusuri.'
    };
  }
  if (input.contradictsExistingData && input.hasNarrativeBasis) {
    return {
      classification: 'VALID_CHANGE',
      reason: 'Perbedaan memiliki dasar naratif yang dapat ditelusuri sehingga dapat menjadi perubahan karakter yang sah.'
    };
  }
  return {
    classification: input.currentKnown ? 'VALID_CHANGE' : 'UNKNOWN',
    reason: 'Tidak ditemukan konflik langsung atau informasi baru yang perlu diklasifikasikan lebih lanjut.'
  };
}

export function validateCharacterContinuityRecord(record: CharacterContinuityEntity): string[] {
  const errors: string[] = [];
  if (!record.identity.id || !EntityIdentityFactory.isValidId(record.identity.id)) {
    errors.push('Continuity ID tidak valid.');
  }
  if (!record.characterId || !EntityIdentityFactory.isValidId(record.characterId)) {
    errors.push('Character ID continuity tidak valid.');
  }
  if (record.identity.entityType !== EntityType.CONTINUITY) {
    errors.push('Continuity record harus memiliki EntityType.CONTINUITY.');
  }
  for (const type of CHECK_TYPES) {
    if (!record.checks[type]) errors.push(`Continuity check '${type}' belum tersedia.`);
  }
  for (const conflict of record.conflicts) {
    if (!conflict.conflictDescription.trim()) errors.push(`Conflict '${conflict.conflictId}' tidak memiliki deskripsi.`);
    if (conflict.resolutionStatus === ContinuityResolutionStatus.RESOLVED && !conflict.resolution?.trim()) {
      errors.push(`Conflict '${conflict.conflictId}' berstatus RESOLVED tetapi resolution kosong.`);
    }
  }
  return errors;
}

export interface CharacterContinuityLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

export class CharacterContinuityLifecycle {
  public static createFromValidation(
    universe: UniverseModel,
    characterId: string,
    checkedAt = universe.temporalContext.currentUniverseTime
  ): CharacterContinuityLifecycleResult<CharacterContinuityEntity> {
    const report = validateCharacterContinuity(universe, characterId, checkedAt);
    const character = universe.characters[characterId];
    if (!character) {
      return { result: 'REJECTED', reasons: Object.freeze(['Character tidak ditemukan.']) };
    }

    const owner = makeSystemID('CHARACTER_SYSTEM');
    const domain = makeDomainID('CHARACTER');
    const revision = RevisionHistoryManager.createInitial(
      owner,
      checkedAt,
      `Character Continuity validation: ${characterId}`
    );
    const identity = EntityIdentityFactory.create({
      id: characterId + '_CONTINUITY',
      entityType: EntityType.CONTINUITY,
      displayName: `Continuity ${character.identity.displayName}`,
      status: EntityLifecycleStatus.ACTIVE,
      createdAtUniverseTime: checkedAt
    });

    const validationEntry: ContinuityValidationHistoryEntry = Object.freeze({
      validationDate: checkedAt,
      validationResult: report.result,
      validatedBy: 'CHARACTER_CONTINUITY_SYSTEM',
      validationNotes: report.issues.map(x => x.message).join(' | ') || undefined
    });

    const conflicts: CharacterContinuityConflict[] = report.issues.map((finding, index) => Object.freeze({
      conflictId: `CONFLICT_${characterId}_${String(index + 1).padStart(4, '0')}`,
      conflictType: finding.type as ContinuityConflictType,
      conflictDescription: finding.message,
      affectedData: Object.freeze([characterId, ...finding.evidenceReferences]),
      resolutionStatus: ContinuityResolutionStatus.UNRESOLVED,
      detectedAt: checkedAt,
      evidenceReferences: Object.freeze([...finding.evidenceReferences])
    }));

    const record: CharacterContinuityEntity = Object.freeze({
      identity,
      characterId,
      checks: report.checks,
      changes: Object.freeze([]),
      conflicts: Object.freeze(conflicts),
      validationHistory: Object.freeze([validationEntry]),
      history: revision,
      provenance: createProvenanceMetadata(owner, domain, revision.currentRevisionId, AuthorityLevel.AUTHORITATIVE)
    });

    const errors = validateCharacterContinuityRecord(record);
    if (errors.length) return { result: 'REJECTED', reasons: Object.freeze(errors) };
    return { result: 'ACCEPTED', data: record, reasons: Object.freeze([]) };
  }

  public static resolveConflict(
    current: CharacterContinuityEntity,
    conflictId: string,
    resolution: string,
    resolutionDate: string
  ): CharacterContinuityLifecycleResult<CharacterContinuityEntity> {
    if (!resolution.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Resolution tidak boleh kosong.']) };
    const target = current.conflicts.find(x => x.conflictId === conflictId);
    if (!target) return { result: 'REJECTED', reasons: Object.freeze([`Conflict '${conflictId}' tidak ditemukan.`]) };

    const nextConflicts = current.conflicts.map(conflict =>
      conflict.conflictId === conflictId
        ? Object.freeze({ ...conflict, resolutionStatus: ContinuityResolutionStatus.RESOLVED, resolution })
        : conflict
    );
    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      resolutionDate,
      [`conflicts.${conflictId}`],
      `Continuity conflict resolution: ${conflictId}`
    );
    const next: CharacterContinuityEntity = Object.freeze({
      ...current,
      conflicts: Object.freeze(nextConflicts),
      history: nextHistory,
      provenance: Object.freeze({
        ...current.provenance,
        revision: nextHistory.currentRevisionId,
        recordedTimestamp: Date.now()
      })
    });
    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }
}

export function continuityReferenceForCharacter(characterId: string): EntityID {
  return makeEntityID(characterId + '_CONTINUITY');
}
