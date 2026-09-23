/** Phase 33 — Provider Independence & Failover Types. */

import type { ModelAdapter, ModelProfile } from '../../INFRA/MODEL/types.ts';

export type ProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface ProviderHealthRecord {
  readonly providerId: string;
  readonly modelId: string;
  readonly status: ProviderHealthStatus;
  readonly lastChecked: string;
  readonly consecutiveFailures: number;
  readonly totalRequests: number;
  readonly totalSuccesses: number;
  readonly lastError?: string;
}
