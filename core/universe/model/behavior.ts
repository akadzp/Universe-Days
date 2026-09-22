/**
 * Behavior System
 *
 * Menyimpan pola perilaku karakter sebagai data terpisah dari Character Profile.
 * Behavior tidak boleh diisi dengan asumsi; perubahan harus memiliki dasar.
 */

import { EntityIdentity, EntityIdentityFactory } from './identity.ts';
import { RevisionHistory, RevisionHistoryManager } from './history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from './provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from './types.ts';
import { makeSystemID, makeDomainID } from '../../types/identifiers.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { ActorDataSource } from './actor.ts';

export enum BehaviorFrequency {
  RARE = 'RARE',
  OCCASIONAL = 'OCCASIONAL',
  FREQUENT = 'FREQUENT',
  CONSISTENT = 'CONSISTENT',
  UNKNOWN = 'UNKNOWN'
}

export enum BehaviorResponseIntensity {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VARIABLE = 'VARIABLE',
  UNKNOWN = 'UNKNOWN'
}

export interface BehaviorChangeRecord {
  readonly changeId: string;
  readonly changeTrigger: string;
  readonly changeDate: string;
  readonly previousPattern: string;
  readonly currentPattern: string;
  readonly source: ActorDataSource;
  readonly basisReference?: string;
  readonly temporalStatus?: TemporalStatus;
}

export interface BehaviorEntity {
  readonly identity: EntityIdentity;
  readonly characterId: string;
  readonly behaviorPattern: string;
  readonly behaviorContext?: string;
  readonly behaviorFrequency: BehaviorFrequency;
  readonly triggers: readonly string[];
  readonly triggerContext?: string;
  readonly typicalResponse?: string;
  readonly alternativeResponse?: string;
  readonly responseIntensity: BehaviorResponseIntensity;
  readonly changes: readonly BehaviorChangeRecord[];
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalStatus: TemporalStatus;
  };
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface BehaviorInput {
  readonly behaviorId: string;
  readonly characterId: string;
  readonly behaviorPattern: string;
  readonly behaviorContext?: string;
  readonly behaviorFrequency?: BehaviorFrequency;
  readonly triggers?: readonly string[];
  readonly triggerContext?: string;
  readonly typicalResponse?: string;
  readonly alternativeResponse?: string;
  readonly responseIntensity?: BehaviorResponseIntensity;
  readonly effectiveFrom: string;
  readonly temporalStatus?: TemporalStatus;
  readonly source?: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
  readonly evidenceCount?: number;
  readonly narrativelySignificant?: boolean;
}

export interface BehaviorChangeInput {
  readonly changeId: string;
  readonly changeTrigger: string;
  readonly changeDate: string;
  readonly previousPattern: string;
  readonly currentPattern: string;
  readonly source: ActorDataSource;
  readonly basisReference?: string;
  readonly temporalStatus?: TemporalStatus;
}

export interface BehaviorLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

export interface BehaviorValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface BehaviorValidationReport {
  readonly valid: boolean;
  readonly issues: readonly BehaviorValidationIssue[];
}

function issue(
  issues: BehaviorValidationIssue[],
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

export function validateBehavior(behavior: BehaviorEntity): BehaviorValidationReport {
  const issues: BehaviorValidationIssue[] = [];

  if (!behavior.identity.id || !EntityIdentityFactory.isValidId(behavior.identity.id)) {
    issue(issues, 'INVALID_BEHAVIOR_ID', 'identity.id', 'Behavior ID tidak valid.');
  }
  if (!behavior.characterId || !EntityIdentityFactory.isValidId(behavior.characterId)) {
    issue(issues, 'INVALID_CHARACTER_ID', 'characterId', 'Character ID tidak valid.');
  }
  if (!behavior.behaviorPattern.trim()) {
    issue(issues, 'EMPTY_BEHAVIOR_PATTERN', 'behaviorPattern', 'Behavior pattern tidak boleh kosong.');
  }
  if (!Object.values(BehaviorFrequency).includes(behavior.behaviorFrequency)) {
    issue(issues, 'INVALID_BEHAVIOR_FREQUENCY', 'behaviorFrequency', 'Behavior frequency tidak valid.');
  }
  if (!Object.values(BehaviorResponseIntensity).includes(behavior.responseIntensity)) {
    issue(issues, 'INVALID_RESPONSE_INTENSITY', 'responseIntensity', 'Response intensity tidak valid.');
  }
  if (!Object.values(TemporalStatus).includes(behavior.temporalValidity.temporalStatus)) {
    issue(issues, 'INVALID_TEMPORAL_STATUS', 'temporalValidity.temporalStatus', 'Temporal status tidak valid.');
  }
  if (!Object.values(ActorDataSource).includes(behavior.source)) {
    issue(issues, 'INVALID_BEHAVIOR_SOURCE', 'source', 'Behavior source tidak valid.');
  }

  for (const change of behavior.changes) {
    if (!change.changeTrigger.trim()) {
      issue(issues, 'MISSING_CHANGE_TRIGGER', `changes.${change.changeId}.changeTrigger`, 'Perubahan behavior wajib memiliki trigger/peristiwa dasar.');
    }
    if (!change.previousPattern.trim() || !change.currentPattern.trim()) {
      issue(issues, 'INVALID_BEHAVIOR_CHANGE_PATTERN', `changes.${change.changeId}`, 'Previous pattern dan current pattern wajib terisi.');
    }
    if (!Object.values(ActorDataSource).includes(change.source)) {
      issue(issues, 'INVALID_BEHAVIOR_CHANGE_SOURCE', `changes.${change.changeId}.source`, 'Source perubahan behavior tidak valid.');
    }
  }

  const aiField = Object.entries(behavior.fieldSources ?? {}).find(([, source]) => source === ActorDataSource.AI_PROPOSAL);
  if (aiField) {
    issue(issues, 'AI_PROPOSAL_NOT_AUTHORITATIVE', `fieldSources.${aiField[0]}`, 'AI_PROPOSAL tidak dapat menjadi sumber otoritatif behavior.');
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function createBehaviorEntity(input: BehaviorInput, source: ActorDataSource, reason: string): BehaviorEntity {
  const owner = makeSystemID('CHARACTER_SYSTEM');
  const domain = makeDomainID('CHARACTER');
  const revision = RevisionHistoryManager.createInitial(
    owner,
    input.effectiveFrom,
    `${reason}: ${input.behaviorId}`
  );

  const identity = EntityIdentityFactory.create({
    id: input.behaviorId,
    entityType: EntityType.BEHAVIOR,
    displayName: `Behavior ${input.behaviorId}`,
    status: EntityLifecycleStatus.ACTIVE,
    createdAtUniverseTime: input.effectiveFrom
  });

  return Object.freeze({
    identity,
    characterId: input.characterId,
    behaviorPattern: input.behaviorPattern,
    behaviorContext: input.behaviorContext,
    behaviorFrequency: input.behaviorFrequency ?? BehaviorFrequency.UNKNOWN,
    triggers: Object.freeze([...(input.triggers ?? [])]),
    triggerContext: input.triggerContext,
    typicalResponse: input.typicalResponse,
    alternativeResponse: input.alternativeResponse,
    responseIntensity: input.responseIntensity ?? BehaviorResponseIntensity.UNKNOWN,
    changes: Object.freeze([]),
    temporalValidity: Object.freeze({
      effectiveFrom: input.effectiveFrom,
      temporalStatus: input.temporalStatus ?? TemporalStatus.ACTUAL
    }),
    history: revision,
    provenance: createProvenanceMetadata(
      owner,
      domain,
      revision.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    ),
    source,
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined
  });
}

export class BehaviorLifecycle {
  public static createManual(input: BehaviorInput): BehaviorLifecycleResult<BehaviorEntity> {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Pembuatan manual Behavior');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };

    const behavior = createBehaviorEntity(input, source, 'Pembuatan manual Behavior');
    const validation = validateBehavior(behavior);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: behavior, reasons: Object.freeze([]) };
  }

  public static deriveFromStory(input: BehaviorInput): BehaviorLifecycleResult<BehaviorEntity> {
    const evidenceCount = input.evidenceCount ?? 0;
    const significant = input.narrativelySignificant === true;
    if (evidenceCount < 2 && !significant) {
      return {
        result: 'BLOCKED',
        reasons: Object.freeze([
          'Behavior tidak boleh menjadi pola persisten hanya dari satu kemunculan yang tidak memiliki signifikansi naratif.'
        ])
      };
    }

    const behavior = createBehaviorEntity(input, ActorDataSource.STORY_DERIVED, 'Story-derived Behavior');
    const validation = validateBehavior(behavior);
    if (!validation.valid) {
      return { result: 'BLOCKED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: behavior, reasons: Object.freeze([]) };
  }

  public static recordChange(
    current: BehaviorEntity,
    input: BehaviorChangeInput
  ): BehaviorLifecycleResult<BehaviorEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Perubahan Behavior');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (current.characterId === '') return { result: 'REJECTED', reasons: Object.freeze(['Character ID tidak valid.']) };
    if (input.previousPattern !== current.behaviorPattern) {
      return {
        result: 'REJECTED',
        reasons: Object.freeze(['Previous pattern tidak cocok dengan pattern behavior yang sedang aktif.'])
      };
    }
    if (!input.changeTrigger.trim()) {
      return { result: 'REJECTED', reasons: Object.freeze(['Perubahan Behavior wajib memiliki change trigger/basis peristiwa.']) };
    }
    if (!input.currentPattern.trim()) {
      return { result: 'REJECTED', reasons: Object.freeze(['Current pattern baru tidak boleh kosong.']) };
    }
    if (input.currentPattern === current.behaviorPattern) {
      return { result: 'REJECTED', reasons: Object.freeze(['Current pattern baru identik dengan pattern sebelumnya.']) };
    }

    const nextChange: BehaviorChangeRecord = Object.freeze({ ...input });
    const next: BehaviorEntity = Object.freeze({
      ...current,
      behaviorPattern: input.currentPattern,
      changes: Object.freeze([...current.changes, nextChange]),
      temporalValidity: Object.freeze({
        ...current.temporalValidity,
        effectiveFrom: input.changeDate,
        temporalStatus: input.temporalStatus ?? current.temporalValidity.temporalStatus
      }),
      history: RevisionHistoryManager.appendRevision(
        current.history,
        makeSystemID('CHARACTER_SYSTEM'),
        input.changeDate,
        ['behaviorPattern', 'changes', 'temporalValidity'],
        `Behavior change: ${input.changeTrigger}`
      ),
      source: input.source
    });

    const validation = validateBehavior(next);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }
}
