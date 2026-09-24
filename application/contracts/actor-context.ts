/**
 * Application Boundary: Actor & Session Context Contracts.
 */

export type ActorRole = 
  | 'SYSTEM'
  | 'INSTANCE_MANAGER'
  | 'AUTHOR'
  | 'PLAYER'
  | 'AI_AGENT'
  | 'OBSERVER';

export interface ActorContext {
  readonly actorId: string;
  readonly role: ActorRole;
  readonly permissions: readonly string[];
  readonly sessionId?: string;
  readonly requestTimestamp: number;
}

export function createActorContext(params: {
  actorId: string;
  role: ActorRole;
  permissions?: string[];
  sessionId?: string;
  requestTimestamp?: number;
}): ActorContext {
  return Object.freeze({
    actorId: params.actorId,
    role: params.role,
    permissions: Object.freeze(params.permissions ? [...params.permissions] : getDefaultPermissions(params.role)),
    sessionId: params.sessionId,
    requestTimestamp: params.requestTimestamp ?? Date.now()
  });
}

function getDefaultPermissions(role: ActorRole): string[] {
  switch (role) {
    case 'SYSTEM':
    case 'INSTANCE_MANAGER':
      return ['*'];
    case 'AUTHOR':
      return [
        'universe:read',
        'character:read',
        'character:create',
        'character:mutate',
        'daily:read',
        'daily:advance',
        'daily:finalize',
        'story:read',
        'story:create'
      ];
    case 'PLAYER':
      return [
        'universe:read',
        'character:read',
        'character:propose_action',
        'daily:read',
        'story:read'
      ];
    case 'AI_AGENT':
      return [
        'universe:read',
        'character:read',
        'character:propose_response',
        'story:read'
      ];
    case 'OBSERVER':
    default:
      return [
        'universe:read',
        'character:read',
        'daily:read',
        'story:read'
      ];
  }
}
