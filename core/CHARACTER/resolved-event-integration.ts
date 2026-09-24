/**
 * Canonical Resolved Event -> Character integration orchestrator.
 *
 * This is an orchestration boundary only: it composes the Character-owned
 * Event and Knowledge integration contracts without mutating Canon, Event,
 * Knowledge, or persistence state. Domain owners remain responsible for the
 * eventual transaction/commit of their returned values.
 */
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import {
  CharacterEventIntegrationInput,
  CharacterEventIntegrationResult,
  integrateEventWithCharacter
} from './character-event-integration.ts';
import {
  CharacterKnowledgeIntegrationResult,
  EventKnowledgeAcquisition,
  EventKnowledgeChange,
  integrateEventKnowledgeWithCharacter
} from './character-knowledge-integration.ts';
import { CharacterAggregate } from './character-aggregate.ts';
import { KnowledgeEntity } from '../DOMAIN/KNOWLEDGE/knowledge.ts';
import { CharacterIndicatorEffect } from './indicator/indicator.ts';
import { CharacterStateChangeInput } from '../DOMAIN/STATE/character-state.ts';

export interface ResolvedEventCharacterIntegrationInput {
  readonly event: EventEntity;
  readonly aggregate: CharacterAggregate;
  readonly indicatorEffects?: readonly CharacterIndicatorEffect[];
  readonly stateChange?: CharacterStateChangeInput;
  readonly acquisitions?: readonly EventKnowledgeAcquisition[];
  readonly changes?: readonly EventKnowledgeChange[];
  /** Engine recording time; never used as Event effective time. */
  readonly recordedAt: string;
}

export interface ResolvedEventCharacterIntegrationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly knowledge?: readonly KnowledgeEntity[];
  readonly appliedEffects: readonly string[];
  readonly acquiredKnowledgeIds: readonly string[];
  readonly changedKnowledgeIds: readonly string[];
  readonly issues: readonly string[];
}

export function integrateResolvedEventWithCharacter(
  input: ResolvedEventCharacterIntegrationInput
): ResolvedEventCharacterIntegrationResult {
  if (input.event.status !== 'RESOLVED') {
    return Object.freeze({
      valid: false,
      appliedEffects: Object.freeze([]),
      acquiredKnowledgeIds: Object.freeze([]),
      changedKnowledgeIds: Object.freeze([]),
      issues: Object.freeze([
        `Resolved Event integration requires Event '${input.event.eventId}' to be RESOLVED.`
      ])
    });
  }

  const eventResult: CharacterEventIntegrationResult = integrateEventWithCharacter({
    event: input.event,
    aggregate: input.aggregate,
    indicatorEffects: input.indicatorEffects,
    stateChange: input.stateChange,
    recordedAt: input.recordedAt
  } satisfies CharacterEventIntegrationInput);

  if (!eventResult.valid || !eventResult.aggregate) {
    return Object.freeze({
      valid: false,
      appliedEffects: Object.freeze(eventResult.appliedEffects),
      acquiredKnowledgeIds: Object.freeze([]),
      changedKnowledgeIds: Object.freeze([]),
      issues: Object.freeze(eventResult.issues)
    });
  }

  const knowledgeResult: CharacterKnowledgeIntegrationResult = integrateEventKnowledgeWithCharacter({
    event: input.event,
    aggregate: eventResult.aggregate,
    acquisitions: input.acquisitions,
    changes: input.changes,
    recordedAt: input.recordedAt
  });

  if (!knowledgeResult.valid || !knowledgeResult.aggregate) {
    return Object.freeze({
      valid: false,
      aggregate: eventResult.aggregate,
      acquiredKnowledgeIds: Object.freeze(knowledgeResult.acquiredKnowledgeIds),
      changedKnowledgeIds: Object.freeze(knowledgeResult.changedKnowledgeIds),
      appliedEffects: Object.freeze(eventResult.appliedEffects),
      issues: Object.freeze(knowledgeResult.issues)
    });
  }

  return Object.freeze({
    valid: true,
    aggregate: knowledgeResult.aggregate,
    knowledge: knowledgeResult.knowledge,
    appliedEffects: Object.freeze(eventResult.appliedEffects),
    acquiredKnowledgeIds: Object.freeze(knowledgeResult.acquiredKnowledgeIds),
    changedKnowledgeIds: Object.freeze(knowledgeResult.changedKnowledgeIds),
    issues: Object.freeze([])
  });
}
