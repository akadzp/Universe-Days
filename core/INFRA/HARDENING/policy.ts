/** Phase 24 — production safety and resource-boundary policy. */

export interface HardeningPolicy {
  readonly maxPageBatchSize: number;
  readonly maxContextCharacters: number;
  readonly maxTokenBudget: number;
  readonly maxRetries: number;
  readonly allowFutureProjections: boolean;
  readonly failClosedOnUnknown: boolean;
}

export const defaultHardeningPolicy: HardeningPolicy = Object.freeze({
  maxPageBatchSize: 1000,
  maxContextCharacters: 250_000,
  maxTokenBudget: 200_000,
  maxRetries: 2,
  allowFutureProjections: true,
  failClosedOnUnknown: true
});
