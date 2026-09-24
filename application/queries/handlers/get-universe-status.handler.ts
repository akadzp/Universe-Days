/**
 * Application Query Handler: Get Universe Status
 */

import { ApplicationQuery, QueryResult, successQueryResult } from '../../contracts/query.ts';
import { UniverseSummaryDTO } from '../../contracts/projections.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';

export class GetUniverseStatusQueryHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(query: ApplicationQuery): QueryResult<UniverseSummaryDTO> {
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      const status = this.instanceManager.status();
      return successQueryResult(query.header.queryId, {
        universeId: status.storedCurrent?.universeId ?? 'NONE',
        scope: status.storedCurrent?.universeScope ?? 'NONE',
        universeDate: 'N/A',
        characterCount: 0,
        eventCount: 0,
        unresolvedConditionCount: 0,
        activeProcessCount: 0,
        status: 'IDLE'
      });
    }

    const universe = mounted.universe;
    const characterCount = Object.keys(universe.characters || {}).length;
    const eventCount = Object.keys(universe.events || {}).length;
    const unresolvedConditionCount = Object.keys(universe.unresolvedConditions || {}).length;
    const activeProcessCount = Object.values(universe.processes || {}).filter(p => p.currentStatus === 'ACTIVE').length;

    const dto: UniverseSummaryDTO = Object.freeze({
      universeId: universe.universeId,
      scope: mounted.universeScope,
      universeDate: universe.temporalContext.currentUniverseDate,
      characterCount,
      eventCount,
      unresolvedConditionCount,
      activeProcessCount,
      status: mounted.universeScope === 'SANDBOX' ? 'SANDBOX' : 'ACTIVE'
    });

    return successQueryResult(query.header.queryId, dto);
  }
}
