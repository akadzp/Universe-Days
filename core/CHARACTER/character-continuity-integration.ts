/**
 * Character continuity boundary.
 *
 * Existing UNIVERSE/CONTINUITY remains the generic continuity authority.
 * This adapter binds Character identity to a continuity item without copying
 * Character state into the continuity engine or inventing missing conditions.
 */
import { CharacterAggregate } from './character-aggregate.ts';
import { CharacterEntity } from './character.ts';
import { ContinuityIdentity, ContinuityIdentityValidator, ContinuityItem, ContinuityStatus, EffectiveTime } from '../UNIVERSE/CONTINUITY/continuity-model.ts';
import { Transition, TransitionType } from '../UNIVERSE/CONTINUITY/transition.ts';
import { ContinuityLifecycleManager } from '../UNIVERSE/CONTINUITY/lifecycle.ts';
import { RevisionHistoryManager } from '../SHARED/history.ts';
import { makeSystemID } from '../SHARED/identifiers.ts';

export const CHARACTER_CONTINUITY_DOMAIN = 'CHARACTER';

export interface CharacterContinuityBindingResult {
  readonly valid: boolean;
  readonly character?: CharacterEntity;
  readonly continuityItem?: ContinuityItem;
  readonly issues: readonly string[];
}

export function bindCharacterContinuity(input: {
  readonly aggregate: CharacterAggregate;
  readonly continuityItem: ContinuityItem;
  readonly effectiveTime: string;
}): CharacterContinuityBindingResult {
  const characterId = input.aggregate.character.identity.id as string;
  const identity: ContinuityIdentity = input.continuityItem.identity;
  const identityReport = ContinuityIdentityValidator.validate(identity);
  if (!identityReport.success || !identityReport.data) return Object.freeze({ valid: false, issues: Object.freeze([identityReport.message ?? 'Continuity identity invalid.']) });
  if (identity.entityRef !== characterId) return Object.freeze({ valid: false, issues: Object.freeze(['Continuity entityRef tidak cocok dengan Character identity.']) });
  if (identity.domainRef !== CHARACTER_CONTINUITY_DOMAIN) return Object.freeze({ valid: false, issues: Object.freeze(['Character continuity wajib menggunakan domainRef CHARACTER.']) });
  if (input.continuityItem.status === ContinuityStatus.INVALID) return Object.freeze({ valid: false, issues: Object.freeze(['Continuity item INVALID tidak dapat dibinding ke Character.']) });

  const nextCharacter: CharacterEntity = Object.freeze({
    ...input.aggregate.character,
    continuityReference: identity.continuityId,
    history: RevisionHistoryManager.appendRevision(
      input.aggregate.character.history,
      makeSystemID('CHARACTER_SYSTEM'),
      input.effectiveTime,
      ['continuityReference'],
      `Character continuity bound: ${identity.continuityId}`
    )
  });
  return Object.freeze({ valid: true, character: nextCharacter, continuityItem: input.continuityItem, issues: Object.freeze([]) });
}

export function buildCharacterContinuityTransition(input: {
  readonly aggregate: CharacterAggregate;
  readonly current: ContinuityItem;
  readonly transitionType: TransitionType;
  readonly effectiveTime: string;
  readonly sourceEventReference: string;
  readonly previousConditionRef?: ContinuityItem['previousConditionRef'];
  readonly currentConditionRef?: ContinuityItem['currentConditionRef'];
}): { readonly valid: boolean; readonly transition?: Transition; readonly issues: readonly string[] } {
  const characterId = input.aggregate.character.identity.id as string;
  if (input.current.identity.entityRef !== characterId || input.current.identity.domainRef !== CHARACTER_CONTINUITY_DOMAIN) {
    return Object.freeze({ valid: false, issues: Object.freeze(['Continuity item bukan continuity Character yang sesuai.']) });
  }
  const effective = EffectiveTime.create(input.effectiveTime);
  if (!effective) return Object.freeze({ valid: false, issues: Object.freeze(['effectiveTime Character continuity tidak valid.']) });
  const transition: Transition = Object.freeze({
    transitionId: `CHARACTER-${input.current.identity.continuityId}-${input.effectiveTime}`,
    type: input.transitionType,
    continuityId: input.current.identity.continuityId,
    previousConditionRef: input.previousConditionRef ?? input.current.currentConditionRef,
    currentConditionRef: input.currentConditionRef,
    effectiveTime: effective,
    sourceReference: input.sourceEventReference,
    metadata: Object.freeze({ characterId })
  });
  const manager = new ContinuityLifecycleManager(input.current.status);
  if (!manager.canTransition(ContinuityLifecycleManager.mapTargetStatus(input.current.status, transition), transition, { identity: input.current.identity })) {
    return Object.freeze({ valid: false, issues: Object.freeze(['Continuity lifecycle menolak transition Character.']) });
  }
  return Object.freeze({ valid: true, transition, issues: Object.freeze([]) });
}
