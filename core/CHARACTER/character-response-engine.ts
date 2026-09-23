/**
 * Character Decision / Response boundary.
 *
 * Produces a proposal from Character context. It never mutates Character,
 * creates an Action automatically, or promotes an AI proposal to canon.
 */
import { CharacterAggregate } from './character-aggregate.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import { DecisionStatus, UniverseDecision } from '../UNIVERSE/DAILY-CYCLE/decision-action.ts';
import { makeRequestID, makeSystemID } from '../SHARED/identifiers.ts';

export interface CharacterResponseProposal {
  readonly proposalId: string;
  readonly characterId: string;
  readonly eventId: string;
  readonly intent: string;
  readonly rationaleReferences: readonly string[];
  readonly proposedDecision: UniverseDecision;
  readonly authoritative: false;
}

export function proposeCharacterResponse(input: {
  readonly aggregate: CharacterAggregate;
  readonly event: EventEntity;
  readonly intent: string;
  readonly rationaleReferences?: readonly string[];
}): CharacterResponseProposal {
  const characterId = input.aggregate.character.identity.id as string;
  const proposalId = `CHAR-RESPONSE-${input.event.eventId}-${characterId}`;
  const decision: UniverseDecision = Object.freeze({
    decisionId: proposalId,
    status: DecisionStatus.POSSIBILITY,
    intent: input.intent,
    targetRef: characterId,
    temporalTarget: input.event.temporalInterval.start,
    traceability: {
      requestId: makeRequestID(`REQ_${proposalId}`),
      sourceSystem: makeSystemID('CHARACTER_RESPONSE_ENGINE'),
      timestamp: 0,
      version: '1.0.0'
    }
  });
  return Object.freeze({
    proposalId,
    characterId,
    eventId: input.event.eventId,
    intent: input.intent,
    rationaleReferences: Object.freeze([...(input.rationaleReferences ?? [])]),
    proposedDecision: decision,
    authoritative: false
  });
}
