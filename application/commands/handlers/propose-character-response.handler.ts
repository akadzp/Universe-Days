/**
 * Application Command Handler: Propose Character Response (AI / Non-authoritative)
 */

import { ApplicationCommand, CommandResult, successCommandResult, failureCommandResult } from '../../contracts/command.ts';
import { CharacterAggregate } from '../../../core/CHARACTER/character-aggregate.ts';
import { proposeCharacterResponse, CharacterResponseProposal } from '../../../core/CHARACTER/character-response-engine.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';
import { EventEntity } from '../../../core/UNIVERSE/CANON/event.ts';

export interface ProposeCharacterResponsePayload {
  readonly characterId: string;
  readonly eventId: string;
  readonly intent: string;
  readonly rationaleReferences?: readonly string[];
  readonly recordedAt: string;
}

export class ProposeCharacterResponseCommandHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(command: ApplicationCommand<ProposeCharacterResponsePayload>): CommandResult<CharacterResponseProposal> {
    const payload = command.payload;
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return failureCommandResult(command.header.commandId, 'UNIVERSE_NOT_MOUNTED', 'No Universe instance is currently mounted.');
    }

    const character = mounted.universe.characters[payload.characterId];
    if (!character) {
      return failureCommandResult(command.header.commandId, 'CHARACTER_NOT_FOUND', `Character '${payload.characterId}' not found.`);
    }

    const event = mounted.universe.events[payload.eventId];
    if (!event) {
      return failureCommandResult(command.header.commandId, 'EVENT_NOT_FOUND', `Event '${payload.eventId}' not found.`);
    }

    const aggregate: CharacterAggregate = Object.freeze({
      character,
      behaviors: Object.freeze({}),
      styles: Object.freeze({})
    });

    const proposal = proposeCharacterResponse({
      aggregate,
      event: event as EventEntity,
      intent: payload.intent,
      rationaleReferences: payload.rationaleReferences,
      recordedAt: payload.recordedAt
    });

    return successCommandResult(command.header.commandId, proposal);
  }
}
