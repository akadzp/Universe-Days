/**
 * Phase 9: Query Model
 *
 * Defines structured read-only queries across the Universe state.
 * Enforces zero-mutation guarantees and returns deep-frozen snapshots.
 */

import { DomainID, SystemID, makeSystemID, makeDomainID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { UniverseModel } from '../universe/model/universe.ts';
import { UniverseRepository } from '../universe/model/repository.ts';

export type QueryTargetType =
  | 'ENTITY'
  | 'STATE'
  | 'TEMPORAL'
  | 'RELATIONSHIP'
  | 'CONTINUITY'
  | 'UNRESOLVED'
  | 'STORY_REFERENCE'
  | 'SNAPSHOT';

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
          // Search across all domain maps
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
        data = query.targetEntityId ? universe.relationships[query.targetEntityId] : universe.relationships;
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
      executedAt: Date.now(),
      readOnly: true
    };

    return success(Object.freeze(result));
  }
}
