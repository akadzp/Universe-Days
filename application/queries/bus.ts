/**
 * Application Query Bus / Dispatcher.
 */

import { ApplicationQuery, QueryResult, failureQueryResult } from '../contracts/query.ts';
import { ApplicationAuthorizer } from '../authorization/policy.ts';
import { UniverseInstanceManager } from '../../core/INFRA/INSTANCE/instance.ts';
import { GetUniverseStatusQueryHandler } from './handlers/get-universe-status.handler.ts';
import { GetCharacterSummaryQueryHandler } from './handlers/get-character-summary.handler.ts';
import { ListCharactersQueryHandler } from './handlers/list-characters.handler.ts';
import { GetDailyCycleStatusQueryHandler } from './handlers/get-daily-cycle-status.handler.ts';

export class ApplicationQueryBus {
  private readonly getUniverseStatusHandler: GetUniverseStatusQueryHandler;
  private readonly getCharacterSummaryHandler: GetCharacterSummaryQueryHandler;
  private readonly listCharactersHandler: ListCharactersQueryHandler;
  private readonly getDailyCycleStatusHandler: GetDailyCycleStatusQueryHandler;

  public constructor(private readonly instanceManager: UniverseInstanceManager) {
    this.getUniverseStatusHandler = new GetUniverseStatusQueryHandler(instanceManager);
    this.getCharacterSummaryHandler = new GetCharacterSummaryQueryHandler(instanceManager);
    this.listCharactersHandler = new ListCharactersQueryHandler(instanceManager);
    this.getDailyCycleStatusHandler = new GetDailyCycleStatusQueryHandler(instanceManager);
  }

  public async dispatch<TParams, TResult>(query: ApplicationQuery<TParams>): Promise<QueryResult<TResult>> {
    // 1. Authorization Guard
    const auth = ApplicationAuthorizer.authorizeQuery(query as ApplicationQuery);
    if (!auth.authorized) {
      return failureQueryResult(
        query.header.queryId,
        'UNAUTHORIZED',
        auth.reason ?? 'Actor is not authorized to execute this query.'
      );
    }

    // 2. Query Routing & Execution
    try {
      switch (query.header.queryType) {
        case 'GET_UNIVERSE_STATUS':
          return this.getUniverseStatusHandler.handle(query as any) as unknown as QueryResult<TResult>;
        case 'GET_CHARACTER_SUMMARY':
          return this.getCharacterSummaryHandler.handle(query as any) as unknown as QueryResult<TResult>;
        case 'LIST_CHARACTERS':
          return this.listCharactersHandler.handle(query as any) as unknown as QueryResult<TResult>;
        case 'GET_DAILY_CYCLE_STATUS':
          return this.getDailyCycleStatusHandler.handle(query as any) as unknown as QueryResult<TResult>;
        default:
          return failureQueryResult(
            query.header.queryId,
            'UNKNOWN_QUERY_TYPE',
            `No handler registered for query type '${query.header.queryType}'.`
          );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return failureQueryResult(
        query.header.queryId,
        'EXECUTION_EXCEPTION',
        `Query execution encountered unhandled error: ${message}`
      );
    }
  }
}
