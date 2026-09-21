import { DomainID, SystemID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';
import { getOwner, isKnownDomain } from './ownership.ts';

export enum ArchitectureAction {
  READ = 'READ',
  REQUEST_CHANGE = 'REQUEST_CHANGE',
  APPLY_CHANGE = 'APPLY_CHANGE',
  VALIDATE = 'VALIDATE',
  ROUTE_CONFLICT = 'ROUTE_CONFLICT'
}

export interface AuthorityDecision {
  allowed: boolean;
  actor: SystemID | string;
  domain: DomainID | string;
  action: ArchitectureAction;
  ownerId?: SystemID;
  reason: string;
}

/**
 * Deterministically verifies if an actor has authority to perform an action on a domain.
 *
 * Rules:
 * 1. Domain must be a registered domain.
 * 2. READ: Authorized consumers may read domain states.
 * 3. REQUEST_CHANGE: Consumers may submit change requests (to be evaluated by owner).
 * 4. APPLY_CHANGE: ONLY the authoritative domain owner may apply mutations.
 * 5. VALIDATE / ROUTE_CONFLICT: Allowed for system components according to governance rules.
 */
export function canPerformAction(
  actor: SystemID | string,
  domain: DomainID | string,
  action: ArchitectureAction
): Result<AuthorityDecision> {
  if (!isKnownDomain(domain as string)) {
    return failure(
      `Unknown domain "${domain}". Cannot evaluate authority without registered ownership.`,
      `UNKNOWN_DOMAIN`
    );
  }

  const owner = getOwner(domain);
  if (!owner) {
    return failure(`No authoritative owner registered for domain "${domain}"`);
  }

  const isOwner = actor === owner.ownerId;

  switch (action) {
    case ArchitectureAction.READ:
      return success({
        allowed: true,
        actor,
        domain,
        action,
        ownerId: owner.ownerId,
        reason: 'Authorized consumer read allowed on domain state.'
      });

    case ArchitectureAction.REQUEST_CHANGE:
      return success({
        allowed: true,
        actor,
        domain,
        action,
        ownerId: owner.ownerId,
        reason: 'Consumer may issue a change request to the authoritative domain owner.'
      });

    case ArchitectureAction.APPLY_CHANGE:
      if (isOwner) {
        return success({
          allowed: true,
          actor,
          domain,
          action,
          ownerId: owner.ownerId,
          reason: `Authoritative domain owner (${owner.ownerId}) has exclusive right to apply mutations.`
        });
      }
      return failure(
        `Actor "${actor}" is NOT the authoritative owner of domain "${domain}". Only "${owner.ownerId}" may APPLY_CHANGE. Direct mutation rejected.`,
        'UNAUTHORIZED_MUTATION'
      );

    case ArchitectureAction.VALIDATE:
      return success({
        allowed: true,
        actor,
        domain,
        action,
        ownerId: owner.ownerId,
        reason: 'Validation check authorized across registered domains.'
      });

    case ArchitectureAction.ROUTE_CONFLICT:
      return success({
        allowed: true,
        actor,
        domain,
        action,
        ownerId: owner.ownerId,
        reason: 'Conflict routing permitted for inter-system arbitration.'
      });

    default:
      return failure(`Unrecognized action: ${action}`);
  }
}
