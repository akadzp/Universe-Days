/**
 * Application Command Handler: Create Character
 */

import { ApplicationCommand, CommandResult, successCommandResult, failureCommandResult } from '../../contracts/command.ts';
import { CharacterAggregate, validateCharacterAggregate } from '../../../core/CHARACTER/character-aggregate.ts';
import { ActorLevel } from '../../../core/CHARACTER/actor.ts';
import { ActorDataSource } from '../../../core/CHARACTER/actor.ts';
import { TemporalStatus } from '../../../core/RUNTIME/TEMPORAL/types.ts';
import { EntityType, EntityLifecycleStatus, ModelValidationStatus, AuthorityLevel } from '../../../core/SHARED/model-types.ts';
import { makeEntityID, makeDomainID, makeSystemID } from '../../../core/SHARED/identifiers.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';
import { UniverseModelFactory } from '../../../core/UNIVERSE/CANON/universe.ts';

export interface CreateCharacterPayload {
  readonly characterId: string;
  readonly displayName: string;
  readonly level?: ActorLevel;
  readonly initialMood?: number;
  readonly effectiveFrom?: string;
}

export class CreateCharacterCommandHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(command: ApplicationCommand<CreateCharacterPayload>): CommandResult<{ characterId: string; displayName: string }> {
    const { characterId, displayName, level = ActorLevel.CORE, initialMood = 70, effectiveFrom = '2026-01-01' } = command.payload;

    if (!characterId || !displayName) {
      return failureCommandResult(command.header.commandId, 'INVALID_PAYLOAD', 'characterId and displayName are required.');
    }

    const provenance = Object.freeze({
      ownerSystem: makeSystemID('CHARACTER_SYSTEM'),
      domainId: makeDomainID('CHARACTER'),
      authorityLevel: AuthorityLevel.AUTHORITATIVE,
      validationStatus: ModelValidationStatus.VALID,
      revision: 'REV_0001',
      recordedTimestamp: command.header.timestamp
    });

    const history = Object.freeze({ currentRevisionId: 'REV_0001', revisions: Object.freeze([]) });

    const character = Object.freeze({
      identity: Object.freeze({
        id: makeEntityID(characterId),
        entityType: EntityType.CHARACTER,
        displayName,
        status: EntityLifecycleStatus.ACTIVE
      }),
      roleReferences: Object.freeze([]),
      knowledgeReferences: Object.freeze([]),
      relationshipReferences: Object.freeze([]),
      behaviorReferences: Object.freeze([]),
      styleReferences: Object.freeze([]),
      indicators: Object.freeze({
        personality: Object.freeze({}),
        behavior: Object.freeze({}),
        capability: Object.freeze({}),
        motivation: Object.freeze({}),
        social: Object.freeze({}),
        condition: Object.freeze({
          mood: Object.freeze({
            indicatorId: `ind_${characterId}_mood`,
            key: 'mood',
            type: 'CONTINUOUS',
            persistence: 'DYNAMIC',
            mutable: true,
            range: Object.freeze({ min: 0, max: 100 }),
            current: initialMood,
            temporalValidity: Object.freeze({ effectiveFrom }),
            source: ActorDataSource.USER_DEFINED,
            provenance
          })
        }),
        history: Object.freeze([])
      }),
      temporalValidity: Object.freeze({ effectiveFrom, temporalCategory: TemporalStatus.ACTUAL }),
      history,
      provenance
    }) as any;

    const aggregate: CharacterAggregate = Object.freeze({
      character,
      behaviors: Object.freeze({}),
      styles: Object.freeze({})
    });

    const validation = validateCharacterAggregate(aggregate);
    if (!validation.valid) {
      return failureCommandResult(
        command.header.commandId,
        'VALIDATION_FAILED',
        `Character aggregate validation failed: ${validation.issues.map(i => i.message).join(', ')}`,
        validation.issues
      );
    }

    // Persist to current mounted universe if mounted
    const mounted = this.instanceManager.getMounted();
    if (mounted) {
      const evolvedUniverse = UniverseModelFactory.evolve(
        mounted.universe,
        {
          characters: {
            ...mounted.universe.characters,
            [characterId]: character
          },
          sourceSystem: makeSystemID('CHARACTER_SYSTEM'),
          effectiveTime: `${effectiveFrom}T00:00:00Z`,
          changedFields: ['characters'],
          reason: `Created character ${characterId}`
        }
      );
      this.instanceManager.persist(evolvedUniverse);
      this.instanceManager.load(evolvedUniverse.universeId, mounted.universeScope);
    }

    return successCommandResult(command.header.commandId, {
      characterId,
      displayName
    });
  }
}
