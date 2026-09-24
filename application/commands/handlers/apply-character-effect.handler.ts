/**
 * Application Command Handler: Apply Character Indicator Effect
 */

import { ApplicationCommand, CommandResult, successCommandResult, failureCommandResult } from '../../contracts/command.ts';
import { CharacterAggregate, CharacterAggregateLifecycle } from '../../../core/CHARACTER/character-aggregate.ts';
import { CharacterIndicatorEffect } from '../../../core/CHARACTER/indicator/indicator.ts';
import { ActorDataSource } from '../../../core/CHARACTER/actor.ts';
import { makeDomainID, makeSystemID } from '../../../core/SHARED/identifiers.ts';
import { ModelValidationStatus, AuthorityLevel } from '../../../core/SHARED/model-types.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';
import { UniverseModelFactory } from '../../../core/UNIVERSE/CANON/universe.ts';

export interface ApplyCharacterEffectPayload {
  readonly effectId: string;
  readonly characterId: string;
  readonly indicatorKey: string;
  readonly operation: 'SET' | 'INCREASE' | 'DECREASE';
  readonly value: number;
  readonly ruleReference: string;
  readonly effectiveAt: string;
  readonly recordedAt: string;
}

export class ApplyCharacterEffectCommandHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(command: ApplicationCommand<ApplyCharacterEffectPayload>): CommandResult<{ characterId: string; indicatorKey: string; current: number }> {
    const payload = command.payload;
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return failureCommandResult(command.header.commandId, 'UNIVERSE_NOT_MOUNTED', 'No Universe instance is currently mounted.');
    }

    const character = mounted.universe.characters[payload.characterId];
    if (!character) {
      return failureCommandResult(command.header.commandId, 'CHARACTER_NOT_FOUND', `Character '${payload.characterId}' not found in current universe.`);
    }

    const aggregate: CharacterAggregate = Object.freeze({
      character,
      behaviors: Object.freeze({}),
      styles: Object.freeze({})
    });

    const provenance = Object.freeze({
      ownerSystem: makeSystemID('CHARACTER_SYSTEM'),
      domainId: makeDomainID('CHARACTER'),
      authorityLevel: AuthorityLevel.AUTHORITATIVE,
      validationStatus: ModelValidationStatus.VALID,
      revision: 'REV_' + Date.now(),
      recordedTimestamp: command.header.timestamp
    });

    const effect: CharacterIndicatorEffect = Object.freeze({
      effectId: payload.effectId,
      characterId: payload.characterId,
      indicatorKey: payload.indicatorKey,
      operation: payload.operation,
      value: payload.value,
      ruleReference: payload.ruleReference,
      source: ActorDataSource.STORY_DERIVED,
      triggerType: 'EVENT'
    });

    const mutationResult = CharacterAggregateLifecycle.applyIndicatorEffect(aggregate, {
      effect,
      operation: payload.operation,
      value: payload.value,
      triggerType: 'EVENT',
      effectiveAt: payload.effectiveAt,
      recordedAt: payload.recordedAt,
      changeId: `chg_${payload.effectId}`,
      source: ActorDataSource.STORY_DERIVED,
      provenance
    });

    if (!mutationResult.valid || !mutationResult.aggregate) {
      return failureCommandResult(
        command.header.commandId,
        'MUTATION_REJECTED',
        `Indicator effect mutation rejected: ${mutationResult.issues.map(i => i.message).join(', ')}`,
        mutationResult.issues
      );
    }

    // Persist updated character into Universe
    const evolvedUniverse = UniverseModelFactory.evolve(
      mounted.universe,
      {
        characters: {
          ...mounted.universe.characters,
          [payload.characterId]: mutationResult.aggregate.character
        },
        sourceSystem: makeSystemID('CHARACTER_SYSTEM'),
        effectiveTime: payload.recordedAt,
        changedFields: ['characters'],
        reason: `Applied indicator effect ${payload.effectId} to character ${payload.characterId}`
      }
    );

    this.instanceManager.persist(evolvedUniverse);
    this.instanceManager.load(evolvedUniverse.universeId, mounted.universeScope);

    const updatedCurrent = mutationResult.aggregate.character.indicators?.condition[payload.indicatorKey]?.current ?? 0;

    return successCommandResult(command.header.commandId, {
      characterId: payload.characterId,
      indicatorKey: payload.indicatorKey,
      current: updatedCurrent
    });
  }
}
