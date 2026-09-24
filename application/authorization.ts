import type {
  ApplicationCommand,
  ApplicationRole,
  ActorContext,
  ApplicationQueryContext,
  ApplicationQueryType,
} from './contracts.ts';

export type ApplicationPermission =
  | 'UNIVERSE_READ'
  | 'CHARACTER_READ'
  | 'CHARACTER_MUTATE'
  | 'CHARACTER_PROPOSE'
  | 'DAILY_READ'
  | 'STORY_READ';

const ROLE_PERMISSIONS: Readonly<Record<ApplicationRole, readonly ApplicationPermission[]>> = {
  SYSTEM: ['UNIVERSE_READ', 'CHARACTER_READ', 'CHARACTER_MUTATE', 'CHARACTER_PROPOSE', 'DAILY_READ', 'STORY_READ'],
  AUTHOR: ['UNIVERSE_READ', 'CHARACTER_READ', 'CHARACTER_MUTATE', 'CHARACTER_PROPOSE', 'DAILY_READ', 'STORY_READ'],
  PLAYER: ['UNIVERSE_READ', 'CHARACTER_READ', 'CHARACTER_PROPOSE', 'DAILY_READ', 'STORY_READ'],
  AI_AGENT: ['UNIVERSE_READ', 'CHARACTER_READ', 'CHARACTER_PROPOSE', 'STORY_READ'],
  OBSERVER: ['UNIVERSE_READ', 'CHARACTER_READ', 'DAILY_READ', 'STORY_READ'],
};

export class ApplicationAuthorizer {
  public has(actor: ActorContext, permission: ApplicationPermission): boolean {
    return ROLE_PERMISSIONS[actor.role].includes(permission);
  }

  public authorize<T>(command: ApplicationCommand<T>): void {
    const permission = this.requiredPermission(command.commandType);
    if (!this.has(command.actor, permission)) {
      throw new Error(`Application authorization rejected: role '${command.actor.role}' lacks '${permission}'.`);
    }
    if (actorMutation(command.commandType) && command.actor.role === 'AI_AGENT') {
      throw new Error('AI_AGENT may propose but may not execute authoritative Character mutation commands.');
    }
  }

  public authorizeQuery(query: ApplicationQueryContext, queryType: ApplicationQueryType): void {
    const permission = this.requiredQueryPermission(queryType);
    if (!this.has(query.actor, permission)) {
      throw new Error(
        `Application query authorization rejected: role '${query.actor.role}' lacks '${permission}'.`,
      );
    }
    if (!query.universeId) {
      throw new Error('Application query authorization rejected: universeId is required.');
    }
  }

  private requiredPermission(commandType: string): ApplicationPermission {
    switch (commandType) {
      case 'CREATE_CHARACTER':
      case 'APPLY_CHARACTER_INDICATOR_EFFECT':
        return 'CHARACTER_MUTATE';
      case 'PROPOSE_CHARACTER_RESPONSE':
        return 'CHARACTER_PROPOSE';
      default:
        throw new Error(`Unknown application command '${commandType}'.`);
    }
  }

  private requiredQueryPermission(queryType: ApplicationQueryType): ApplicationPermission {
    switch (queryType) {
      case 'GET_UNIVERSE_STATUS':
        return 'UNIVERSE_READ';
      case 'GET_CHARACTER_SUMMARY':
      case 'LIST_CHARACTERS':
        return 'CHARACTER_READ';
      case 'GET_DAILY_CYCLE_STATUS':
        return 'DAILY_READ';
      default:
        throw new Error(`Unknown application query '${queryType}'.`);
    }
  }
}

function actorMutation(commandType: string): boolean {
  return commandType === 'CREATE_CHARACTER' || commandType === 'APPLY_CHARACTER_INDICATOR_EFFECT';
}
