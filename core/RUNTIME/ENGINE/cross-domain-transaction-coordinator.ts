/**
 * Cross-domain transaction coordinator.
 *
 * The coordinator owns no domain state. It only composes already-authorized
 * domain-owner mutations into one atomic Universe snapshot transaction.
 */
import { Result, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { SystemID } from '../../SHARED/identifiers.ts';
import { ExecutionContext } from './context.ts';
import { TransactionBoundary, PendingDomainMutation } from './transaction.ts';
import { getOwner } from '../GOVERNANCE/ownership.ts';
import { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';

export interface CrossDomainMutation<TEntity = unknown> extends PendingDomainMutation<TEntity> {}

export class CrossDomainTransactionCoordinator {
  public static commit(
    ctx: ExecutionContext,
    tx: TransactionBoundary,
    mutations: readonly CrossDomainMutation[]
  ): Result<UniverseModel> {
    const owners = new Set<SystemID>();

    if (mutations.length === 0) {
      return failure(EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED, 'Cross-domain transaction requires at least one domain mutation.');
    }

    try {
      for (const mutation of mutations) {
        const owner = getOwner(String(mutation.domain).toUpperCase() === 'OBJECT_RELATION' ? 'OBJECT' : mutation.domain);
        if (!owner || owner.ownerId !== mutation.authoritativeOwner) {
          tx.abort(ctx, `Cross-domain authorization rejected for '${mutation.domain}'.`);
          return failure(
            EngineErrorCode.CROSS_DOMAIN_AUTHORITY_VIOLATION,
            `Cross-domain mutation for '${mutation.domain}' does not carry the registered domain owner.`
          );
        }
        owners.add(owner.ownerId);
        tx.stageMutation(mutation);
      }

      const prepared = tx.prepare(ctx, owners);
      if (!prepared.success) {
        tx.abort(ctx, prepared.message);
        return failure((prepared.error as EngineErrorCode) ?? EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED, prepared.message);
      }

      return tx.postValidateAndCommit(ctx);
    } catch (error) {
      tx.abort(ctx, error instanceof Error ? error.message : String(error));
      return failure(EngineErrorCode.TRANSACTION_COMMIT_FAILED, error instanceof Error ? error.message : String(error));
    }
  }
}
