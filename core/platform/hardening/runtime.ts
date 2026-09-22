import { PlatformResult, err, ok } from '../shared.ts';
import { HardeningPolicy, defaultHardeningPolicy } from './policy.ts';
import { RuntimeGuards } from './guards.ts';

export class HardenedRuntimeBoundary {
  public readonly guards: RuntimeGuards;
  public constructor(public readonly policy: HardeningPolicy = defaultHardeningPolicy) {
    this.guards = new RuntimeGuards(policy);
  }

  public gatePageBatch(size: number): PlatformResult<true> {
    const result = this.guards.validatePageBatch(size);
    return result.allowed ? ok(true) : err(result.code ?? 'BLOCKED', result.message ?? 'Page batch rejected.');
  }

  public gateContext(characters: number): PlatformResult<true> {
    const result = this.guards.validateContext(characters);
    return result.allowed ? ok(true) : err(result.code ?? 'BLOCKED', result.message ?? 'Context rejected.');
  }

  public gateTokenBudget(tokens: number): PlatformResult<true> {
    const result = this.guards.validateTokenBudget(tokens);
    return result.allowed ? ok(true) : err(result.code ?? 'BLOCKED', result.message ?? 'Token budget rejected.');
  }
}
