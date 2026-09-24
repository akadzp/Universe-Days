/**
 * Application Command Bus / Dispatcher.
 */

import { ApplicationCommand, CommandResult, failureCommandResult } from '../contracts/command.ts';
import { ApplicationAuthorizer } from '../authorization/policy.ts';
import { UniverseInstanceManager } from '../../core/INFRA/INSTANCE/instance.ts';
import { CreateCharacterCommandHandler } from './handlers/create-character.handler.ts';
import { ApplyCharacterEffectCommandHandler } from './handlers/apply-character-effect.handler.ts';
import { AdvanceDailyCycleCommandHandler } from './handlers/advance-daily-cycle.handler.ts';
import { ProposeCharacterResponseCommandHandler } from './handlers/propose-character-response.handler.ts';

export class ApplicationCommandBus {
  private readonly createCharacterHandler: CreateCharacterCommandHandler;
  private readonly applyEffectHandler: ApplyCharacterEffectCommandHandler;
  private readonly advanceDailyCycleHandler: AdvanceDailyCycleCommandHandler;
  private readonly proposeResponseHandler: ProposeCharacterResponseCommandHandler;

  public constructor(private readonly instanceManager: UniverseInstanceManager) {
    this.createCharacterHandler = new CreateCharacterCommandHandler(instanceManager);
    this.applyEffectHandler = new ApplyCharacterEffectCommandHandler(instanceManager);
    this.advanceDailyCycleHandler = new AdvanceDailyCycleCommandHandler(instanceManager);
    this.proposeResponseHandler = new ProposeCharacterResponseCommandHandler(instanceManager);
  }

  public async dispatch<TPayload, TResult>(command: ApplicationCommand<TPayload>): Promise<CommandResult<TResult>> {
    // 1. Authorization Guard
    const auth = ApplicationAuthorizer.authorizeCommand(command as ApplicationCommand);
    if (!auth.authorized) {
      return failureCommandResult(
        command.header.commandId,
        'UNAUTHORIZED',
        auth.reason ?? 'Actor is not authorized to execute this command.'
      );
    }

    // 2. Command Routing & Execution
    try {
      switch (command.header.commandType) {
        case 'CREATE_CHARACTER':
          return this.createCharacterHandler.handle(command as any) as unknown as CommandResult<TResult>;
        case 'APPLY_CHARACTER_INDICATOR_EFFECT':
          return this.applyEffectHandler.handle(command as any) as unknown as CommandResult<TResult>;
        case 'ADVANCE_DAILY_CYCLE':
          return this.advanceDailyCycleHandler.handle(command as any) as unknown as CommandResult<TResult>;
        case 'PROPOSE_CHARACTER_RESPONSE':
          return this.proposeResponseHandler.handle(command as any) as unknown as CommandResult<TResult>;
        default:
          return failureCommandResult(
            command.header.commandId,
            'UNKNOWN_COMMAND_TYPE',
            `No handler registered for command type '${command.header.commandType}'.`
          );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return failureCommandResult(
        command.header.commandId,
        'EXECUTION_EXCEPTION',
        `Command execution encountered unhandled error: ${message}`
      );
    }
  }
}
