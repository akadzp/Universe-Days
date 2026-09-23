/**
 * Knowledge System
 *
 * Menyimpan pengetahuan yang dimiliki Actor secara individual. Knowledge
 * bukan Canon dan bukan representasi otomatis dari fakta objektif Universe.
 */

import { RevisionHistory, RevisionHistoryManager } from '../../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../../SHARED/provenance.ts';
import { AuthorityLevel, ModelValidationStatus } from '../../SHARED/model-types.ts';
import { TemporalStatus } from '../../RUNTIME/TEMPORAL/types.ts';
import { makeDomainID, makeSystemID } from '../../SHARED/identifiers.ts';
import { ActorDataSource } from '../../CHARACTER/actor.ts';
export { ActorDataSource };

export const EpistemicCertainty = {
  FACT: 'FACT',
  BELIEF: 'BELIEF',
  SUSPICION: 'SUSPICION',
  RUMOR: 'RUMOR',
  MISCONCEPTION: 'MISCONCEPTION',
  FORGOTTEN: 'FORGOTTEN'
} as const;

export type EpistemicCertainty = (typeof EpistemicCertainty)[keyof typeof EpistemicCertainty];

export interface KnowledgeChangeRecord {
  readonly knowledgeChange: string;
  readonly changeTrigger: string;
  readonly changeDate?: string;
  readonly previousKnowledge: string;
  readonly currentKnowledge: string;
  readonly source: ActorDataSource;
}

export interface KnowledgeEntity {
  readonly knowledgeId: string;
  readonly knowerRef: string;
  readonly referencedSubject: string;
  readonly statement: string;
  readonly knowledgeStatus: string;
  /** Operational representation of legacy KNOWLEDGE_SOURCE. */
  readonly acquisitionSource: string;
  readonly acquiredDate?: string;
  readonly contentRef?: string;
  readonly certainty: EpistemicCertainty;
  readonly isUniverseFactConfirmed?: boolean;
  readonly changes: readonly KnowledgeChangeRecord[];
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface KnowledgeInput {
  readonly knowledgeId: string;
  readonly knowerRef: string;
  readonly referencedSubject: string;
  readonly statement: string;
  readonly knowledgeStatus: string;
  /** Operational representation of legacy KNOWLEDGE_SOURCE. */
  readonly acquisitionSource: string;
  readonly acquiredDate?: string;
  readonly contentRef?: string;
  readonly certainty?: EpistemicCertainty;
  readonly isUniverseFactConfirmed?: boolean;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly temporalCategory?: TemporalStatus;
  readonly continuityReference?: string;
  readonly source?: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface KnowledgeChangeRequest {
  readonly knowledgeId: string;
  readonly previousStatement: string;
  readonly currentStatement: string;
  readonly changeTrigger: string;
  readonly changeDate?: string;
  readonly knowledgeChange: string;
  readonly source: ActorDataSource;
  readonly nextStatus?: string;
  readonly nextCertainty?: EpistemicCertainty;
  readonly temporalCategory?: TemporalStatus;
}

export interface KnowledgeValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface KnowledgeValidationReport {
  readonly valid: boolean;
  readonly issues: readonly KnowledgeValidationIssue[];
}

function issue(
  issues: KnowledgeValidationIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function isAuthoritativeSource(source: ActorDataSource): boolean {
  return source === ActorDataSource.USER_DEFINED || source === ActorDataSource.STORY_DERIVED;
}

function validateFieldSources(
  fieldSources: Readonly<Record<string, ActorDataSource>> | undefined,
  issues: KnowledgeValidationIssue[]
): void {
  for (const [field, source] of Object.entries(fieldSources ?? {})) {
    if (source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN) {
      issue(
        issues,
        'NON_AUTHORITATIVE_KNOWLEDGE_FIELD',
        `fieldSources.${field}`,
        `Knowledge field '${field}' cannot be authoritative from source '${source}'.`
      );
    }
  }
}

export function validateKnowledge(
  knowledge: Pick<KnowledgeEntity,
    'knowledgeId' |
    'knowerRef' |
    'referencedSubject' |
    'statement' |
    'knowledgeStatus' |
    'acquisitionSource' |
    'certainty' |
    'changes' |
    'temporalValidity' |
    'source' |
    'fieldSources'>
): KnowledgeValidationReport {
  const issues: KnowledgeValidationIssue[] = [];

  if (!knowledge.knowledgeId?.trim()) issue(issues, 'MISSING_KNOWLEDGE_ID', 'knowledgeId', 'KNOWLEDGE_ID wajib diisi.');
  if (!knowledge.knowerRef?.trim()) issue(issues, 'MISSING_KNOWLEDGE_KNOWER', 'knowerRef', 'CHARACTER_ID pemilik pengetahuan wajib diisi.');
  if (!knowledge.referencedSubject?.trim()) issue(issues, 'MISSING_KNOWLEDGE_SUBJECT', 'referencedSubject', 'Subjek pengetahuan wajib diisi.');
  if (!knowledge.statement?.trim()) issue(issues, 'MISSING_KNOWN_FACT', 'statement', 'KNOWN_FACT/statement wajib diisi.');
  if (!knowledge.knowledgeStatus?.trim()) issue(issues, 'MISSING_KNOWLEDGE_STATUS', 'knowledgeStatus', 'KNOWLEDGE_STATUS wajib diisi.');
  if (!knowledge.acquisitionSource?.trim()) issue(issues, 'MISSING_KNOWLEDGE_SOURCE', 'acquisitionSource', 'KNOWLEDGE_SOURCE wajib diisi.');
  if (!Object.values(['FACT', 'BELIEF', 'SUSPICION', 'RUMOR', 'MISCONCEPTION', 'FORGOTTEN']).includes(knowledge.certainty)) {
    issue(issues, 'INVALID_EPISTEMIC_CERTAINTY', 'certainty', `Certainty '${knowledge.certainty}' tidak dikenal.`);
  }
  if (!knowledge.temporalValidity?.effectiveFrom?.trim()) {
    issue(issues, 'MISSING_EFFECTIVE_DATE', 'temporalValidity.effectiveFrom', 'Tanggal mulai berlaku wajib diisi.');
  }
  if (!isAuthoritativeSource(knowledge.source)) {
    issue(
      issues,
      'NON_AUTHORITATIVE_KNOWLEDGE_SOURCE',
      'source',
      `Knowledge source '${knowledge.source}' tidak dapat menjadi Canon authoritative.`
    );
  }

  for (const [index, change] of knowledge.changes.entries()) {
    if (!change.changeTrigger?.trim()) {
      issue(issues, 'MISSING_CHANGE_TRIGGER', `changes.${index}.changeTrigger`, 'Perubahan knowledge wajib memiliki CHANGE_TRIGGER.');
    }
    if (!change.currentKnowledge?.trim() || !change.previousKnowledge?.trim()) {
      issue(issues, 'INCOMPLETE_KNOWLEDGE_CHANGE', `changes.${index}`, 'PREVIOUS_KNOWLEDGE dan CURRENT_KNOWLEDGE wajib tersedia.');
    }
    if (!isAuthoritativeSource(change.source)) {
      issue(
        issues,
        'NON_AUTHORITATIVE_CHANGE_SOURCE',
        `changes.${index}.source`,
        `Knowledge change tidak dapat menjadi perubahan authoritative dari source '${change.source}'.`
      );
    }
  }

  validateFieldSources(knowledge.fieldSources, issues);

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function createKnowledgeEntity(
  input: KnowledgeInput,
  source: ActorDataSource,
  description: string
): KnowledgeEntity {
  const owner = makeSystemID('KNOWLEDGE_SYSTEM');
  const domain = makeDomainID('KNOWLEDGE');
  const history = RevisionHistoryManager.createInitial(
    owner,
    input.effectiveFrom,
    `${description}: ${input.knowledgeId}`
  );

  return Object.freeze({
    knowledgeId: input.knowledgeId,
    knowerRef: input.knowerRef,
    referencedSubject: input.referencedSubject,
    statement: input.statement,
    knowledgeStatus: input.knowledgeStatus,
    acquisitionSource: input.acquisitionSource,
    acquiredDate: input.acquiredDate,
    contentRef: input.contentRef,
    certainty: input.certainty ?? 'FACT',
    isUniverseFactConfirmed: input.isUniverseFactConfirmed,
    changes: Object.freeze([]),
    temporalValidity: Object.freeze({
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      temporalCategory: input.temporalCategory ?? TemporalStatus.ACTUAL
    }),
    continuityReference: input.continuityReference,
    history,
    provenance: createProvenanceMetadata(
      owner,
      domain,
      history.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    ),
    source,
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined
  });
}

export class KnowledgeLifecycle {
  public static createManual(input: KnowledgeInput): KnowledgeEntity {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    if (!isAuthoritativeSource(source)) {
      throw new Error(`Manual Knowledge creation tidak dapat memakai source '${source}'.`);
    }
    const entity = createKnowledgeEntity(input, source, 'Manual Knowledge creation');
    const validation = validateKnowledge(entity);
    if (!validation.valid) {
      throw new Error(validation.issues.map(i => i.message).join(' '));
    }
    return entity;
  }

  public static deriveFromStory(input: KnowledgeInput): KnowledgeEntity {
    const entity = createKnowledgeEntity(input, ActorDataSource.STORY_DERIVED, 'Story-derived Knowledge acquisition');
    const validation = validateKnowledge(entity);
    if (!validation.valid) {
      throw new Error(validation.issues.map(i => i.message).join(' '));
    }
    return entity;
  }

  public static changeKnowledge(
    current: KnowledgeEntity,
    request: KnowledgeChangeRequest
  ): KnowledgeEntity {
    if (request.knowledgeId !== current.knowledgeId) {
      throw new Error('Knowledge change target tidak cocok dengan KNOWLEDGE_ID saat ini.');
    }
    if (!isAuthoritativeSource(request.source)) {
      throw new Error(`Knowledge change tidak dapat authoritative dari source '${request.source}'.`);
    }
    if (request.previousStatement !== current.statement) {
      throw new Error('PREVIOUS_KNOWLEDGE tidak cocok dengan statement authoritative saat ini.');
    }
    if (!request.currentStatement.trim()) {
      throw new Error('CURRENT_KNOWLEDGE wajib diisi.');
    }
    if (!request.changeTrigger.trim()) {
      throw new Error('CHANGE_TRIGGER wajib diisi.');
    }

    const change: KnowledgeChangeRecord = Object.freeze({
      knowledgeChange: request.knowledgeChange,
      changeTrigger: request.changeTrigger,
      changeDate: request.changeDate,
      previousKnowledge: request.previousStatement,
      currentKnowledge: request.currentStatement,
      source: request.source
    });

    const effectiveTime = request.changeDate ?? current.temporalValidity.effectiveFrom;
    const nextHistory = RevisionHistoryManager.appendRevision(
      current.history,
      makeSystemID('KNOWLEDGE_SYSTEM'),
      effectiveTime,
      ['statement', 'knowledgeStatus', 'certainty', 'changes'],
      `Knowledge changed: ${request.knowledgeChange}`,
      ModelValidationStatus.VALID
    );

    const next: KnowledgeEntity = Object.freeze({
      ...current,
      statement: request.currentStatement,
      knowledgeStatus: request.nextStatus ?? current.knowledgeStatus,
      certainty: request.nextCertainty ?? current.certainty,
      changes: Object.freeze([...current.changes, change]),
      temporalValidity: Object.freeze({
        ...current.temporalValidity,
        temporalCategory: request.temporalCategory ?? current.temporalValidity.temporalCategory
      }),
      history: nextHistory,
      provenance: createProvenanceMetadata(
        makeSystemID('KNOWLEDGE_SYSTEM'),
        makeDomainID('KNOWLEDGE'),
        nextHistory.currentRevisionId,
        AuthorityLevel.AUTHORITATIVE
      ),
      source: request.source
    });

    const validation = validateKnowledge(next);
    if (!validation.valid) {
      throw new Error(validation.issues.map(i => i.message).join(' '));
    }
    return next;
  }
}
