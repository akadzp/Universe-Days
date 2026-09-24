import type { PocerExecutionEngine } from '../core/RUNTIME/ENGINE/orchestrator.ts';
import type { UniverseQuery } from '../core/RUNTIME/ENGINE/query.ts';
import type { UniverseModel } from '../core/UNIVERSE/CANON/universe.ts';
import type { CharacterEntity } from '../core/CHARACTER/character.ts';
import type {
  ApplicationQueryContext,
  ApplicationQueryType,
  CharacterSummaryDTO,
  DailyCycleStatusDTO,
  UniverseSummaryDTO,
} from './contracts.ts';
import { ApplicationAuthorizer } from './authorization.ts';

export class ApplicationQueryService {
  public constructor(
    private readonly executionEngine: PocerExecutionEngine,
    private readonly authorizer: ApplicationAuthorizer = new ApplicationAuthorizer(),
  ) {}

  public universeStatus(context: ApplicationQueryContext): UniverseSummaryDTO {
    this.authorize(context, 'GET_UNIVERSE_STATUS');
    const universe = this.snapshot(context);

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
    context: ApplicationQueryContext,
    characterId: string,
  ): CharacterSummaryDTO | null {
    this.authorize(context, 'GET_CHARACTER_SUMMARY');
    const result = this.execute({
      queryId: `APP_CHARACTER_${context.universeId}_${characterId}`,
      queryType: 'ENTITY',
      targetDomain: 'CHARACTER',
      targetEntityId: characterId,
      universeId: context.universeId,
      requestedBy: context.actor.actorId,
      requestedAt: context.requestedAt,
    });

    const character = result.data as CharacterEntity | undefined;
    return character ? this.toCharacterSummary(character) : null;
  }

  public listCharacters(context: ApplicationQueryContext): readonly CharacterSummaryDTO[] {
    this.authorize(context, 'LIST_CHARACTERS');
    const universe = this.snapshot(context);

    return Object.freeze(
      Object.values(universe.characters).map(character => this.toCharacterSummary(character)),
    );
  }

  public dailyCycleStatus(context: ApplicationQueryContext): DailyCycleStatusDTO {
    this.authorize(context, 'GET_DAILY_CYCLE_STATUS');

    const temporalResult = this.execute({
      queryId: `APP_DAILY_${context.universeId}`,
      queryType: 'TEMPORAL',
      universeId: context.universeId,
      requestedBy: context.actor.actorId,
      requestedAt: context.requestedAt,
    });

    const temporal = temporalResult.data as UniverseModel['temporalContext'];
    const snapshot = this.snapshot(context);

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

  private authorize(context: ApplicationQueryContext, queryType: ApplicationQueryType): void {
    this.authorizer.authorizeQuery(context, queryType);
  }

  private snapshot(context: ApplicationQueryContext): UniverseModel {
    const result = this.execute({
      queryId: `APP_SNAPSHOT_${context.universeId}`,
      queryType: 'SNAPSHOT',
      universeId: context.universeId,
      requestedBy: context.actor.actorId,
      requestedAt: context.requestedAt,
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
