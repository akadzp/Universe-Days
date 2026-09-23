/**
 * Event/Story -> Character integration boundary.
 *
 * An Event may identify the Character and provide validated effects. This layer
 * coordinates Indicator and Character State lifecycles; it never lets Event or
 * AI directly mutate Character truth.
 */
import { CharacterEntity } from './character.ts';
import { CharacterAggregate, CharacterAggregateLifecycle, validateCharacterAggregate } from './character-aggregate.ts';
import { CharacterIndicatorEffect } from './indicator/indicator.ts';
import { validateCharacterIndicatorEffect } from './indicator/effects.ts';
import { CharacterStateChangeInput, CharacterStateEntity, CharacterStateLifecycle } from '../DOMAIN/STATE/character-state.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';

export interface CharacterEventIntegrationInput {
  readonly event: EventEntity;
  readonly aggregate: CharacterAggregate;
  readonly indicatorEffects?: readonly CharacterIndicatorEffect[];
  readonly stateChange?: CharacterStateChangeInput;
  /** Engine recording time; deliberately separate from Event effective time. */
  readonly recordedAt: string;
}

export interface CharacterEventIntegrationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly nextState?: CharacterStateEntity;
  readonly appliedEffects: readonly string[];
  readonly issues: readonly string[];
}

function participantMatches(event: EventEntity, characterId: string): boolean {
  return event.participantRefs.some(ref => (ref as string) === characterId);
}

export function integrateEventWithCharacter(input: CharacterEventIntegrationInput): CharacterEventIntegrationResult {
  const characterId = input.aggregate.character.identity.id as string;
  if (!participantMatches(input.event, characterId)) {
    return Object.freeze({ valid: false, appliedEffects: Object.freeze([]), issues: Object.freeze(['Event tidak mencantumkan Character sebagai participant.']) });
  }

  let aggregate = input.aggregate;
  const applied: string[] = [];
  for (const effect of input.indicatorEffects ?? []) {
    const validation = validateCharacterIndicatorEffect(effect);
    if (!validation.valid) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(validation.issues.map(x => x.message)) });
    }
    if (effect.characterId !== characterId) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze([`Effect ${effect.effectId} bukan milik Character participant ini.`]) });
    }
    const result = CharacterAggregateLifecycle.applyIndicatorEffect(aggregate, {
      effect,
      operation: effect.operation,
      value: effect.value,
      triggerType: effect.triggerType,
      triggerReference: effect.triggerReference ?? input.event.eventId,
      effectiveAt: input.event.temporalInterval.start,
      recordedAt: input.recordedAt,
      changeId: effect.effectId,
      source: effect.source,
      provenance: aggregate.character.provenance,
      reason: `Event ${input.event.eventId}: ${effect.ruleReference}`
    });
    if (!result.valid || !result.aggregate) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(result.issues.map(x => x.message)) });
    }
    aggregate = result.aggregate;
    applied.push(effect.effectId);
  }

  let nextState: CharacterStateEntity | undefined;
  if (input.stateChange) {
    if (!aggregate.state) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(['State change diberikan tetapi aggregate tidak memiliki Character State.']) });
    }
    if (input.stateChange.sourceEventReference && input.stateChange.sourceEventReference !== input.event.eventId) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(['State change sourceEventReference tidak sama dengan Event yang sedang diintegrasikan.']) });
    }
    const stateResult = CharacterStateLifecycle.changeState(aggregate.state, {
      ...input.stateChange,
      sourceEventReference: input.stateChange.sourceEventReference ?? input.event.eventId
    });
    if (stateResult.result !== 'ACCEPTED' || !stateResult.data) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(stateResult.reasons) });
    }
    const updatedState = stateResult.data;
    nextState = updatedState;
    aggregate = withIntegratedStateReference(aggregate, updatedState);
    const aggregateReport = validateCharacterAggregate(aggregate);
    if (!aggregateReport.valid) {
      return Object.freeze({ valid: false, appliedEffects: Object.freeze(applied), issues: Object.freeze(aggregateReport.issues.map(x => x.message)) });
    }
  }

  return Object.freeze({ valid: true, aggregate, nextState, appliedEffects: Object.freeze(applied), issues: Object.freeze([]) });
}

export function withIntegratedStateReference(aggregate: CharacterAggregate, state: CharacterStateEntity): CharacterAggregate {
  const character: CharacterEntity = Object.freeze({
    ...aggregate.character,
    stateReference: state.stateId
  });
  return Object.freeze({ ...aggregate, character, state });
}
