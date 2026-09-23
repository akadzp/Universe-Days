/** Phase 17 — model-neutral token budgeting. */

import { clamp } from '../../SHARED/platform.ts';

export interface TokenBudget {
  readonly inputLimit: number;
  readonly outputReserve: number;
  readonly safetyReserve: number;
}

export interface TokenEstimate {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly basis: 'CHARACTER_ESTIMATE' | 'PROVIDED';
}

export interface TokenBudgetDecision {
  readonly allowed: boolean;
  readonly remainingInput: number;
  readonly reason?: string;
}

export interface TokenEstimator {
  estimateInput(text: string): TokenEstimate;
}

export class CharacterRatioTokenEstimator implements TokenEstimator {
  public constructor(private readonly charsPerToken = 4) {
    if (!(charsPerToken > 0)) throw new Error('charsPerToken must be positive.');
  }
  public estimateInput(text: string): TokenEstimate {
    const inputTokens = Math.ceil(text.length / this.charsPerToken);
    return Object.freeze({ inputTokens, outputTokens: 0, totalTokens: inputTokens, basis: 'CHARACTER_ESTIMATE' });
  }
}

export class TokenBudgetManager {
  public constructor(private readonly estimator: TokenEstimator = new CharacterRatioTokenEstimator()) {}

  public decide(text: string, budget: TokenBudget): TokenBudgetDecision {
    const estimate = this.estimator.estimateInput(text);
    const available = Math.max(0, budget.inputLimit - budget.outputReserve - budget.safetyReserve);
    return estimate.inputTokens <= available
      ? Object.freeze({ allowed: true, remainingInput: available - estimate.inputTokens })
      : Object.freeze({ allowed: false, remainingInput: 0, reason: `Estimated input ${estimate.inputTokens} exceeds available budget ${available}.` });
  }

  public allocate(totalInputLimit: number, shares: readonly { id: string; weight: number }[], outputReserve = 0, safetyReserve = 0) {
    const available = Math.max(0, totalInputLimit - outputReserve - safetyReserve);
    const totalWeight = shares.reduce((sum, item) => sum + Math.max(0, item.weight), 0) || 1;
    return Object.freeze(shares.map(item => ({
      id: item.id,
      inputLimit: clamp(Math.floor(available * Math.max(0, item.weight) / totalWeight), 0, available)
    })));
  }
}
