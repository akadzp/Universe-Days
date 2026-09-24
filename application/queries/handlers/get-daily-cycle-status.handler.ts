/**
 * Application Query Handler: Get Daily Cycle Status
 */

import { ApplicationQuery, QueryResult, successQueryResult, failureQueryResult } from '../../contracts/query.ts';
import { DailyPeriodDTO, DailyEventDTO } from '../../contracts/projections.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';

export interface GetDailyCycleStatusParams {
  readonly periodId?: string;
}

export class GetDailyCycleStatusQueryHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(query: ApplicationQuery<GetDailyCycleStatusParams>): QueryResult<DailyPeriodDTO> {
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return failureQueryResult(query.header.queryId, 'UNIVERSE_NOT_MOUNTED', 'No Universe instance is currently mounted.');
    }

    const universe = mounted.universe;
    const periodId = query.params?.periodId ?? universe.temporalContext.currentPeriodRef;
    const period = periodId ? universe.periods[periodId] : Object.values(universe.periods || {})[0];

    if (!period) {
      return failureQueryResult(query.header.queryId, 'PERIOD_NOT_FOUND', 'No period record found in current universe.');
    }

    const events: DailyEventDTO[] = Object.values(universe.events || {})
      .filter(e => !period.startTime || e.temporalInterval.start.startsWith(universe.temporalContext.currentUniverseDate))
      .map(e => Object.freeze({
        id: e.eventId,
        title: e.title,
        type: e.eventType,
        status: e.status,
        participantIds: Object.freeze(e.participantRefs.map(p => String(p))),
        startTime: e.temporalInterval.start
      }));

    const openUnresolvedCount = Object.values(universe.unresolvedConditions || {}).filter(
      u => u.currentStatus !== 'RESOLVED' && u.currentStatus !== 'ABANDONED'
    ).length;

    const activeProcessCount = Object.values(universe.processes || {}).filter(
      p => p.currentStatus === 'ACTIVE'
    ).length;

    const dto: DailyPeriodDTO = Object.freeze({
      periodId: period.periodId,
      universeDate: universe.temporalContext.currentUniverseDate,
      status: period.status,
      openUnresolvedCount,
      activeProcessCount,
      events: Object.freeze(events)
    });

    return successQueryResult(query.header.queryId, dto);
  }
}
