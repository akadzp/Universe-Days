/**
 * Application Command Handler: Advance Daily Cycle
 */

import { ApplicationCommand, CommandResult, successCommandResult, failureCommandResult } from '../../contracts/command.ts';
import { UniverseInstanceManager } from '../../../core/INFRA/INSTANCE/instance.ts';
import { UniverseModelFactory } from '../../../core/UNIVERSE/CANON/universe.ts';
import { makeSystemID } from '../../../core/SHARED/identifiers.ts';
import { PeriodLifecycleManager, PeriodLifecycleEvent } from '../../../core/UNIVERSE/DAILY-CYCLE/lifecycle.ts';
import { DailyUniverseStatus } from '../../../core/UNIVERSE/DAILY-CYCLE/period.ts';

export interface AdvanceDailyCyclePayload {
  readonly periodId: string;
  readonly targetLifecycleEvent: 'START_PROGRESSION' | 'START_FINALIZATION' | 'COMPLETE_FINALIZATION';
}

export class AdvanceDailyCycleCommandHandler {
  public constructor(private readonly instanceManager: UniverseInstanceManager) {}

  public handle(command: ApplicationCommand<AdvanceDailyCyclePayload>): CommandResult<{ periodId: string; nextStatus: string }> {
    const { periodId, targetLifecycleEvent } = command.payload;
    const mounted = this.instanceManager.getMounted();
    if (!mounted) {
      return failureCommandResult(command.header.commandId, 'UNIVERSE_NOT_MOUNTED', 'No Universe instance is currently mounted.');
    }

    const currentPeriod = mounted.universe.periods[periodId];
    if (!currentPeriod) {
      return failureCommandResult(command.header.commandId, 'PERIOD_NOT_FOUND', `Period '${periodId}' not found in current universe.`);
    }

    const lifecycle = new PeriodLifecycleManager(currentPeriod.status as DailyUniverseStatus);
    const eventEnum = PeriodLifecycleEvent[targetLifecycleEvent];
    if (!eventEnum) {
      return failureCommandResult(command.header.commandId, 'INVALID_LIFECYCLE_EVENT', `Invalid lifecycle event: ${targetLifecycleEvent}`);
    }

    const transitionResult = lifecycle.transition(eventEnum, { periodId });
    if (!transitionResult.success) {
      return failureCommandResult(
        command.header.commandId,
        'TRANSITION_FAILED',
        `Lifecycle transition failed: ${transitionResult.error?.message}`
      );
    }

    const newStatus = lifecycle.getStatus();
    const updatedPeriod = Object.freeze({
      ...currentPeriod,
      status: newStatus
    });

    const evolvedUniverse = UniverseModelFactory.evolve(
      mounted.universe,
      {
        periods: {
          ...mounted.universe.periods,
          [periodId]: updatedPeriod
        },
        periodLifecycleState: newStatus,
        sourceSystem: makeSystemID('PERIOD_CYCLE_SYSTEM'),
        effectiveTime: new Date(command.header.timestamp).toISOString(),
        changedFields: ['periods', 'temporalContext'],
        reason: `Advanced daily cycle for period ${periodId} to ${newStatus}`
      }
    );

    this.instanceManager.persist(evolvedUniverse);
    this.instanceManager.load(evolvedUniverse.universeId, mounted.universeScope);

    return successCommandResult(command.header.commandId, {
      periodId,
      nextStatus: newStatus
    });
  }
}
