/**
 * Application Query Handler: Get Character Summary
 */

import { ApplicationQuery, QueryResult, successQueryResult, failureQueryResult } from '../../contracts/query.ts';
import { CharacterSummaryDTO, CharacterIndicatorDTO } from '../../contracts/projections.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';

export interface GetCharacterSummaryParams {
  readonly characterId: string;
}

export class GetCharacterSummaryQueryHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(query: ApplicationQuery<GetCharacterSummaryParams>): QueryResult<CharacterSummaryDTO> {
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return failureQueryResult(query.header.queryId, 'UNIVERSE_NOT_MOUNTED', 'No Universe instance is currently mounted.');
    }

    const character = mounted.universe.characters[query.params.characterId];
    if (!character) {
      return failureQueryResult(query.header.queryId, 'CHARACTER_NOT_FOUND', `Character '${query.params.characterId}' not found.`);
    }

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

    const dto: CharacterSummaryDTO = Object.freeze({
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

    return successQueryResult(query.header.queryId, dto);
  }
}
