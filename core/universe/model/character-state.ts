/**
 * Character State System
 *
 * State menggambarkan keadaan karakter pada titik waktu tertentu.
 * State bersifat dinamis dan tidak menjadi sumber identitas, personality,
 * knowledge, behavior, atau relationship.
 */

import { EntityID, makeDomainID, makeEntityID, makeSystemID } from '../../types/identifiers.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { AuthorityLevel, EntityLifecycleStatus, ModelValidationStatus } from './types.ts';
import { RevisionHistory, RevisionHistoryManager } from './history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from './provenance.ts';
import { EntityIdentityFactory } from './identity.ts';
import { StateEntity } from './state.ts';

export enum CharacterStateDataSource {
  USER_DEFINED = 'USER_DEFINED',
  STORY_DERIVED = 'STORY_DERIVED',
  AI_PROPOSAL = 'AI_PROPOSAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Snapshot keadaan karakter. Semua field bersifat optional karena cerita
 * dapat hanya mengungkap sebagian keadaan karakter.
 */
export interface CharacterStateSnapshot {
  readonly currentLocationReference?: string;
  readonly currentActivity?: string;
  readonly currentMood?: string;
  readonly currentCondition?: string;
  readonly currentGoal?: string;
  readonly currentStatus?: string;
}

export interface CharacterStateEntity extends StateEntity {
  readonly stateType: 'CHARACTER';
  readonly entityRef: EntityID;
  readonly currentValue: CharacterStateSnapshot;
  readonly previousValue?: CharacterStateSnapshot;
  readonly stateEvent?: string;
  readonly stateChange?: string;
  readonly changeTrigger?: string;
  readonly changeDate?: string;
  readonly sourceEventReference?: string;
  readonly source: CharacterStateDataSource;
  readonly fieldSources?: Readonly<Record<string, CharacterStateDataSource>>;
}

export interface CharacterStateInput {
  readonly stateId: string;
  readonly characterId: string;
  readonly snapshot: CharacterStateSnapshot;
  readonly effectiveFrom: string;
  readonly temporalCategory?: TemporalStatus;
  readonly stateEvent?: string;
  readonly sourceEventReference?: string;
  readonly source?: CharacterStateDataSource;
  readonly fieldSources?: Readonly<Record<string, CharacterStateDataSource>>;
}

export interface CharacterStateChangeInput {
  readonly changeTrigger: string;
  readonly changeDate: string;
  readonly previousState: CharacterStateSnapshot;
  readonly currentState: CharacterStateSnapshot;
  readonly stateChange: string;
  readonly source: CharacterStateDataSource;
  readonly stateEvent?: string;
  readonly sourceEventReference?: string;
  readonly temporalCategory?: TemporalStatus;
  readonly fieldSources?: Readonly<Record<string, CharacterStateDataSource>>;
}

export interface CharacterStateValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterStateValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterStateValidationIssue[];
}

export interface CharacterStateLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

function pushIssue(
  issues: CharacterStateValidationIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function authoritativeSourceIssues(source: CharacterStateDataSource, operation: string): string[] {
  if (source === CharacterStateDataSource.AI_PROPOSAL || source === CharacterStateDataSource.UNKNOWN) {
    return [`${operation} tidak dapat menjadi data otoritatif dari source "${source}".`];
  }
  return [];
}

function normalizeSnapshot(snapshot: CharacterStateSnapshot): CharacterStateSnapshot {
  const next: CharacterStateSnapshot = {
    currentLocationReference: snapshot.currentLocationReference?.trim() || undefined,
    currentActivity: snapshot.currentActivity?.trim() || undefined,
    currentMood: snapshot.currentMood?.trim() || undefined,
    currentCondition: snapshot.currentCondition?.trim() || undefined,
    currentGoal: snapshot.currentGoal?.trim() || undefined,
    currentStatus: snapshot.currentStatus?.trim() || undefined
  };
  return Object.freeze(next);
}

function snapshotsEqual(a: CharacterStateSnapshot, b: CharacterStateSnapshot): boolean {
  const keys: (keyof CharacterStateSnapshot)[] = [
    'currentLocationReference',
    'currentActivity',
    'currentMood',
    'currentCondition',
    'currentGoal',
    'currentStatus'
  ];
  return keys.every(key => a[key] === b[key]);
}

export function validateCharacterState(state: CharacterStateEntity): CharacterStateValidationReport {
  const issues: CharacterStateValidationIssue[] = [];

  if (!state.stateId || !EntityIdentityFactory.isValidId(state.stateId)) {
    pushIssue(issues, 'INVALID_STATE_ID', 'stateId', 'State ID tidak valid.');
  }
  if (!state.entityRef || !EntityIdentityFactory.isValidId(state.entityRef)) {
    pushIssue(issues, 'INVALID_CHARACTER_ID', 'entityRef', 'Character ID pada State tidak valid.');
  }
  if (state.stateType !== 'CHARACTER') {
    pushIssue(issues, 'INVALID_CHARACTER_STATE_TYPE', 'stateType', 'Character State harus memiliki stateType CHARACTER.');
  }
  if (!Object.values(TemporalStatus).includes(state.temporalValidity.temporalCategory)) {
    pushIssue(issues, 'INVALID_TEMPORAL_STATUS', 'temporalValidity.temporalCategory', 'Temporal status tidak valid.');
  }
  if (!Object.values(CharacterStateDataSource).includes(state.source)) {
    pushIssue(issues, 'INVALID_STATE_SOURCE', 'source', 'State source tidak valid.');
  }
  if (state.stateChange !== undefined && !state.changeTrigger?.trim()) {
    pushIssue(issues, 'STATE_CHANGE_REQUIRES_TRIGGER', 'changeTrigger', 'Setiap perubahan State harus memiliki change trigger.');
  }

  const aiField = Object.entries(state.fieldSources ?? {}).find(
    ([, source]) => source === CharacterStateDataSource.AI_PROPOSAL
  );
  if (aiField) {
    pushIssue(
      issues,
      'AI_PROPOSAL_NOT_AUTHORITATIVE',
      `fieldSources.${aiField[0]}`,
      'AI_PROPOSAL tidak dapat menjadi sumber otoritatif Character State.'
    );
  }

  if (state.currentValue?.currentLocationReference !== undefined && !state.currentValue.currentLocationReference.trim()) {
    pushIssue(
      issues,
      'INVALID_LOCATION_REFERENCE',
      'currentValue.currentLocationReference',
      'Location reference tidak boleh berupa string kosong.'
    );
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function createStateEntity(
  input: CharacterStateInput,
  source: CharacterStateDataSource,
  reason: string
): CharacterStateEntity {
  const owner = makeSystemID('STATE_SYSTEM');
  const domain = makeDomainID('STATE');
  const revision = RevisionHistoryManager.createInitial(owner, input.effectiveFrom, `${reason}: ${input.stateId}`);
  return Object.freeze({
    stateId: input.stateId,
    entityRef: makeEntityID(input.characterId),
    stateType: 'CHARACTER' as const,
    currentValue: normalizeSnapshot(input.snapshot),
    lifecycle: EntityLifecycleStatus.ACTIVE,
    validationStatus: ModelValidationStatus.VALID,
    temporalValidity: Object.freeze({
      effectiveFrom: input.effectiveFrom,
      temporalCategory: input.temporalCategory ?? TemporalStatus.ACTUAL
    }),
    transitionCount: 0,
    continuityReference: undefined,
    history: revision,
    provenance: createProvenanceMetadata(
      owner,
      domain,
      revision.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    ),
    stateEvent: input.stateEvent,
    sourceEventReference: input.sourceEventReference,
    source,
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined
  });
}

export class CharacterStateLifecycle {
  public static createManual(input: CharacterStateInput): CharacterStateLifecycleResult<CharacterStateEntity> {
    const source = input.source ?? CharacterStateDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Pembuatan manual Character State');
    if (sourceIssues.length) {
      return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    }

    const state = createStateEntity(input, source, 'Pembuatan manual Character State');
    const validation = validateCharacterState(state);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(issue => issue.message)) };
    }
    return { result: 'ACCEPTED', data: state, reasons: Object.freeze([]) };
  }

  public static deriveFromStory(input: CharacterStateInput): CharacterStateLifecycleResult<CharacterStateEntity> {
    const state = createStateEntity(input, CharacterStateDataSource.STORY_DERIVED, 'Story-derived Character State');
    const validation = validateCharacterState(state);
    if (!validation.valid) {
      return { result: 'BLOCKED', reasons: Object.freeze(validation.issues.map(issue => issue.message)) };
    }
    return { result: 'ACCEPTED', data: state, reasons: Object.freeze([]) };
  }

  public static changeState(
    current: CharacterStateEntity,
    input: CharacterStateChangeInput
  ): CharacterStateLifecycleResult<CharacterStateEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Perubahan Character State');
    if (sourceIssues.length) {
      return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    }
    if (!input.changeTrigger.trim()) {
      return { result: 'REJECTED', reasons: Object.freeze(['Perubahan State wajib memiliki change trigger.']) };
    }
    if (!input.stateChange.trim()) {
      return { result: 'REJECTED', reasons: Object.freeze(['stateChange wajib menjelaskan perubahan yang terjadi.']) };
    }

    const previous = normalizeSnapshot(input.previousState);
    if (!snapshotsEqual(previous, current.currentValue)) {
      return {
        result: 'REJECTED',
        reasons: Object.freeze(['Previous State pada request tidak sama dengan State authoritative saat ini.'])
      };
    }

    const currentState = normalizeSnapshot(input.currentState);
    const nextRevision = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('STATE_SYSTEM'),
      input.changeDate,
      ['currentValue', 'previousValue', 'temporalValidity', 'transitionCount', 'stateChange', 'changeTrigger'],
      input.stateChange
    );

    const nextState: CharacterStateEntity = Object.freeze({
      ...current,
      previousValue: current.currentValue,
      currentValue: currentState,
      temporalValidity: Object.freeze({
        effectiveFrom: input.changeDate,
        temporalCategory: input.temporalCategory ?? TemporalStatus.ACTUAL
      }),
      transitionCount: current.transitionCount + 1,
      history: nextRevision,
      validationStatus: ModelValidationStatus.VALID,
      stateEvent: input.stateEvent,
      stateChange: input.stateChange,
      changeTrigger: input.changeTrigger,
      changeDate: input.changeDate,
      sourceEventReference: input.sourceEventReference,
      source: input.source,
      fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : current.fieldSources
    });

    const validation = validateCharacterState(nextState);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(issue => issue.message)) };
    }

    return { result: 'ACCEPTED', data: nextState, reasons: Object.freeze([]) };
  }
}
