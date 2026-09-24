import type { PocerExecutionEngine } from '../core/RUNTIME/ENGINE/orchestrator.ts';
import type { UniverseCommand } from '../core/RUNTIME/ENGINE/command.ts';
import type { WorkflowDefinition } from '../core/RUNTIME/ENGINE/workflow.ts';
import { ApplicationAuthorizer } from './authorization.ts';
import type { ApplicationCommand, CommandResult } from './contracts.ts';

export interface ApplicationRuntimeDependencies {
  readonly executionEngine: PocerExecutionEngine;
  readonly authorizer?: ApplicationAuthorizer;
}

export interface ApplicationRuntime {
  readonly commands: ApplicationCommandBus;
}

export function createApplicationRuntime(
  dependencies: ApplicationRuntimeDependencies,
): ApplicationRuntime {
  return Object.freeze({
    commands: new ApplicationCommandBus(
      dependencies.executionEngine,
      dependencies.authorizer ?? new ApplicationAuthorizer(),
    ),
  });
}

export class ApplicationCommandBus {
  public constructor(
    private readonly executionEngine: PocerExecutionEngine,
    private readonly authorizer: ApplicationAuthorizer,
  ) {}

  public async execute<TPayload, TResult = unknown>(
    command: ApplicationCommand<TPayload>,
    workflow: WorkflowDefinition,
  ): Promise<CommandResult<TResult>> {
    try {
      this.authorizer.authorize(command);

      const coreCommand: Partial<UniverseCommand> = {
        commandId: command.commandId,
        commandType: command.commandType,
        requestedBy: command.actor.actorId,
        target: workflowTarget(command),
        input: command.payload as Record<string, unknown>,
        universeContext: {
          universeId: command.universeId,
          universeTime: command.universeTime,
        },
        temporalContext: {
          effectiveTime: command.universeTime,
        },
        executionMode: 'TRANSACTIONAL',
        requestedAt: command.actor.requestTimestamp,
        correlationId: command.actor.correlationId ?? `CORR_${command.commandId}`,
        idempotencyKey: command.idempotencyKey,
        isIdempotent: Boolean(command.idempotencyKey),
      };

      const result = await this.executionEngine.executeCommand(coreCommand, workflow);

      return Object.freeze({
        success: result.success,
        status: result.status,
        executionId: result.executionId,
        data: result.success ? result.outputs as TResult : undefined,
        error: result.error
          ? { code: String(result.error.code), message: result.error.message }
          : undefined,
      });
    } catch (error) {
      return Object.freeze({
        success: false,
        status: 'BLOCKED',
        error: {
          code: 'APPLICATION_AUTHORIZATION_OR_DISPATCH_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

function workflowTarget(command: ApplicationCommand<unknown>): UniverseCommand['target'] {
  switch (command.commandType) {
    case 'CREATE_CHARACTER':
    case 'APPLY_CHARACTER_INDICATOR_EFFECT':
      return { domain: 'CHARACTER' };
    default:
      return undefined;
  }
}
