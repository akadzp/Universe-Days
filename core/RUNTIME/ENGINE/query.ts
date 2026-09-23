/**
 * Phase 9: Query Model
 *
 * Defines structured read-only queries across the Universe state.
 * Enforces zero-mutation guarantees and returns deep-frozen snapshots.
 *
 * Determinism:
 * - Query execution metadata is derived from the explicit query.requestedAt input.
 * - The processor never reads wall-clock time.
 */

import { DomainID, SystemID, makeSystemID, makeDomainID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { UniverseRepository } from '../../UNIVERSE/CANON/repository.ts';
import { ObjectReferenceResolver } from '../../OBJECT/object-reference.ts';

export type QueryTargetType =
  | 'ENTITY'
  | 'STATE'
  | 'TEMPORAL'
  | 'RELATIONSHIP'
  | 'CONTINUITY'
  | 'UNRESOLVED'
  | 'STORY_REFERENCE'
  | 'SNAPSHOT'
  | 'OBJECT'
  | 'OBJECT_POSSESSION'
  | 'OBJECT_LOCATION'
  | 'OBJECT_OWNER'
  | 'OBJECT_USER'
  | 'OBJECT_WEARER'
  | 'OBJECT_RELATIONS'
  | 'OBJECT_REFERENCE_RESOLUTION';

export interface UniverseQuery<TFilter = Record<string, unknown>> {
  queryId: string;
  queryType: QueryTargetType;
  requestedBy: SystemID | string;
  universeId: string;
  targetDomain?: DomainID | string;
  targetEntityId?: string;
  filter?: TFilter;
  parameters?: Record<string, unknown>;
  requestedAt: number;
}

export interface QueryResult<TData = unknown> {
  queryId: string;
  queryType: QueryTargetType;
  universeId: string;
  data: TData;
  executedAt: number;
  readOnly: true;
}

export class QueryProcessor {
  constructor(private repository: UniverseRepository) {}

  public execute<TData = unknown>(query: UniverseQuery): Result<QueryResult<TData>> {
    if (!query.queryId || !query.universeId) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        'Query validation failed: queryId and universeId are required.'
      );
    }

    const universeRes = this.repository.getUniverse(query.universeId);
    if (!universeRes.success || !universeRes.data) {
      return failure(
        EngineErrorCode.UNIVERSE_VALIDATION_FAILED,
        `Universe with ID "${query.universeId}" not found in repository.`
      );
    }

    const universe: UniverseModel = universeRes.data;
    let data: unknown = null;

    switch (query.queryType) {
      case 'SNAPSHOT':
        data = universe;
        break;

      case 'ENTITY': {
        const domain = query.targetDomain ? String(query.targetDomain).toUpperCase() : '';
        const id = query.targetEntityId;
        if (!id) {
          return failure(
            EngineErrorCode.INVALID_DOMAIN_REQUEST,
            'Query targetEntityId is required for ENTITY query.'
          );
        }

        if (domain === 'CHARACTER') data = universe.characters[id];
        else if (domain === 'RELATIONSHIP') data = universe.relationships[id];
        else if (domain === 'OBJECT') data = universe.objects[id];
        else if (domain === 'KNOWLEDGE') data = universe.knowledge[id];
        else if (domain === 'STATE') data = universe.states[id];
        else if (domain === 'LOCATION') data = universe.locations[id];
        else if (domain === 'DAILY_UNIVERSE' || domain === 'PROCESS') data = universe.processes[id];
        else if (domain === 'UNRESOLVED') data = universe.unresolvedConditions[id];
        else if (domain === 'ENGINE' || domain === 'EVENT') data = universe.events[id];
        else {
          data =
            universe.characters[id] ??
            universe.relationships[id] ??
            universe.objects[id] ??
            universe.knowledge[id] ??
            universe.states[id] ??
            universe.locations[id] ??
            universe.events[id] ??
            universe.processes[id] ??
            universe.unresolvedConditions[id];
        }
        break;
      }

      case 'STATE':
        data = query.targetEntityId ? universe.states[query.targetEntityId] : universe.states;
        break;

      case 'TEMPORAL':
        data = universe.temporalContext;
        break;

      case 'RELATIONSHIP':
        data = query.targetEntityId
          ? universe.relationships[query.targetEntityId]
          : universe.relationships;
        break;

      case 'CONTINUITY':
        data = universe.continuityContext;
        break;

      case 'UNRESOLVED':
        data = query.targetEntityId
          ? universe.unresolvedConditions[query.targetEntityId]
          : universe.unresolvedConditions;
        break;

      case 'STORY_REFERENCE':
        data = universe.continuityContext.activeChainRefs;
        break;

      case 'OBJECT': {
        const op = query.parameters?.operation;
        const targetObj = query.targetEntityId ? universe.objects[query.targetEntityId] : null;

        if (op === 'GET_POSSESSION_REF') {
          data = targetObj ? targetObj.possessionRef : null;
        } else if (op === 'GET_LOCATION_REF') {
          data = targetObj ? targetObj.locationRef : null;
        } else if (op === 'GET_OWNER') {
          data = targetObj ? targetObj.ownershipRef : null;
        } else if (op === 'GET_USER') {
          data = targetObj ? targetObj.currentUserRef : null;
        } else if (op === 'GET_WEARER') {
          data = targetObj ? targetObj.currentWearerRef : null;
        } else if (op === 'GET_OBJECT_RELATIONS') {
          const rootRels = Object.values(universe.objectRelations ?? {}).filter(
            r => r.subjectRef === query.targetEntityId || r.targetRef === query.targetEntityId
          );
          const attachedRels = targetObj?.relations ?? [];
          data = [...attachedRels, ...rootRels];
        } else if (op === 'RESOLVE_OBJECT_REFERENCE') {
          data = ObjectReferenceResolver.resolve({
            ...(query.parameters as any),
            knownObjects: universe.objects
          });
        } else {
          // Default GET_OBJECT
          data = query.targetEntityId ? universe.objects[query.targetEntityId] : universe.objects;
        }
        break;
      }

      case 'OBJECT_POSSESSION':
        data = query.targetEntityId ? (universe.objects[query.targetEntityId]?.possessionRef ?? null) : null;
        break;

      case 'OBJECT_LOCATION':
        data = query.targetEntityId ? (universe.objects[query.targetEntityId]?.locationRef ?? null) : null;
        break;

      case 'OBJECT_OWNER':
        data = query.targetEntityId ? (universe.objects[query.targetEntityId]?.ownershipRef ?? null) : null;
        break;

      case 'OBJECT_USER':
        data = query.targetEntityId ? (universe.objects[query.targetEntityId]?.currentUserRef ?? null) : null;
        break;

      case 'OBJECT_WEARER':
        data = query.targetEntityId ? (universe.objects[query.targetEntityId]?.currentWearerRef ?? null) : null;
        break;

      case 'OBJECT_RELATIONS': {
        const id = query.targetEntityId;
        const rootRels = Object.values(universe.objectRelations ?? {}).filter(
          r => !id || r.subjectRef === id || r.targetRef === id
        );
        const attachedRels = id ? (universe.objects[id]?.relations ?? []) : [];
        data = [...attachedRels, ...rootRels];
        break;
      }

      case 'OBJECT_REFERENCE_RESOLUTION':
        data = ObjectReferenceResolver.resolve({
          ...(query.parameters as any),
          knownObjects: universe.objects
        });
        break;

      default:
        return failure(
          EngineErrorCode.UNSUPPORTED_DOMAIN_OPERATION,
          `Unsupported query type "${query.queryType}".`
        );
    }

    const result: QueryResult<TData> = {
      queryId: query.queryId,
      queryType: query.queryType,
      universeId: query.universeId,
      data: Object.freeze(data as TData),
      executedAt: query.requestedAt,
      readOnly: true
    };

    return success(Object.freeze(result));
  }
}
