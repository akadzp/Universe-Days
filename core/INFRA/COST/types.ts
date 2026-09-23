/** Phase 32 — token and cost governance contracts. */
export interface CostBudget { readonly maxInputTokens: number; readonly maxOutputTokens: number; readonly maxCost: number; }
export interface CostRate { readonly inputPerThousand: number; readonly outputPerThousand: number; }
export interface CostDecision { readonly allowed: boolean; readonly runId: string; readonly reason?: string; readonly estimatedCost: number; }
export interface UsageCommit { readonly runId: string; readonly inputTokens: number; readonly outputTokens: number; readonly cost: number; }
