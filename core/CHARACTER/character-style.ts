/**
 * Character Style System
 *
 * Menyimpan gaya bahasa, pola ekspresi, dan karakteristik komunikasi karakter
 * secara terpisah dari Personality, Behavior, State, dan Knowledge.
 */

import { EntityIdentity, EntityIdentityFactory } from '../SHARED/identity.ts';
import { RevisionHistory, RevisionHistoryManager } from '../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../SHARED/provenance.ts';
import { AuthorityLevel, EntityLifecycleStatus, EntityType } from '../SHARED/model-types.ts';
import { makeSystemID, makeDomainID } from '../SHARED/identifiers.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { ActorDataSource } from './actor.ts';

export interface CharacterStyleSnapshot {
  readonly languageStyle?: string;
  readonly wordChoice?: string;
  readonly formalityLevel?: string;
  readonly sentencePattern?: string;
  readonly speechRhythm?: string;
  readonly emotionalExpression?: string;
  readonly humorStyle?: string;
  readonly reactionStyle?: string;
  readonly emphasisStyle?: string;
  readonly verbalSignature?: string;
  readonly commonExpressions?: readonly string[];
  readonly dialogueTendency?: string;
  readonly communicationHabits?: readonly string[];
  readonly casualStyle?: string;
  readonly seriousStyle?: string;
  readonly conflictStyle?: string;
  readonly emotionalStyle?: string;
}

export interface StyleChangeRecord {
  readonly changeId: string;
  readonly changeTrigger: string;
  readonly changeDate: string;
  readonly previousStyle: CharacterStyleSnapshot;
  readonly currentStyle: CharacterStyleSnapshot;
  readonly source: ActorDataSource;
  readonly basisReference?: string;
  readonly temporalStatus?: TemporalStatus;
}

export interface CharacterStyleEntity extends CharacterStyleSnapshot {
  readonly identity: EntityIdentity;
  readonly characterId: string;
  readonly changes: readonly StyleChangeRecord[];
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalStatus: TemporalStatus;
  };
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
  readonly notes?: string;
}

export interface CharacterStyleInput extends CharacterStyleSnapshot {
  readonly styleId: string;
  readonly characterId: string;
  readonly effectiveFrom: string;
  readonly temporalStatus?: TemporalStatus;
  readonly source?: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
  readonly notes?: string;
  readonly evidenceCount?: number;
  readonly narrativelySignificant?: boolean;
}

export interface StyleChangeInput {
  readonly changeId: string;
  readonly changeTrigger: string;
  readonly changeDate: string;
  readonly currentStyle: CharacterStyleSnapshot;
  readonly source: ActorDataSource;
  readonly basisReference?: string;
  readonly temporalStatus?: TemporalStatus;
}

export interface CharacterStyleLifecycleResult<T> {
  readonly result: 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  readonly data?: T;
  readonly reasons: readonly string[];
}

export interface CharacterStyleValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterStyleValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterStyleValidationIssue[];
}

function issue(
  issues: CharacterStyleValidationIssue[],
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

function freezeSnapshot(snapshot: CharacterStyleSnapshot): CharacterStyleSnapshot {
  return Object.freeze({
    languageStyle: snapshot.languageStyle,
    wordChoice: snapshot.wordChoice,
    formalityLevel: snapshot.formalityLevel,
    sentencePattern: snapshot.sentencePattern,
    speechRhythm: snapshot.speechRhythm,
    emotionalExpression: snapshot.emotionalExpression,
    humorStyle: snapshot.humorStyle,
    reactionStyle: snapshot.reactionStyle,
    emphasisStyle: snapshot.emphasisStyle,
    verbalSignature: snapshot.verbalSignature,
    commonExpressions: snapshot.commonExpressions ? Object.freeze([...snapshot.commonExpressions]) : undefined,
    dialogueTendency: snapshot.dialogueTendency,
    communicationHabits: snapshot.communicationHabits ? Object.freeze([...snapshot.communicationHabits]) : undefined,
    casualStyle: snapshot.casualStyle,
    seriousStyle: snapshot.seriousStyle,
    conflictStyle: snapshot.conflictStyle,
    emotionalStyle: snapshot.emotionalStyle
  });
}

function snapshotFromStyle(style: CharacterStyleEntity): CharacterStyleSnapshot {
  return freezeSnapshot({
    languageStyle: style.languageStyle,
    wordChoice: style.wordChoice,
    formalityLevel: style.formalityLevel,
    sentencePattern: style.sentencePattern,
    speechRhythm: style.speechRhythm,
    emotionalExpression: style.emotionalExpression,
    humorStyle: style.humorStyle,
    reactionStyle: style.reactionStyle,
    emphasisStyle: style.emphasisStyle,
    verbalSignature: style.verbalSignature,
    commonExpressions: style.commonExpressions,
    dialogueTendency: style.dialogueTendency,
    communicationHabits: style.communicationHabits,
    casualStyle: style.casualStyle,
    seriousStyle: style.seriousStyle,
    conflictStyle: style.conflictStyle,
    emotionalStyle: style.emotionalStyle
  });
}

export function validateCharacterStyle(style: CharacterStyleEntity): CharacterStyleValidationReport {
  const issues: CharacterStyleValidationIssue[] = [];

  if (!style.identity.id || !EntityIdentityFactory.isValidId(style.identity.id)) {
    issue(issues, 'INVALID_STYLE_ID', 'identity.id', 'Style ID tidak valid.');
  }
  if (!style.characterId || !EntityIdentityFactory.isValidId(style.characterId)) {
    issue(issues, 'INVALID_CHARACTER_ID', 'characterId', 'Character ID tidak valid.');
  }
  if (!Object.values(TemporalStatus).includes(style.temporalValidity.temporalStatus)) {
    issue(issues, 'INVALID_TEMPORAL_STATUS', 'temporalValidity.temporalStatus', 'Temporal status tidak valid.');
  }
  if (!Object.values(ActorDataSource).includes(style.source)) {
    issue(issues, 'INVALID_STYLE_SOURCE', 'source', 'Style source tidak valid.');
  }

  const fieldSourceIssue = Object.entries(style.fieldSources ?? {}).find(
    ([, source]) => source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN
  );
  if (fieldSourceIssue) {
    issue(
      issues,
      'NON_AUTHORITATIVE_FIELD_SOURCE',
      `fieldSources.${fieldSourceIssue[0]}`,
      'AI_PROPOSAL atau UNKNOWN tidak dapat menjadi sumber otoritatif style.'
    );
  }

  for (const change of style.changes) {
    if (!change.changeTrigger.trim()) {
      issue(
        issues,
        'MISSING_STYLE_CHANGE_TRIGGER',
        `changes.${change.changeId}.changeTrigger`,
        'Perubahan style wajib memiliki trigger/peristiwa dasar.'
      );
    }
    if (!change.changeDate.trim()) {
      issue(
        issues,
        'MISSING_STYLE_CHANGE_DATE',
        `changes.${change.changeId}.changeDate`,
        'Tanggal perubahan style wajib dicatat dalam format informasi yang tersedia.'
      );
    }
    if (!Object.values(ActorDataSource).includes(change.source)) {
      issue(
        issues,
        'INVALID_STYLE_CHANGE_SOURCE',
        `changes.${change.changeId}.source`,
        'Source perubahan style tidak valid.'
      );
    }
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function createStyleEntity(input: CharacterStyleInput, source: ActorDataSource, reason: string): CharacterStyleEntity {
  const owner = makeSystemID('CHARACTER_SYSTEM');
  const domain = makeDomainID('CHARACTER');
  const revision = RevisionHistoryManager.createInitial(
    owner,
    input.effectiveFrom,
    `${reason}: ${input.styleId}`
  );
  const identity = EntityIdentityFactory.create({
    id: input.styleId,
    entityType: EntityType.STYLE,
    displayName: `Style ${input.styleId}`,
    status: EntityLifecycleStatus.ACTIVE,
    createdAtUniverseTime: input.effectiveFrom
  });

  return Object.freeze({
    identity,
    characterId: input.characterId,
    ...freezeSnapshot(input),
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
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined,
    notes: input.notes
  });
}

export class CharacterStyleLifecycle {
  public static createManual(input: CharacterStyleInput): CharacterStyleLifecycleResult<CharacterStyleEntity> {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Pembuatan manual Style');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };

    const style = createStyleEntity(input, source, 'Pembuatan manual Style');
    const validation = validateCharacterStyle(style);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: style, reasons: Object.freeze([]) };
  }

  public static deriveFromStory(input: CharacterStyleInput): CharacterStyleLifecycleResult<CharacterStyleEntity> {
    const evidenceCount = input.evidenceCount ?? 0;
    const significant = input.narrativelySignificant === true;
    if (evidenceCount < 2 && !significant) {
      return {
        result: 'BLOCKED',
        reasons: Object.freeze([
          'Style tidak boleh menjadi karakteristik persisten hanya dari satu kemunculan yang tidak memiliki signifikansi naratif.'
        ])
      };
    }

    const style = createStyleEntity(input, ActorDataSource.STORY_DERIVED, 'Story-derived Style');
    const validation = validateCharacterStyle(style);
    if (!validation.valid) {
      return { result: 'BLOCKED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }
    return { result: 'ACCEPTED', data: style, reasons: Object.freeze([]) };
  }

  public static recordChange(
    current: CharacterStyleEntity,
    input: StyleChangeInput
  ): CharacterStyleLifecycleResult<CharacterStyleEntity> {
    const sourceIssues = authoritativeSourceIssues(input.source, 'Perubahan Style');
    if (sourceIssues.length) return { result: 'REJECTED', reasons: Object.freeze(sourceIssues) };
    if (current.characterId === '') return { result: 'REJECTED', reasons: Object.freeze(['Character ID tidak valid.']) };
    if (!input.changeTrigger.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Perubahan Style wajib memiliki trigger.']) };
    if (!input.changeDate.trim()) return { result: 'REJECTED', reasons: Object.freeze(['Change date wajib diketahui dalam bentuk informasi yang tersedia.']) };

    const previousStyle = snapshotFromStyle(current);
    const nextStyle = freezeSnapshot(input.currentStyle);
    const change: StyleChangeRecord = Object.freeze({
      changeId: input.changeId,
      changeTrigger: input.changeTrigger,
      changeDate: input.changeDate,
      previousStyle,
      currentStyle: nextStyle,
      source: input.source,
      basisReference: input.basisReference,
      temporalStatus: input.temporalStatus ?? TemporalStatus.ACTUAL
    });

    const revision = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('CHARACTER_SYSTEM'),
      input.changeDate,
      [
        'languageStyle', 'wordChoice', 'formalityLevel', 'sentencePattern', 'speechRhythm',
        'emotionalExpression', 'humorStyle', 'reactionStyle', 'emphasisStyle',
        'verbalSignature', 'commonExpressions', 'dialogueTendency', 'communicationHabits',
        'casualStyle', 'seriousStyle', 'conflictStyle', 'emotionalStyle'
      ],
      input.changeTrigger
    );

    const next: CharacterStyleEntity = Object.freeze({
      ...current,
      ...nextStyle,
      changes: Object.freeze([...current.changes, change]),
      history: revision,
      source: input.source,
      provenance: Object.freeze({
        ...current.provenance,
        revision: revision.currentRevisionId,
        recordedTimestamp: Date.now()
      })
    });

    const validation = validateCharacterStyle(next);
    if (!validation.valid) {
      return { result: 'REJECTED', reasons: Object.freeze(validation.issues.map(x => x.message)) };
    }

    return { result: 'ACCEPTED', data: next, reasons: Object.freeze([]) };
  }

  public static snapshot(style: CharacterStyleEntity): CharacterStyleSnapshot {
    return snapshotFromStyle(style);
  }
}
