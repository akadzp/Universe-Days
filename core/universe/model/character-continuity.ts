/**
 * Character Continuity System
 *
 * Continuity adalah sistem pemeriksaan lintas-domain. Ia tidak menjadi pemilik
 * fakta Character, Behavior, Knowledge, State, Style, Relationship, atau Role.
 * Ia hanya menyimpan hasil pemeriksaan, perubahan yang ditelusuri, dan konflik.
 */

import { EntityIdentityFactory } from './identity.ts';
import { RevisionHistory, RevisionHistoryManager } from './history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from './provenance.ts';
import { AuthorityLevel } from './types.ts';
import { makeDomainID, makeEntityID, makeSystemID } from '../../types/identifiers.ts';
import { ActorDataSource } from './actor.ts';
import type { UniverseModel } from './universe.ts';

export enum ContinuityCheckStatus {
  NOT_CHECKED = 'NOT_CHECKED',
  CONSISTENT = 'CONSISTENT',
  NEW_INFORMATION = 'NEW_INFORMATION',
  VALID_CHANGE = 'VALID_CHANGE',
  DEVELOPMENT = 'DEVELOPMENT',
  CONTRADICTION = 'CONTRADICTION'
}

export enum ContinuityValidationResult {
  NOT_VALIDATED = 'NOT_VALIDATED',
  CONSISTENT = 'CONSISTENT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  CONFLICT = 'CONFLICT',
  BLOCKED = 'BLOCKED'
}

export enum ContinuityChangeType {
  IDENTITY = 'IDENTITY',
  ACTOR = 'ACTOR',
  ROLE = 'ROLE',
  RELATIONSHIP = 'RELATIONSHIP',
  BEHAVIOR = 'BEHAVIOR',
  KNOWLEDGE = 'KNOWLEDGE',
  STATE = 'STATE',
  STYLE = 'STYLE',
  OTHER = 'OTHER'
}

export enum ContinuityConflictStatus {
  UNRESOLVED = 'UNRESOLVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED'
}

export interface CharacterContinuityChecks {
  readonly identity: ContinuityCheckStatus;
  readonly role: ContinuityCheckStatus;
  readonly relationship: ContinuityCheckStatus;
  readonly behavior: ContinuityCheckStatus;
  readonly knowledge: ContinuityCheckStatus;
  readonly state: ContinuityCheckStatus;
  readonly style: ContinuityCheckStatus;
}

export interface ContinuityChangeRecord {
  readonly changeId: string;
  readonly changeType: ContinuityChangeType;
  readonly changeTrigger: string;
  readonly previousState?: string;
  readonly currentState?: string;
  readonly changeDate?: string;
  readonly sourceEvent?: string;
  readonly classification: ContinuityCheckStatus;
  readonly source: ActorDataSource;
}

export interface ContinuityConflictRecord {
  readonly conflictId: string;
  readonly conflictType: string;
  readonly conflictDescription: string;
  readonly affectedData: readonly string[];
  readonly resolutionStatus: ContinuityConflictStatus;
  readonly resolution?: string;
  readonly source: ActorDataSource;
}

export interface CharacterContinuityEntity {
  readonly continuityId: string;
  readonly characterId: string;
  readonly checks: CharacterContinuityChecks;
  readonly changes: readonly ContinuityChangeRecord[];
  readonly conflicts: readonly ContinuityConflictRecord[];
  readonly validationDate?: string;
  readonly validationResult: ContinuityValidationResult;
  readonly validatedBy?: string;
  readonly validationNotes?: string;
  readonly notes?: string;
  readonly source: ActorDataSource;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

export interface CharacterContinuityInput {
  readonly continuityId: string;
  readonly characterId: string;
  readonly effectiveFrom: string;
  readonly source?: ActorDataSource;
  readonly validatedBy?: string;
  readonly notes?: string;
}

export interface ContinuityValidationReport {
  readonly valid: boolean;
  readonly result: ContinuityValidationResult;
  readonly issues: readonly string[];
  readonly checks: CharacterContinuityChecks;
}

export interface ContinuityChangeInput {
  readonly changeId: string;
  readonly changeType: ContinuityChangeType;
  readonly changeTrigger: string;
  readonly previousState?: string;
  readonly currentState?: string;
  readonly changeDate?: string;
  readonly sourceEvent?: string;
  readonly classification: ContinuityCheckStatus;
  readonly source: ActorDataSource;
}

export interface ContinuityConflictInput {
  readonly conflictId: string;
  readonly conflictType: string;
  readonly conflictDescription: string;
  readonly affectedData: readonly string[];
  readonly resolutionStatus?: ContinuityConflictStatus;
  readonly resolution?: string;
  readonly source: ActorDataSource;
}

export interface ContinuityLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

function authoritativeSourceIssues(source: ActorDataSource, operation: string): string[] {
  if (source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN) {
    return [`${operation} tidak dapat menjadi data kontinuitas otoritatif dari source "${source}".`];
  }
  return [];
}

function statusForChecks(checks: CharacterContinuityChecks): ContinuityValidationResult {
  const values = Object.values(checks);
  if (values.includes(ContinuityCheckStatus.CONTRADICTION)) {
    return ContinuityValidationResult.CONFLICT;
  }
  if (values.includes(ContinuityCheckStatus.NOT_CHECKED)) {
    return ContinuityValidationResult.REVIEW_REQUIRED;
  }
  return ContinuityValidationResult.CONSISTENT;
}

function initialChecks(): CharacterContinuityChecks {
  return Object.freeze({
    identity: ContinuityCheckStatus.NOT_CHECKED,
    role: ContinuityCheckStatus.NOT_CHECKED,
    relationship: ContinuityCheckStatus.NOT_CHECKED,
    behavior: ContinuityCheckStatus.NOT_CHECKED,
    knowledge: ContinuityCheckStatus.NOT_CHECKED,
    state: ContinuityCheckStatus.NOT_CHECKED,
    style: ContinuityCheckStatus.NOT_CHECKED
  });
}

function freezeContinuity(entity: CharacterContinuityEntity): CharacterContinuityEntity {
  return Object.freeze({
    ...entity,
    checks: Object.freeze({ ...entity.checks }),
    changes: Object.freeze([...entity.changes]),
    conflicts: Object.freeze([...entity.conflicts])
  });
}

export function validateCharacterContinuity(
  continuity: CharacterContinuityEntity,
  universe: UniverseModel
): ContinuityValidationReport {
  const issues: string[] = [];
  let identity = ContinuityCheckStatus.CONSISTENT;
  let role = ContinuityCheckStatus.CONSISTENT;
  let relationship = ContinuityCheckStatus.CONSISTENT;
  let behavior = ContinuityCheckStatus.CONSISTENT;
  let knowledge = ContinuityCheckStatus.CONSISTENT;
  let state = ContinuityCheckStatus.CONSISTENT;
  let style = ContinuityCheckStatus.CONSISTENT;

  if (!continuity.continuityId || !EntityIdentityFactory.isValidId(continuity.continuityId)) {
    issues.push('Continuity ID tidak valid.');
  }
  if (!continuity.characterId || !EntityIdentityFactory.isValidId(continuity.characterId)) {
    issues.push('Character ID pada Continuity tidak valid.');
  }

  const character = universe.characters[continuity.characterId];
  if (!character) {
    issues.push(`Character '${continuity.characterId}' tidak ditemukan.`);
    identity = ContinuityCheckStatus.CONTRADICTION;
    return {
      valid: false,
      result: ContinuityValidationResult.CONFLICT,
      issues: Object.freeze(issues),
      checks: Object.freeze({ identity, role, relationship, behavior, knowledge, state, style })
    };
  }

  // Identity: stable character ID/display identity must still point to the same Character record.
  if (character.identity.id !== continuity.characterId) {
    identity = ContinuityCheckStatus.CONTRADICTION;
    issues.push('Identity Character tidak cocok dengan continuity.characterId.');
  }

  // Role: Role taxonomy belum menjadi owner yang didefinisikan dalam engine ini.
  // Karena itu Continuity hanya memastikan referensi tetap ada, tanpa menciptakan taxonomy Role.
  role = ContinuityCheckStatus.CONSISTENT;

  for (const ref of character.relationshipReferences ?? []) {
    const relationshipEntity = universe.relationships[ref];
    if (!relationshipEntity) {
      relationship = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Relationship '${ref}' yang direferensikan Character tidak ditemukan.`);
      continue;
    }
    const charId = makeEntityID(continuity.characterId);
    if (relationshipEntity.subjectRef !== charId && relationshipEntity.targetRef !== charId) {
      relationship = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Relationship '${ref}' tidak melibatkan Character '${continuity.characterId}'.`);
    }
  }

  for (const ref of character.behaviorReferences ?? []) {
    const behaviorEntity = universe.behaviors[ref];
    if (!behaviorEntity) {
      behavior = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Behavior '${ref}' tidak ditemukan.`);
    } else if (behaviorEntity.characterId !== continuity.characterId) {
      behavior = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Behavior '${ref}' bukan milik Character '${continuity.characterId}'.`);
    }
  }

  for (const ref of character.knowledgeReferences ?? []) {
    const knowledgeEntity = universe.knowledge[ref];
    if (!knowledgeEntity) {
      knowledge = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Knowledge '${ref}' tidak ditemukan.`);
    } else if (String(knowledgeEntity.knowerRef) !== continuity.characterId) {
      knowledge = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Knowledge '${ref}' dimiliki Character lain.`);
    }
  }

  if (character.stateReference) {
    const stateEntity = universe.states[character.stateReference];
    if (!stateEntity) {
      state = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`State '${character.stateReference}' tidak ditemukan.`);
    } else if (String(stateEntity.entityRef) !== continuity.characterId) {
      state = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`State '${character.stateReference}' bukan milik Character '${continuity.characterId}'.`);
    } else if (stateEntity.stateType === 'CHARACTER') {
      const locationRef = (stateEntity.currentValue as { currentLocationReference?: string })?.currentLocationReference;
      if (locationRef && !universe.locations[locationRef]) {
        state = ContinuityCheckStatus.CONTRADICTION;
        issues.push(`State Character mereferensikan Location '${locationRef}' yang tidak ditemukan.`);
      }
    }
  }

  for (const ref of character.styleReferences ?? []) {
    const styleEntity = universe.styles[ref];
    if (!styleEntity) {
      style = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Style '${ref}' tidak ditemukan.`);
    } else if (styleEntity.characterId !== continuity.characterId) {
      style = ContinuityCheckStatus.CONTRADICTION;
      issues.push(`Style '${ref}' bukan milik Character '${continuity.characterId}'.`);
    }
  }

  const checks: CharacterContinuityChecks = Object.freeze({
    identity, role, relationship, behavior, knowledge, state, style
  });

  const result = statusForChecks(checks);
  return {
    valid: issues.length === 0,
    result,
    issues: Object.freeze(issues),
    checks
  };
}

export function classifyContinuityChange(input: {
  readonly contradictsExisting: boolean;
  readonly hasNarrativeBasis: boolean;
  readonly isDevelopment?: boolean;
  readonly isNewInformation?: boolean;
}): ContinuityCheckStatus {
  if (input.contradictsExisting && !input.hasNarrativeBasis) {
    return ContinuityCheckStatus.CONTRADICTION;
  }
  if (input.isDevelopment) {
    return ContinuityCheckStatus.DEVELOPMENT;
  }
  if (input.isNewInformation) {
    return ContinuityCheckStatus.NEW_INFORMATION;
  }
  if (input.hasNarrativeBasis) {
    return ContinuityCheckStatus.VALID_CHANGE;
  }
  return ContinuityCheckStatus.CONSISTENT;
}

export class CharacterContinuityLifecycle {
  public static createManual(input: CharacterContinuityInput): ContinuityLifecycleResult<CharacterContinuityEntity> {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Pembuatan Character Continuity');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };

    const owner = makeSystemID('CHARACTER_SYSTEM');
    const domain = makeDomainID('CHARACTER');
    const history = RevisionHistoryManager.createInitial(owner, input.effectiveFrom, `Character Continuity: ${input.continuityId}`);
    const continuity = freezeContinuity({
      continuityId: input.continuityId,
      characterId: input.characterId,
      checks: initialChecks(),
      changes: [],
      conflicts: [],
      validationResult: ContinuityValidationResult.NOT_VALIDATED,
      validatedBy: input.validatedBy,
      notes: input.notes,
      source,
      history,
      provenance: createProvenanceMetadata(owner, domain, history.currentRevisionId, AuthorityLevel.AUTHORITATIVE)
    });
    return { result: 'ACCEPTED', data: continuity, reasons: Object.freeze([]) };
  }

  public static deriveFromStory(input: CharacterContinuityInput): ContinuityLifecycleResult<CharacterContinuityEntity> {
    const owner = makeSystemID('CHARACTER_SYSTEM');
    const domain = makeDomainID('CHARACTER');
    const history = RevisionHistoryManager.createInitial(owner, input.effectiveFrom, `Story-derived Character Continuity: ${input.continuityId}`);
    const continuity = freezeContinuity({
      continuityId: input.continuityId,
      characterId: input.characterId,
      checks: initialChecks(),
      changes: [],
      conflicts: [],
      validationResult: ContinuityValidationResult.NOT_VALIDATED,
      validatedBy: input.validatedBy,
      notes: input.notes,
      source: ActorDataSource.STORY_DERIVED,
      history,
      provenance: createProvenanceMetadata(owner, domain, history.currentRevisionId, AuthorityLevel.AUTHORITATIVE)
    });
    return { result: 'ACCEPTED', data: continuity, reasons: Object.freeze([]) };
  }

  public static applyValidation(
    current: CharacterContinuityEntity,
    report: ContinuityValidationReport,
    validationDate: string,
    validatedBy: string
  ): ContinuityLifecycleResult<CharacterContinuityEntity> {
    if (!validationDate.trim() || !validatedBy.trim()) {
      return { result: 'REJECTED', reasons: Object.freeze(['Validation date dan validatedBy wajib diisi untuk pencatatan hasil validation.']) };
    }

    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      validationDate,
      ['checks', 'validationDate', 'validationResult', 'validatedBy', 'validationNotes'],
      'Character Continuity validation'
    );

    const next = freezeContinuity({
      ...current,
      checks: report.checks,
      validationDate,
      validationResult: report.result,
      validatedBy,
      validationNotes: report.issues.length ? report.issues.join(' | ') : 'Tidak ditemukan konflik struktural pada pemeriksaan ini.',
      history: nextHistory,
      provenance: Object.freeze({ ...current.provenance, revision: nextHistory.currentRevisionId, recordedTimestamp: Date.now() })
    });

    return { result: report.result === ContinuityValidationResult.CONFLICT ? 'BLOCKED' : 'ACCEPTED', data: next, reasons: Object.freeze(report.issues) };
  }

  public static recordChange(
    current: CharacterContinuityEntity,
    input: ContinuityChangeInput
  ): ContinuityLifecycleResult<CharacterContinuityEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Pencatatan Character Continuity Change');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (!input.changeTrigger.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Change trigger wajib diisi.']) };

    const record: ContinuityChangeRecord = Object.freeze({ ...input });
    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      input.changeDate ?? current.validationDate ?? 'UNKNOWN_TIME',
      ['changes'],
      `Continuity change: ${input.changeType}`
    );
    const next = freezeContinuity({
      ...current,
      changes: [...current.changes, record],
      history: nextHistory,
      provenance: Object.freeze({ ...current.provenance, revision: nextHistory.currentRevisionId, recordedTimestamp: Date.now() })
    });
    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }

  public static recordConflict(
    current: CharacterContinuityEntity,
    input: ContinuityConflictInput
  ): ContinuityLifecycleResult<CharacterContinuityEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Pencatatan Continuity Conflict');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (!input.conflictDescription.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Conflict description wajib diisi.']) };
    if (!input.affectedData.length) return { result: 'REJECTED', reasons: Object.freeze(['Affected data wajib menunjuk data yang terdampak.']) };

    const conflict: ContinuityConflictRecord = Object.freeze({
      ...input,
      resolutionStatus: input.resolutionStatus ?? ContinuityConflictStatus.UNRESOLVED
    });
    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      current.validationDate ?? 'UNKNOWN_TIME',
      ['conflicts'],
      `Continuity conflict: ${input.conflictId}`
    );
    const next = freezeContinuity({
      ...current,
      conflicts: [...current.conflicts, conflict],
      validationResult: ContinuityValidationResult.CONFLICT,
      history: nextHistory,
      provenance: Object.freeze({ ...current.provenance, revision: nextHistory.currentRevisionId, recordedTimestamp: Date.now() })
    });
    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }

  public static resolveConflict(
    current: CharacterContinuityEntity,
    conflictId: string,
    resolution: string,
    source: ActorDataSource
  ): ContinuityLifecycleResult<CharacterContinuityEntity> {
    const sourceIssues = authoritativeSourceIssues(source, 'Resolusi Continuity Conflict');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (!resolution.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Resolution wajib diisi.']) };

    const index = current.conflicts.findIndex(item => item.conflictId === conflictId);
    if (index < 0) return { result: 'REJECTED', reasons: Object.freeze([`Conflict '${conflictId}' tidak ditemukan.`]) };

    const conflicts = [...current.conflicts];
    conflicts[index] = Object.freeze({
      ...conflicts[index],
      resolutionStatus: ContinuityConflictStatus.RESOLVED,
      resolution
    });

    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      current.validationDate ?? 'UNKNOWN_TIME',
      [`conflicts.${conflictId}`],
      `Resolve continuity conflict: ${conflictId}`
    );

    const unresolved = conflicts.some(item => item.resolutionStatus !== ContinuityConflictStatus.RESOLVED);
    const next = freezeContinuity({
      ...current,
      conflicts,
      validationResult: unresolved ? ContinuityValidationResult.CONFLICT : ContinuityValidationResult.REVIEW_REQUIRED,
      history: nextHistory,
      provenance: Object.freeze({ ...current.provenance, revision: nextHistory.currentRevisionId, recordedTimestamp: Date.now() })
    });
    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }
}
