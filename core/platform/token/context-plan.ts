import { deterministicKey } from '../shared.ts';
import { TokenBudget } from './budget.ts';

export type ContextPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'OPTIONAL';

export interface TokenContextItem {
  readonly id: string;
  readonly content: string;
  readonly priority: ContextPriority;
  readonly reusable?: boolean;
}

export interface TokenContextPlan {
  readonly planId: string;
  readonly items: readonly TokenContextItem[];
  readonly droppedIds: readonly string[];
  readonly budget: TokenBudget;
}

const rank: Record<ContextPriority, number> = { CRITICAL: 5, HIGH: 4, NORMAL: 3, LOW: 2, OPTIONAL: 1 };

export class TokenContextPlanner {
  public plan(items: readonly TokenContextItem[], budget: TokenBudget, estimatedTokenCost: (value: string) => number): TokenContextPlan {
    let remaining = Math.max(0, budget.inputLimit - budget.outputReserve - budget.safetyReserve);
    const sorted = [...items].sort((a, b) => rank[b.priority] - rank[a.priority] || a.id.localeCompare(b.id));
    const accepted: TokenContextItem[] = [];
    const dropped: string[] = [];
    for (const item of sorted) {
      const cost = Math.max(0, estimatedTokenCost(item.content));
      if (cost <= remaining || item.priority === 'CRITICAL') {
        accepted.push(item);
        remaining -= Math.min(remaining, cost);
      } else dropped.push(item.id);
    }
    accepted.sort((a, b) => a.id.localeCompare(b.id));
    return Object.freeze({
      planId: deterministicKey('TOKENPLAN', budget, accepted.map(i => i.id), dropped),
      items: Object.freeze(accepted),
      droppedIds: Object.freeze(dropped.sort()),
      budget: Object.freeze({ ...budget })
    });
  }
}
