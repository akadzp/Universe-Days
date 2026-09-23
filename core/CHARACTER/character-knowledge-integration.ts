/**
 * Knowledge -> Event -> Character integration boundary.
 *
 * Knowledge remains authoritative in DOMAIN/KNOWLEDGE. Character stores only
 * stable knowledge references. Event is the causal/evidence boundary: it must
 * contain the Character as participant before knowledge can be acquired or
 * changed for that Character.
 */
import { CharacterEntity } from './character.ts';
import { CharacterAggregate, validateCharacterAggregate } from './character-aggregate.ts';
import {
  KnowledgeEntity,
  KnowledgeInput,
  KnowledgeChangeRequest,
  KnowledgeLifecycle,
  validateKnowledge
} from '../DOMAIN/KNOWLEDGE/knowledge.ts';
import { ActorDataSource } from './actor.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import { RevisionHistoryManager } from '../SHARED/history.ts';
import { makeSystemID } from '../SHARED/identifiers.ts';

export interface CharacterKnowledgeIntegrationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly knowledge?: readonly KnowledgeEntity[];
  readonly acquiredKnowledgeIds: readonly string[];
  readonly changedKnowledgeIds: readonly string[];
  readonly issues: readonly string[];
}

export interface EventKnowledgeAcquisition extends Omit<KnowledgeInput, 'knowerRef' | 'effectiveFrom' | 'source'> {
  /** Optional explicit owner; must equal the Character participant. */
  readonly knowerRef?: string;
  readonly effectiveFrom?: string;
  readonly source?: ActorDataSource;
}

export interface EventKnowledgeChange {
  readonly current: KnowledgeEntity;
  readonly request: Omit<KnowledgeChangeRequest, 'knowledgeId' | 'source' | 'changeDate'> & {
    readonly source?: ActorDataSource;
    readonly changeDate?: string;
  };
}

function participantMatches(event: EventEntity, characterId: string): boolean {
  return event.participantRefs.some(ref => (ref as string) === characterId);
}

function addKnowledgeReference(character: CharacterEntity, knowledgeId: string): CharacterEntity {
  if (character.knowledgeReferences.includes(knowledgeId)) return character;

  const nextReferences = Object.freeze([...character.knowledgeReferences, knowledgeId]);
  const nextHistory = RevisionHistoryManager.appendRevision(
    character.history,
    makeSystemID('CHARACTER_SYSTEM'),
    character.temporalValidity.effectiveFrom,
    ['knowledgeReferences'],
    `Knowledge reference added: ${knowledgeId}`
  );

  return Object.freeze({
    ...character,
    knowledgeReferences: nextReferences,
    history: nextHistory,
    provenance: Object.freeze({
      ...character.provenance,
      revision: nextHistory.currentRevisionId
    })
  });
}

function validateKnowledgeOwner(knowledge: KnowledgeEntity, characterId: string): string | undefined {
  if (knowledge.knowerRef !== characterId) {
    return `Knowledge ${knowledge.knowledgeId} knowerRef '${knowledge.knowerRef}' tidak cocok dengan Character '${characterId}'.`;
  }
  return undefined;
}

/**
 * Integrates Knowledge acquisition/change caused by a resolved Event.
 *
 * The function is pure with respect to the input aggregate: it returns new
 * Character/Knowledge values and never mutates the Event or Character in place.
 */
export function integrateEventKnowledgeWithCharacter(input: {
  readonly event: EventEntity;
  readonly aggregate: CharacterAggregate;
  readonly acquisitions?: readonly EventKnowledgeAcquisition[];
  readonly changes?: readonly EventKnowledgeChange[];
  readonly recordedAt: string;
}): CharacterKnowledgeIntegrationResult {
  const characterId = input.aggregate.character.identity.id as string;

  if (!participantMatches(input.event, characterId)) {
    return Object.freeze({
      valid: false,
      acquiredKnowledgeIds: Object.freeze([]),
      changedKnowledgeIds: Object.freeze([]),
      issues: Object.freeze(['Event tidak mencantumkan Character sebagai participant.'])
    });
  }

  if (input.event.status !== 'RESOLVED') {
    return Object.freeze({
      valid: false,
      acquiredKnowledgeIds: Object.freeze([]),
      changedKnowledgeIds: Object.freeze([]),
      issues: Object.freeze(['Knowledge tidak boleh diaktualisasikan dari Event yang belum RESOLVED.'])
    });
  }

  let character = input.aggregate.character;
  const knowledge: KnowledgeEntity[] = [];
  const acquiredIds: string[] = [];
  const changedIds: string[] = [];

  for (const acquisition of input.acquisitions ?? []) {
    const source = acquisition.source ?? ActorDataSource.STORY_DERIVED;
    if (source !== ActorDataSource.STORY_DERIVED && source !== ActorDataSource.USER_DEFINED) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([`Knowledge acquisition '${acquisition.knowledgeId}' tidak authoritative dari source '${source}'.`]) });
    }

    const owner = acquisition.knowerRef ?? characterId;
    if (owner !== characterId) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([`Knowledge acquisition '${acquisition.knowledgeId}' bukan milik Character participant.`]) });
    }

    const effectiveFrom = acquisition.effectiveFrom ?? input.event.temporalInterval.start;
    if (effectiveFrom !== input.event.temporalInterval.start) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([`Knowledge '${acquisition.knowledgeId}' harus memperoleh effectiveFrom dari waktu Event atau binding temporal yang eksplisit.`]) });
    }

    const entity = KnowledgeLifecycle.deriveFromStory({
      ...acquisition,
      knowerRef: characterId,
      effectiveFrom,
      source: ActorDataSource.STORY_DERIVED
    });
    const validation = validateKnowledge(entity);
    if (!validation.valid) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze(validation.issues.map(x => x.message)) });
    }

    const ownerIssue = validateKnowledgeOwner(entity, characterId);
    if (ownerIssue) return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([ownerIssue]) });

    knowledge.push(entity);
    character = addKnowledgeReference(character, entity.knowledgeId);
    acquiredIds.push(entity.knowledgeId);
  }

  for (const change of input.changes ?? []) {
    const source = change.request.source ?? ActorDataSource.STORY_DERIVED;
    if (source !== ActorDataSource.STORY_DERIVED && source !== ActorDataSource.USER_DEFINED) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([`Knowledge change '${change.current.knowledgeId}' tidak authoritative dari source '${source}'.`]) });
    }

    const ownerIssue = validateKnowledgeOwner(change.current, characterId);
    if (ownerIssue) return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([ownerIssue]) });

    if (!character.knowledgeReferences.includes(change.current.knowledgeId)) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze([`Knowledge '${change.current.knowledgeId}' belum direferensikan oleh Character.`]) });
    }

    const changed = KnowledgeLifecycle.changeKnowledge(change.current, {
      ...change.request,
      knowledgeId: change.current.knowledgeId,
      source: ActorDataSource.STORY_DERIVED,
      changeDate: change.request.changeDate ?? input.event.temporalInterval.start
    });

    const validation = validateKnowledge(changed);
    if (!validation.valid) {
      return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze(validation.issues.map(x => x.message)) });
    }

    knowledge.push(changed);
    changedIds.push(changed.knowledgeId);
  }

  const nextAggregate: CharacterAggregate = Object.freeze({
    ...input.aggregate,
    character
  });
  const aggregateReport = validateCharacterAggregate(nextAggregate);
  if (!aggregateReport.valid) {
    return Object.freeze({ valid: false, acquiredKnowledgeIds: Object.freeze(acquiredIds), changedKnowledgeIds: Object.freeze(changedIds), issues: Object.freeze(aggregateReport.issues.map(x => x.message)) });
  }

  return Object.freeze({
    valid: true,
    aggregate: nextAggregate,
    knowledge: Object.freeze(knowledge),
    acquiredKnowledgeIds: Object.freeze(acquiredIds),
    changedKnowledgeIds: Object.freeze(changedIds),
    issues: Object.freeze([])
  });
}
