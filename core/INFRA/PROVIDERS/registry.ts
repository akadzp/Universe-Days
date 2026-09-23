/** Phase 33 — Provider Registry & Gateway with Failover.
 * Implements the AIModelGateway interface required by AIProductionService.
 */

import type {
  GenerationRequest,
  GenerationResponse,
  ModelAdapter,
  ModelRoutingPolicy
} from '../../INFRA/MODEL/types.ts';
import type { AIModelGateway } from '../../INFRA/AI/production.ts';
import type { ProviderHealthRecord, ProviderHealthStatus } from '../../INFRA/PROVIDERS/types.ts';

const tierRank: Record<string, number> = {
  LOCAL: 1,
  LOW_COST: 2,
  STANDARD: 3,
  HIGH_CAPABILITY: 4
};

export class ProviderRegistry implements AIModelGateway {
  private readonly adapters: readonly ModelAdapter[];
  private readonly healthMap = new Map<string, ProviderHealthRecord>();

  public constructor(adapters: readonly ModelAdapter[] = []) {
    this.adapters = Object.freeze([...adapters]);
    for (const adapter of this.adapters) {
      this.healthMap.set(adapter.profile.providerId, {
        providerId: adapter.profile.providerId,
        modelId: adapter.profile.modelId,
        status: 'HEALTHY',
        lastChecked: new Date().toISOString(),
        consecutiveFailures: 0,
        totalRequests: 0,
        totalSuccesses: 0
      });
    }
  }

  public list(): readonly ModelAdapter[] {
    return this.adapters;
  }

  public get(providerId: string): ModelAdapter | undefined {
    return this.adapters.find(a => a.profile.providerId === providerId);
  }

  public healthSnapshot(): Record<string, ProviderHealthRecord> {
    const snapshot: Record<string, ProviderHealthRecord> = {};
    for (const [id, record] of this.healthMap.entries()) {
      snapshot[id] = Object.freeze({ ...record });
    }
    return Object.freeze(snapshot);
  }

  public async generate<T>(
    request: GenerationRequest,
    policy: ModelRoutingPolicy
  ): Promise<GenerationResponse<T>> {
    const eligible = this.filterAndSortCandidates(request, policy);
    if (eligible.length === 0) {
      throw new Error(`No available model adapter can fulfill task ${request.task}.`);
    }

    let lastError: Error | null = null;
    for (const adapter of eligible) {
      const providerId = adapter.profile.providerId;
      try {
        const response = await adapter.generate<T>(request);
        this.recordSuccess(providerId);
        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.recordFailure(providerId, lastError.message);
        // Failover: continue loop to try next eligible adapter
      }
    }

    throw new Error(
      `All eligible model adapters failed for task ${request.task}. Last error: ${lastError?.message}`
    );
  }

  private filterAndSortCandidates(
    request: GenerationRequest,
    policy: ModelRoutingPolicy
  ): readonly ModelAdapter[] {
    const candidates = this.adapters.filter(adapter => {
      const profile = adapter.profile;
      const health = this.healthMap.get(profile.providerId);
      if (health?.status === 'UNAVAILABLE') return false;
      if (policy.requireStructuredOutput && !profile.capabilities.structuredOutput) return false;
      if (policy.requireVision && !profile.capabilities.vision) return false;
      if ((policy.maxInputTokens ?? 0) > profile.capabilities.maxInputTokens) return false;
      if ((request.maxOutputTokens ?? policy.maxOutputTokens ?? 0) > profile.capabilities.maxOutputTokens) return false;
      return true;
    });

    candidates.sort((a, b) => {
      const aRank = tierRank[a.profile.tier] ?? 2;
      const bRank = tierRank[b.profile.tier] ?? 2;
      const targetRank = tierRank[policy.preferredTier] ?? 3;
      const diffA = Math.abs(aRank - targetRank);
      const diffB = Math.abs(bRank - targetRank);
      if (diffA !== diffB) return diffA - diffB;
      return (
        b.profile.qualityWeight - a.profile.qualityWeight ||
        a.profile.costWeight - b.profile.costWeight ||
        a.profile.modelId.localeCompare(b.profile.modelId)
      );
    });

    return candidates;
  }

  private recordSuccess(providerId: string): void {
    const current = this.healthMap.get(providerId);
    if (!current) return;
    this.healthMap.set(providerId, {
      ...current,
      status: 'HEALTHY',
      consecutiveFailures: 0,
      totalRequests: current.totalRequests + 1,
      totalSuccesses: current.totalSuccesses + 1,
      lastChecked: new Date().toISOString()
    });
  }

  private recordFailure(providerId: string, error: string): void {
    const current = this.healthMap.get(providerId);
    if (!current) return;
    const consecutive = current.consecutiveFailures + 1;
    const status: ProviderHealthStatus = consecutive >= 3 ? 'UNAVAILABLE' : 'DEGRADED';
    this.healthMap.set(providerId, {
      ...current,
      status,
      consecutiveFailures: consecutive,
      totalRequests: current.totalRequests + 1,
      lastError: error,
      lastChecked: new Date().toISOString()
    });
  }
}
