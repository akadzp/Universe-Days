/**
 * Application Boundary: Authorization Policy & Guard.
 */

import { ActorContext } from '../contracts/actor-context.ts';
import { ApplicationCommand } from '../contracts/command.ts';
import { ApplicationQuery } from '../contracts/query.ts';

export interface AuthorizationDecision {
  readonly authorized: boolean;
  readonly reason?: string;
}

export class ApplicationAuthorizer {
  /**
   * Evaluates if the actor is authorized to execute a given command.
   */
  public static authorizeCommand(command: ApplicationCommand): AuthorizationDecision {
    const { actor, commandType } = command.header;
    if (!actor || !actor.actorId) {
      return { authorized: false, reason: 'Anonymous actor context is not permitted.' };
    }

    // Role-based top-level wildcard
    if (actor.permissions.includes('*') || actor.role === 'SYSTEM') {
      return { authorized: true };
    }

    const requiredPermission = getRequiredPermissionForCommand(commandType);
    if (!requiredPermission) {
      return { authorized: false, reason: `Unknown command type '${commandType}'.` };
    }

    const hasPermission = actor.permissions.includes(requiredPermission) || actor.permissions.includes(requiredPermission.split(':')[0] + ':*');
    if (!hasPermission) {
      return {
        authorized: false,
        reason: `Actor '${actor.actorId}' with role '${actor.role}' lacks permission '${requiredPermission}' for command '${commandType}'.`
      };
    }

    // AI Agents cannot perform direct authoritative mutations
    if (actor.role === 'AI_AGENT' && isAuthoritativeMutationCommand(commandType)) {
      return {
        authorized: false,
        reason: `AI Agents cannot directly commit authoritative domain mutations.`
      };
    }

    return { authorized: true };
  }

  /**
   * Evaluates if the actor is authorized to execute a given query.
   */
  public static authorizeQuery(query: ApplicationQuery): AuthorizationDecision {
    const { actor, queryType } = query.header;
    if (!actor || !actor.actorId) {
      return { authorized: false, reason: 'Anonymous actor context is not permitted.' };
    }

    if (actor.permissions.includes('*') || actor.role === 'SYSTEM') {
      return { authorized: true };
    }

    const requiredPermission = getRequiredPermissionForQuery(queryType);
    if (!requiredPermission) {
      return { authorized: false, reason: `Unknown query type '${queryType}'.` };
    }

    const hasPermission = actor.permissions.includes(requiredPermission) || actor.permissions.includes(requiredPermission.split(':')[0] + ':*');
    if (!hasPermission) {
      return {
        authorized: false,
        reason: `Actor '${actor.actorId}' lacks permission '${requiredPermission}' for query '${queryType}'.`
      };
    }

    return { authorized: true };
  }
}

function getRequiredPermissionForCommand(commandType: string): string | null {
  switch (commandType) {
    case 'CREATE_CHARACTER':
      return 'character:create';
    case 'APPLY_CHARACTER_INDICATOR_EFFECT':
    case 'BIND_CHARACTER_KNOWLEDGE':
    case 'BIND_CHARACTER_RELATIONSHIP':
      return 'character:mutate';
    case 'PROPOSE_CHARACTER_ACTION':
      return 'character:propose_action';
    case 'PROPOSE_CHARACTER_RESPONSE':
      return 'character:propose_response';
    case 'ADVANCE_DAILY_CYCLE':
      return 'daily:advance';
    case 'FINALIZE_DAILY_CYCLE':
      return 'daily:finalize';
    case 'INITIALIZE_UNIVERSE':
    case 'MOUNT_UNIVERSE':
      return 'universe:admin';
    default:
      return null;
  }
}

function getRequiredPermissionForQuery(queryType: string): string | null {
  switch (queryType) {
    case 'GET_UNIVERSE_STATUS':
      return 'universe:read';
    case 'GET_CHARACTER_SUMMARY':
    case 'LIST_CHARACTERS':
      return 'character:read';
    case 'GET_DAILY_CYCLE_STATUS':
      return 'daily:read';
    case 'GET_STORY_SUMMARY':
      return 'story:read';
    default:
      return null;
  }
}

function isAuthoritativeMutationCommand(commandType: string): boolean {
  return [
    'CREATE_CHARACTER',
    'APPLY_CHARACTER_INDICATOR_EFFECT',
    'BIND_CHARACTER_KNOWLEDGE',
    'ADVANCE_DAILY_CYCLE',
    'FINALIZE_DAILY_CYCLE',
    'INITIALIZE_UNIVERSE'
  ].includes(commandType);
}
