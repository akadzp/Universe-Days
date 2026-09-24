/**
 * Application Query Handler: List Characters
 */

import { ApplicationQuery, QueryResult, successQueryResult } from '../../contracts/query.ts';
import { CharacterSummaryDTO, CharacterIndicatorDTO } from '../../contracts/projections.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';

export class ListCharactersQueryHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(query: ApplicationQuery): QueryResult<readonly CharacterSummaryDTO[]> {
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return successQueryResult(query.header.queryId, Object.freeze([]));
    }

    const characters = Object.values(mounted.universe.characters || {});
    const list: CharacterSummaryDTO[] = characters.map(character => {
      const conditionIndicators: Record<string, CharacterIndicatorDTO> = {};
      if (character.indicators?.condition) {
        for (const [k, v] of Object.entries(character.indicators.condition)) {
          if (v) {
            conditionIndicators[k] = Object.freeze({
              key: v.key,
              value: v.current,
              min: v.range?.min ?? 0,
              max: v.range?.max ?? 100,
              mutable: v.mutable ?? true
            });
          }
        }
      }

      return Object.freeze({
        id: character.identity.id,
        displayName: character.identity.displayName,
        status: character.identity.status,
        level: 'CORE',
        conditionIndicators: Object.freeze(conditionIndicators),
        knowledgeCount: character.knowledgeReferences?.length ?? 0,
        relationshipCount: character.relationshipReferences?.length ?? 0,
        roleCount: character.roleReferences?.length ?? 0,
        effectiveFrom: character.temporalValidity?.effectiveFrom ?? '2026-01-01'
      });
    });

    return successQueryResult(query.header.queryId, Object.freeze(list));
  }
}
