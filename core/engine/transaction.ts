/**
 * Phase 9: Transaction Boundary & Atomic Commit Abstraction
 *
 * Enforces strict boundary between READ and MUTATION phases.
 * Sequence: PREPARE -> PRE-VALIDATE -> APPLY -> POST-VALIDATE -> CONTINUITY UPDATE -> COMMIT / ROLLBACK.
 * Guarantees no partial silent commits on failure.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../types/identifiers.ts';
import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { UniverseRepository } from '../universe/model/repository.ts';
import { UniverseModel, UniverseModelFactory } from '../universe/model/universe.ts';
import { UniverseModelValidator } from '../universe/model/validation.ts';
import { ExecutionContext } from './context.ts';

export interface PendingDomainMutation<TEntity = unknown> {
  domain: DomainID;
  entityId: string;
  entityData: TEntity;
  authoritativeOwner: SystemID;
}

export class TransactionBoundary {
  private pendingMutations: PendingDomainMutation[] = [];
  private isPrepared = false;
  private isCommitted = false;
  private isAborted = false;

  constructor(
    private repository: UniverseRepository,
    private readonly executionId: string
  ) {}

  /**
   * Stages a domain mutation for atomic commit.
   */
  public stageMutation<TEntity = unknown>(mutation: PendingDomainMutation<TEntity>): void {
    if (this.isCommitted || this.isAborted) {
      throw new Error(`Transaction ${this.executionId} is already closed.`);
    }
    this.pendingMutations.push(mutation);
  }

  /**
   * Prepares and validates the transaction before applying changes.
   */
  public prepare(ctx: ExecutionContext): Result<boolean> {
    if (ctx.hasCriticalConflicts()) {
      return blocked(
        EngineErrorCode.EXECUTION_CONFLICT,
        'Cannot prepare transaction: critical unresolved conflicts present.'
      );
    }

    if (ctx.hasValidationFailures()) {
      return failure(
        EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED,
        'Cannot prepare transaction: context has unresolved validation failures.'
      );
    }

    this.isPrepared = true;
    return success(true);
  }

  /**
   * Applies all staged mutations to a working copy of the Universe model and validates invariants.
   */
  public postValidateAndCommit(ctx: ExecutionContext): Result<UniverseModel> {
    if (!this.isPrepared) {
      return failure(
        EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED,
        'Cannot commit unprepared transaction.'
      );
    }

    if (this.isCommitted || this.isAborted) {
      return failure(
        EngineErrorCode.TRANSACTION_COMMIT_FAILED,
        'Transaction already concluded.'
      );
    }

    const baseUniverse = ctx.universeSnapshot;

    // Build mutated working copy
    const workingCharacters = { ...baseUniverse.characters };
    const workingRelationships = { ...baseUniverse.relationships };
    const workingObjects = { ...baseUniverse.objects };
    const workingKnowledge = { ...baseUniverse.knowledge };
    const workingStates = { ...baseUniverse.states };
    const workingLocations = { ...baseUniverse.locations };
    const workingEvents = { ...baseUniverse.events };
    const workingProcesses = { ...baseUniverse.processes };
    const workingUnresolved = { ...baseUniverse.unresolvedConditions };

    for (const m of this.pendingMutations) {
      const domainStr = String(m.domain).toUpperCase();
      const id = m.entityId;
      ctx.changedEntityRefs.add(id);

      if (domainStr === 'CHARACTER') workingCharacters[id] = m.entityData as any;
      else if (domainStr === 'RELATIONSHIP') workingRelationships[id] = m.entityData as any;
      else if (domainStr === 'OBJECT') workingObjects[id] = m.entityData as any;
      else if (domainStr === 'KNOWLEDGE') workingKnowledge[id] = m.entityData as any;
      else if (domainStr === 'STATE') workingStates[id] = m.entityData as any;
      else if (domainStr === 'LOCATION') workingLocations[id] = m.entityData as any;
      else if (domainStr === 'ENGINE' || domainStr === 'EVENT') workingEvents[id] = m.entityData as any;
      else if (domainStr === 'DAILY_UNIVERSE' || domainStr === 'PROCESS') workingProcesses[id] = m.entityData as any;
      else if (domainStr === 'UNRESOLVED') workingUnresolved[id] = m.entityData as any;
    }

    const universeTime = ctx.temporalContext.universeTime || baseUniverse.temporalContext.currentUniverseTime;
    const universeDate = (ctx.temporalContext as any).universeDate || baseUniverse.temporalContext.currentUniverseDate || (universeTime ? universeTime.split('T')[0] : '2024-01-01');

    const proposedUniverse = UniverseModelFactory.create({
      universeId: baseUniverse.universeId,
      universeDate,
      universeTime,
      periodRef: ctx.temporalContext.periodRef ?? baseUniverse.temporalContext.currentPeriodRef,
      characters: workingCharacters,
      relationships: workingRelationships,
      objects: workingObjects,
      knowledge: workingKnowledge,
      states: workingStates,
      locations: workingLocations,
      events: workingEvents,
      processes: workingProcesses,
      unresolvedConditions: workingUnresolved,
      continuityContext: baseUniverse.continuityContext
    });

    // Run Post-Validation invariant check
    const validationReport = UniverseModelValidator.validate(proposedUniverse);
    const issueMessages = validationReport.issues.map(i => `[${i.code}] ${i.message}`);
    ctx.recordValidation('UniverseModelValidator', validationReport.isValid, issueMessages);

    if (!validationReport.isValid) {
      const errSummary = issueMessages.join('; ');
      this.abort(ctx, `Post-validation failed: ${errSummary}`);
      return failure(
        EngineErrorCode.TRANSACTION_POST_VALIDATION_FAILED,
        `Post-validation failed with ${validationReport.issues.length} error(s): ${errSummary}. Transaction aborted.`
      );
    }

    // Persist via repository
    const saveRes = this.repository.saveUniverse(proposedUniverse, ctx.actor);
    if (!saveRes.success) {
      this.abort(ctx, `Repository commit failed: ${saveRes.message}`);
      return failure(
        EngineErrorCode.TRANSACTION_COMMIT_FAILED,
        saveRes.message || 'Failed to persist validated universe snapshot to repository.'
      );
    }

    this.isCommitted = true;
    ctx.tracer.record({
      stepId: 'TRANSACTION_COMMIT',
      action: 'COMMIT_UNIVERSE_SNAPSHOT',
      owner: ctx.actor,
      resultStatus: 'COMMITTED',
      details: {
        mutationCount: this.pendingMutations.length,
        changedEntities: Array.from(ctx.changedEntityRefs)
      }
    });

    return success(proposedUniverse);
  }

  /**
   * Aborts and rolls back the transaction.
   */
  public abort(ctx: ExecutionContext, reason: string): void {
    this.isAborted = true;
    this.pendingMutations = [];
    ctx.tracer.record({
      stepId: 'TRANSACTION_ABORT',
      action: 'ROLLBACK_TRANSACTION',
      resultStatus: 'ABORTED',
      details: { reason }
    });
  }

  public getPendingCount(): number {
    return this.pendingMutations.length;
  }
}
