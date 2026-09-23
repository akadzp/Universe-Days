/**
 * Relationship -> Event -> Character integration boundary.
 *
 * Relationship remains authoritative in DOMAIN/RELATIONSHIP. Character stores
 * only stable relationship references. Group/co-occurrence is never treated
 * as relationship evidence.
 */
import { CharacterEntity } from './character.ts';
import { CharacterAggregate, validateCharacterAggregate } from './character-aggregate.ts';
import {
  RelationshipEntity,
  RelationshipLifecycle,
  RelationshipChangeInput,
  validateRelationship
} from '../DOMAIN/RELATIONSHIP/relationship.ts';
import { ActorDataSource } from './actor.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import { RevisionHistoryManager } from '../SHARED/history.ts';
import { makeSystemID } from '../SHARED/identifiers.ts';

export interface EventRelationshipAcquisition {
  readonly relationship: RelationshipEntity;
  readonly source?: ActorDataSource;
}

export interface EventRelationshipChange {
  readonly current: RelationshipEntity;
  readonly request: Omit<RelationshipChangeInput, 'sourceEvent' | 'effectiveFrom' | 'source'> & {
    readonly source?: ActorDataSource;
    readonly effectiveFrom?: string;
    readonly sourceEvent?: string;
  };
}

export interface CharacterRelationshipIntegrationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly relationships?: readonly RelationshipEntity[];
  readonly acquiredRelationshipIds: readonly string[];
  readonly changedRelationshipIds: readonly string[];
  readonly issues: readonly string[];
}

function participantMatches(event: EventEntity, characterId: string): boolean {
  return event.participantRefs.some(ref => (ref as string) === characterId);
}

function relationshipTouchesCharacter(relationship: RelationshipEntity, characterId: string): boolean {
  return (relationship.subjectRef as string) === characterId || (relationship.targetRef as string) === characterId;
}

function addRelationshipReference(character: CharacterEntity, relationshipId: string, effectiveAt: string): CharacterEntity {
  if (character.relationshipReferences.includes(relationshipId)) return character;
  const nextReferences = Object.freeze([...character.relationshipReferences, relationshipId]);
  const nextHistory = RevisionHistoryManager.appendRevision(
    character.history,
    makeSystemID('CHARACTER_SYSTEM'),
    effectiveAt,
    ['relationshipReferences'],
    `Relationship reference added: ${relationshipId}`
  );
  return Object.freeze({
    ...character,
    relationshipReferences: nextReferences,
    history: nextHistory,
    provenance: Object.freeze({ ...character.provenance, revision: nextHistory.currentRevisionId })
  });
}

export function integrateEventRelationshipWithCharacter(input: {
  readonly event: EventEntity;
  readonly aggregate: CharacterAggregate;
  readonly acquisitions?: readonly EventRelationshipAcquisition[];
  readonly changes?: readonly EventRelationshipChange[];
  readonly recordedAt: string;
}): CharacterRelationshipIntegrationResult {
  const characterId = input.aggregate.character.identity.id as string;
  const empty = { acquiredRelationshipIds: Object.freeze([]), changedRelationshipIds: Object.freeze([]) };

  if (!participantMatches(input.event, characterId)) {
    return Object.freeze({ valid: false, ...empty, issues: Object.freeze(['Event tidak mencantumkan Character sebagai participant.']) });
  }
  if (input.event.status !== 'RESOLVED') {
    return Object.freeze({ valid: false, ...empty, issues: Object.freeze(['Relationship canon tidak boleh diaktualisasikan dari Event yang belum RESOLVED.']) });
  }

  let character = input.aggregate.character;
  const relationships: RelationshipEntity[] = [];
  const acquired: string[] = [];
  const changed: string[] = [];
  const effectiveAt = input.event.temporalInterval.start;

  for (const item of input.acquisitions ?? []) {
    const relationship = item.relationship;
    if (!relationshipTouchesCharacter(relationship, characterId)) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${relationship.relationshipId}' tidak memiliki Character sebagai endpoint.`]) });
    }
    const source = item.source ?? relationship.source ?? ActorDataSource.STORY_DERIVED;
    if (source !== ActorDataSource.STORY_DERIVED && source !== ActorDataSource.USER_DEFINED) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${relationship.relationshipId}' bukan authoritative dari source '${source}'.`]) });
    }
    if (relationship.sourceEvent && relationship.sourceEvent !== input.event.eventId) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${relationship.relationshipId}' sourceEvent tidak cocok dengan Event.`]) });
    }
    if (relationship.temporalValidity.effectiveFrom !== effectiveAt) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${relationship.relationshipId}' effectiveFrom harus sama dengan waktu efektif Event.`]) });
    }
    const report = validateRelationship(relationship);
    if (!report.valid) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze(report.issues.map(x => x.message)) });
    }
    relationships.push(relationship);
    character = addRelationshipReference(character, relationship.relationshipId, effectiveAt);
    acquired.push(relationship.relationshipId);
  }

  for (const item of input.changes ?? []) {
    const current = item.current;
    if (!relationshipTouchesCharacter(current, characterId)) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${current.relationshipId}' tidak memiliki Character sebagai endpoint.`]) });
    }
    if (!character.relationshipReferences.includes(current.relationshipId)) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship '${current.relationshipId}' belum direferensikan oleh Character.`]) });
    }
    const source = item.request.source ?? ActorDataSource.STORY_DERIVED;
    if (source !== ActorDataSource.STORY_DERIVED && source !== ActorDataSource.USER_DEFINED) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship change '${current.relationshipId}' bukan authoritative dari source '${source}'.`]) });
    }
    const sourceEvent = item.request.sourceEvent ?? input.event.eventId;
    if (sourceEvent !== input.event.eventId) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship change '${current.relationshipId}' sourceEvent tidak cocok dengan Event.`]) });
    }
    const effectiveFrom = item.request.effectiveFrom ?? effectiveAt;
    if (effectiveFrom !== effectiveAt) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([`Relationship change '${current.relationshipId}' effectiveFrom harus sama dengan waktu efektif Event.`]) });
    }
    const result = RelationshipLifecycle.recordChange(current, {
      ...item.request,
      source,
      sourceEvent,
      effectiveFrom,
      changeDate: item.request.changeDate ?? effectiveAt
    } as RelationshipChangeInput);
    if (result.result !== 'ACCEPTED' || !result.data) {
      return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze(result.reasons) });
    }
    relationships.push(result.data);
    changed.push(result.data.relationshipId);
  }

  const nextAggregate: CharacterAggregate = Object.freeze({ ...input.aggregate, character });
  const aggregateReport = validateCharacterAggregate(nextAggregate);
  if (!aggregateReport.valid) {
    return Object.freeze({ valid: false, acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze(aggregateReport.issues.map(x => x.message)) });
  }
  return Object.freeze({ valid: true, aggregate: nextAggregate, relationships: Object.freeze(relationships), acquiredRelationshipIds: Object.freeze(acquired), changedRelationshipIds: Object.freeze(changed), issues: Object.freeze([]) });
}
