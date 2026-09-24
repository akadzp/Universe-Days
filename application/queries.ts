import type { PocerExecutionEngine } from '../core/RUNTIME/ENGINE/orchestrator.ts';
import type { UniverseQuery } from '../core/RUNTIME/ENGINE/query.ts';
import type { UniverseModel } from '../core/UNIVERSE/CANON/universe.ts';
import type { CharacterEntity } from '../core/CHARACTER/character.ts';
import type { CharacterSummaryDTO, DailyCycleStatusDTO, UniverseSummaryDTO } from './contracts.ts';

export class ApplicationQueryService {
  public constructor(private readonly executionEngine: PocerExecutionEngine) {}

  public universeStatus(universeId: string, requestedBy: string, requestedAt = 0): UniverseSummaryDTO {
    const universe = this.snapshot(universeId, requestedBy, requestedAt);

    return Object.freeze({
      universeId: universe.universeId,
      universeDate: universe.temporalContext.currentUniverseDate,
      universeTime: universe.temporalContext.currentUniverseTime,
      periodRef: universe.temporalContext.currentPeriodRef,
      characterCount: Object.keys(universe.characters).length,
      eventCount: Object.keys(universe.events).length,
      unresolvedCount: Object.keys(universe.unresolvedConditions).length,
    });
  }

  public characterSummary(
    universeId: string,
    characterId: string,
    requestedBy: string,
    requestedAt = 0,
  ): CharacterSummaryDTO | null {
    const result = this.execute({
      queryId: `APP_CHARACTER_${characterId}`,
      queryType: 'ENTITY',
      targetDomain: 'CHARACTER',
      targetEntityId: characterId,
      universeId,
      requestedBy,
      requestedAt,
    });

    const character = result.data as CharacterEntity | undefined;
    return character ? this.toCharacterSummary(character) : null;
  }

  public listCharacters(
    universeId: string,
    requestedBy: string,
    requestedAt = 0,
  ): readonly CharacterSummaryDTO[] {
    const universe = this.snapshot(universeId, requestedBy, requestedAt);

    return Object.freeze(
      Object.values(universe.characters).map(character => this.toCharacterSummary(character)),
    );
  }

  public dailyCycleStatus(
    universeId: string,
    requestedBy: string,
    requestedAt = 0,
  ): DailyCycleStatusDTO {
    const temporalResult = this.execute({
      queryId: `APP_DAILY_${universeId}`,
      queryType: 'TEMPORAL',
      universeId,
      requestedBy,
      requestedAt,
    });

    const temporal = temporalResult.data as UniverseModel['temporalContext'];
    const snapshot = this.snapshot(universeId, requestedBy, requestedAt);

    return Object.freeze({
      universeDate: temporal.currentUniverseDate,
      universeTime: temporal.currentUniverseTime,
      periodRef: temporal.currentPeriodRef,
      periodLifecycleState: temporal.periodLifecycleState,
      periodSequence: temporal.periodSequence,
      unresolvedCount: Object.keys(snapshot.unresolvedConditions).length,
      activeProcessCount: Object.values(snapshot.processes).filter(
        process => String(process.lifecycleStatus ?? '').toUpperCase() === 'ACTIVE',
      ).length,
    });
  }

  private snapshot(universeId: string, requestedBy: string, requestedAt: number): UniverseModel {
    const result = this.execute({
      queryId: `APP_SNAPSHOT_${universeId}`,
      queryType: 'SNAPSHOT',
      universeId,
      requestedBy,
      requestedAt,
    });

    return result.data as UniverseModel;
  }

  private execute(query: UniverseQuery): { data: unknown } {
    const result = this.executionEngine.executeQuery(query);
    if (!result.success || !result.data) {
      throw new Error(result.message ?? `Application query '${query.queryId}' failed.`);
    }
    return result.data;
  }

  private toCharacterSummary(character: CharacterEntity): CharacterSummaryDTO {
    const indicatorKeys = character.indicators
      ? Object.entries(character.indicators)
          .filter(([, group]) => group && typeof group === 'object' && !Array.isArray(group))
          .flatMap(([groupKey, group]) =>
            groupKey === 'history' ? [] : Object.keys(group as object),
          )
      : [];

    return Object.freeze({
      id: String(character.identity.id),
      name: character.profile?.name,
      roleReferences: [...character.roleReferences],
      stateReference: character.stateReference,
      knowledgeReferences: [...character.knowledgeReferences],
      relationshipReferences: [...character.relationshipReferences],
      locationReference: character.locationReference,
      temporalValidity: character.temporalValidity,
      indicatorKeys: Object.freeze(indicatorKeys),
    });
  }
}
