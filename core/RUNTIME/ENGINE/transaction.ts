/**
 * Canonical Transaction Boundary.
 *
 * A transaction is the final mutation gate between validated domain-owner
 * proposals and authoritative persistence. The command actor is never
 * treated as the persistence actor.
 */

import { DomainID, SystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure, blocked } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { UniverseRepository } from '../../UNIVERSE/CANON/repository.ts';
import { UniverseModel, UniverseModelFactory } from '../../UNIVERSE/CANON/universe.ts';
import { UniverseModelValidator } from '../../VALIDATION/universe-model.ts';
import { ExecutionContext } from './context.ts';
import { getOwner, isKnownDomain } from '../GOVERNANCE/ownership.ts';
import { TimePoint } from '../TEMPORAL/time-point.ts';
import { INSTANCE_MANAGEMENT_ACTOR } from '../../INFRA/INSTANCE/instance.ts';

export interface PendingDomainMutation<TEntity = unknown> {
  domain: DomainID;
  entityId: string;
  entityData: TEntity;
  /** Must match the registered owner AND the execution actor. */
  authoritativeOwner: SystemID;
}

function normalizedMutationDomain(domain: DomainID | string): string {
  const raw = String(domain).toUpperCase();
  if (raw === 'OBJECT_RELATION') return 'OBJECT';
  return raw;
}


export class TransactionBoundary {
  private pendingMutations: PendingDomainMutation[] = [];
  private isPrepared = false;
  private isCommitted = false;
  private isAborted = false;

  constructor(
    private readonly repository: UniverseRepository,
    private readonly executionId: string
  ) {}

  public stageMutation<TEntity = unknown>(mutation: PendingDomainMutation<TEntity>): void {
    if (this.isCommitted || this.isAborted) {
      throw new Error(`Transaction ${this.executionId} is already closed.`);
    }

    const domain = normalizedMutationDomain(mutation.domain);
    const owner = getOwner(domain);
    if (!isKnownDomain(domain) || !owner) {
      throw new Error(`Transaction ${this.executionId} rejected mutation for unknown domain '${domain}'.`);
    }
    if (mutation.authoritativeOwner !== owner.ownerId) {
      throw new Error(`Transaction ${this.executionId} rejected mutation for domain '${domain}': declared owner '${mutation.authoritativeOwner}' is not the registered owner '${owner.ownerId}'.`);
    }

    // The staged envelope records semantic authority. The transaction later
    // binds that claim to the actual execution actor in prepare().
    this.pendingMutations.push(Object.freeze({ ...mutation, domain: domain as DomainID }));
  }

  public prepare(ctx: ExecutionContext, authorizedOwners: ReadonlySet<SystemID> = new Set([ctx.actor])): Result<boolean> {
    if (ctx.hasCriticalConflicts()) {
      return blocked(EngineErrorCode.EXECUTION_CONFLICT, 'Cannot prepare transaction: critical unresolved conflicts present.');
    }
    if (ctx.hasValidationFailures()) {
      return failure(EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED, 'Cannot prepare transaction: context has unresolved validation failures.');
    }

    const base = ctx.universeSnapshot;
    const parsed = TimePoint.parse(ctx.temporalContext.universeTime);
    if (!parsed.success || !parsed.data || parsed.data.isUnknown || !parsed.data.date) {
      return failure(EngineErrorCode.INVALID_TIME_POINT, 'Transaction requires an explicit, valid Universe Time.');
    }

    if (ctx.temporalContext.universeTime !== base.temporalContext.currentUniverseTime) {
      const temporalOwner = getOwner('TEMPORAL');
      if (!temporalOwner || temporalOwner.ownerId !== ctx.actor) {
        return blocked(
          EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
          `Temporal mutation rejected: actor '${ctx.actor}' is not TEMPORAL_SYSTEM.`
        );
      }
    }

    for (const mutation of this.pendingMutations) {
      const domain = normalizedMutationDomain(mutation.domain);
      const owner = getOwner(domain);
      if (!owner) {
        return failure(EngineErrorCode.DOMAIN_OWNER_NOT_FOUND, `No registered owner exists for '${domain}'.`);
      }
      if (mutation.authoritativeOwner !== owner.ownerId) {
        return failure(EngineErrorCode.CROSS_DOMAIN_AUTHORITY_VIOLATION, `Mutation '${mutation.entityId}' declares forged authority for '${domain}'.`);
      }
      if (!authorizedOwners.has(owner.ownerId)) {
        return blocked(
          EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
          `Transaction is not authorized for '${domain}' mutation. Required owner: '${owner.ownerId}'.`
        );
      }

      if (domain === 'ENGINE' || domain === 'DAILY_UNIVERSE') {
        return failure(
          EngineErrorCode.CANON_MUTATION_PROHIBITED,
          `Domain '${domain}' is an orchestrator boundary and may not directly replace Canon entity state.`
        );
      }
    }

    this.isPrepared = true;
    return success(true);
  }

  public postValidateAndCommit(ctx: ExecutionContext): Result<UniverseModel> {
    if (!this.isPrepared) {
      return failure(EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED, 'Cannot commit unprepared transaction.');
    }
    if (this.isCommitted || this.isAborted) {
      return failure(EngineErrorCode.TRANSACTION_COMMIT_FAILED, 'Transaction already concluded.');
    }

    const baseUniverse = ctx.universeSnapshot;

    // Owner authorization is established during prepare(); post-validation never
    // rebinds semantic ownership to the orchestration actor.

    for (const mutation of this.pendingMutations) {
      const domain = normalizedMutationDomain(mutation.domain);
      const owner = getOwner(domain);
      if (!owner || mutation.authoritativeOwner !== owner.ownerId) {
        this.abort(ctx, `Commit authority mismatch for domain '${domain}'.`);
        return failure(
          EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
          `Transaction commit rejected: actor '${ctx.actor}' is not the authoritative owner of '${domain}'.`
        );
      }
    }

    const workingCharacters = { ...baseUniverse.characters };
    const workingRelationships = { ...baseUniverse.relationships };
    const workingObjects = { ...baseUniverse.objects };
    const workingObjectRelations = { ...(baseUniverse.objectRelations ?? {}) };
    const workingKnowledge = { ...baseUniverse.knowledge };
    const workingStates = { ...baseUniverse.states };
    const workingLocations = { ...baseUniverse.locations };
    const workingBehaviors = { ...baseUniverse.behaviors };
    const workingStyles = { ...baseUniverse.styles };
    const workingEvents = { ...baseUniverse.events };
    const workingProcesses = { ...baseUniverse.processes };
    const workingUnresolved = { ...baseUniverse.unresolvedConditions };
    const workingPeriods = { ...(baseUniverse.periods ?? {}) };

    const changedFields = new Set<string>();

    for (const mutation of this.pendingMutations) {
      const domain = normalizedMutationDomain(mutation.domain);
      const id = mutation.entityId;
      ctx.changedEntityRefs.add(id);
      changedFields.add(`${domain}.${id}`);

      switch (domain) {
        case 'CHARACTER': workingCharacters[id] = mutation.entityData as any; break;
        case 'RELATIONSHIP': workingRelationships[id] = mutation.entityData as any; break;
        case 'OBJECT':
          if (String(mutation.domain).toUpperCase() === 'OBJECT_RELATION') workingObjectRelations[id] = mutation.entityData as any;
          else workingObjects[id] = mutation.entityData as any;
          break;
        case 'KNOWLEDGE': workingKnowledge[id] = mutation.entityData as any; break;
        case 'STATE': workingStates[id] = mutation.entityData as any; break;
        case 'LOCATION': workingLocations[id] = mutation.entityData as any; break;
        case 'EVENT': workingEvents[id] = mutation.entityData as any; break;
        case 'PROCESS': workingProcesses[id] = mutation.entityData as any; break;
        case 'UNRESOLVED': workingUnresolved[id] = mutation.entityData as any; break;
        default:
          return failure(EngineErrorCode.CANON_MUTATION_PROHIBITED, `Unsupported Canon mutation domain '${domain}'.`);
      }
    }

    const effectiveTime = ctx.temporalContext.universeTime;
    const parsedTime = TimePoint.parse(effectiveTime);
    if (!parsedTime.success || !parsedTime.data || parsedTime.data.isUnknown || !parsedTime.data.date) {
      this.abort(ctx, 'Transaction effective Universe Time is invalid.');
      return failure(EngineErrorCode.INVALID_TIME_POINT, 'Transaction effective Universe Time is invalid.');
    }

    const baseTimeChanged = effectiveTime !== baseUniverse.temporalContext.currentUniverseTime;
    const nextDate = baseTimeChanged
      ? parsedTime.data.date.toCanonical()
      : baseUniverse.temporalContext.currentUniverseDate;

    const evolved = UniverseModelFactory.evolve(baseUniverse, {
      universeDate: nextDate,
      universeTime: effectiveTime,
      periodRef: ctx.temporalContext.periodRef ?? baseUniverse.temporalContext.currentPeriodRef,
      characters: workingCharacters,
      relationships: workingRelationships,
      objects: workingObjects,
      objectRelations: workingObjectRelations,
      knowledge: workingKnowledge,
      states: workingStates,
      locations: workingLocations,
      behaviors: workingBehaviors,
      styles: workingStyles,
      events: workingEvents,
      processes: workingProcesses,
      unresolvedConditions: workingUnresolved,
      periods: workingPeriods,
      continuityContext: baseUniverse.continuityContext,
      sourceSystem: ctx.actor,
      effectiveTime,
      changedFields: Array.from(changedFields),
      reason: `Canonical transaction ${this.executionId}`,
      sourceRequestId: ctx.command.commandId
    }) as UniverseModel;

    const validationReport = UniverseModelValidator.validate(evolved);
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

    // Persistence is an infrastructure responsibility, never the semantic actor.
    const saveRes = this.repository.saveUniverse(evolved, INSTANCE_MANAGEMENT_ACTOR);
    if (!saveRes.success) {
      this.abort(ctx, `Repository commit failed: ${saveRes.message}`);
      return failure(EngineErrorCode.TRANSACTION_COMMIT_FAILED, saveRes.message || 'Failed to persist validated Universe snapshot.');
    }

    this.isCommitted = true;
    ctx.tracer.record({
      stepId: 'TRANSACTION_COMMIT',
      action: 'COMMIT_UNIVERSE_SNAPSHOT',
      owner: INSTANCE_MANAGEMENT_ACTOR,
      resultStatus: 'COMMITTED',
      details: {
        semanticOwner: String(ctx.actor),
        authorizedOwners: Array.from(new Set(this.pendingMutations.map(m => String(m.authoritativeOwner)))),
        persistenceOwner: String(INSTANCE_MANAGEMENT_ACTOR),
        mutationCount: this.pendingMutations.length,
        changedEntities: Array.from(ctx.changedEntityRefs)
      }
    });

    return success(evolved);
  }

  public abort(ctx: ExecutionContext, reason: string): void {
    this.isAborted = true;
    this.pendingMutations = [];
    ctx.tracer.record({ stepId: 'TRANSACTION_ABORT', action: 'ROLLBACK_TRANSACTION', resultStatus: 'ABORTED', details: { reason } });
  }

  public getPendingCount(): number { return this.pendingMutations.length; }
  public isTransactionAborted(): boolean { return this.isAborted; }
  public getStatus(): 'PENDING' | 'PREPARED' | 'COMMITTED' | 'ABORTED' {
    if (this.isAborted) return 'ABORTED';
    if (this.isCommitted) return 'COMMITTED';
    if (this.isPrepared) return 'PREPARED';
    return 'PENDING';
  }
}
