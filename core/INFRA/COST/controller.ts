/** Phase 32 — deterministic token/cost controller. */
import { deterministicKey } from '../../SHARED/platform.ts';
import type { GenerationUsage } from '../../INFRA/MODEL/types.ts';
import type { CostBudget, CostDecision, CostRate, UsageCommit } from '../../INFRA/COST/types.ts';
export interface CostControllerOptions { readonly defaultBudget?: CostBudget; readonly rates?: Readonly<Record<string, CostRate>>; }
export class CostController {
  private readonly defaultBudget: CostBudget; private readonly rates: Readonly<Record<string, CostRate>>;
  private readonly committed = new Map<string, UsageCommit>(); private readonly reserved = new Map<string, { decision: CostDecision; providerClass: string }>();
  public constructor(options?: CostControllerOptions) {
    this.defaultBudget = Object.freeze(options?.defaultBudget ?? { maxInputTokens: 5_000_000, maxOutputTokens: 1_000_000, maxCost: Number.POSITIVE_INFINITY });
    this.rates = Object.freeze({ ...(options?.rates ?? {}) });
  }
  public authorize(input: { readonly runId: string; readonly providerClass: string; readonly inputTokens: number; readonly outputTokens: number; readonly namespace: string; readonly budget?: CostBudget }): CostDecision {
    const budget = input.budget ?? this.defaultBudget;
    if (input.inputTokens > budget.maxInputTokens) return this.block(input.runId, `Estimated input tokens ${input.inputTokens} exceed budget ${budget.maxInputTokens}.`);
    if (input.outputTokens > budget.maxOutputTokens) return this.block(input.runId, `Estimated output tokens ${input.outputTokens} exceed budget ${budget.maxOutputTokens}.`);
    const estimatedCost = this.cost(input.providerClass, input.inputTokens, input.outputTokens);
    if (estimatedCost > budget.maxCost) return this.block(input.runId, `Estimated cost ${estimatedCost} exceeds budget ${budget.maxCost}.`);
    const decision = Object.freeze({ allowed: true, runId: input.runId, estimatedCost }); this.reserved.set(input.runId, { decision, providerClass: input.providerClass }); return decision;
  }
  public commit(runId: string, inputTokens: number, outputTokens: number): UsageCommit {
    const reservation = this.reserved.get(runId); const providerClass = reservation?.providerClass ?? 'default';
    const commit: UsageCommit = Object.freeze({ runId, inputTokens, outputTokens, cost: this.cost(providerClass, inputTokens, outputTokens) }); this.committed.set(runId, commit); this.reserved.delete(runId); return commit;
  }
  public release(runId: string): void { this.reserved.delete(runId); }
  public usage(runId: string): UsageCommit | null { return this.committed.get(runId) ?? null; }
  public totalCommitted(): UsageCommit { const all = [...this.committed.values()]; return Object.freeze({ runId: deterministicKey('TOTAL_USAGE', all.map(item => item.runId).sort()), inputTokens: all.reduce((sum, item) => sum + item.inputTokens, 0), outputTokens: all.reduce((sum, item) => sum + item.outputTokens, 0), cost: all.reduce((sum, item) => sum + item.cost, 0) }); }
  private cost(providerClass: string, inputTokens: number, outputTokens: number): number { const rate = this.rates[providerClass] ?? this.rates.default ?? { inputPerThousand: 0, outputPerThousand: 0 }; return inputTokens / 1000 * rate.inputPerThousand + outputTokens / 1000 * rate.outputPerThousand; }
  private block(runId: string, reason: string): CostDecision { return Object.freeze({ allowed: false, runId, estimatedCost: 0, reason }); }
}
export function estimateUsageCost(usage: GenerationUsage | undefined, rate: CostRate): number { return usage ? usage.inputTokens / 1000 * rate.inputPerThousand + usage.outputTokens / 1000 * rate.outputPerThousand : 0; }
