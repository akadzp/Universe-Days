import { GenerationRequest, GenerationResponse, ModelAdapter, ModelRoutingPolicy } from '../../INFRA/MODEL/types.ts';

const tierRank = { LOCAL: 1, LOW_COST: 2, STANDARD: 3, HIGH_CAPABILITY: 4 } as const;

export class ModelRouter {
  public constructor(private readonly adapters: readonly ModelAdapter[]) {}

  public list(): readonly ModelAdapter[] {
    return this.adapters;
  }

  public resolve(request: GenerationRequest, policy: ModelRoutingPolicy): ModelAdapter {
    const candidates = this.adapters.filter(adapter => {
      const profile = adapter.profile;
      if (policy.requireStructuredOutput && !profile.capabilities.structuredOutput) return false;
      if (policy.requireVision && !profile.capabilities.vision) return false;
      if ((policy.maxInputTokens ?? 0) > profile.capabilities.maxInputTokens) return false;
      if ((request.maxOutputTokens ?? policy.maxOutputTokens ?? 0) > profile.capabilities.maxOutputTokens) return false;
      return true;
    });
    if (!candidates.length) throw new Error(`No compatible model adapter for task ${request.task}.`);
    candidates.sort((a, b) => {
      const tierDelta = tierRank[a.profile.tier] - tierRank[b.profile.tier];
      if (tierDelta) return Math.abs(tierRank[a.profile.tier] - tierRank[policy.preferredTier]) - Math.abs(tierRank[b.profile.tier] - tierRank[policy.preferredTier]);
      return b.profile.qualityWeight - a.profile.qualityWeight || a.profile.costWeight - b.profile.costWeight || a.profile.modelId.localeCompare(b.profile.modelId);
    });
    return candidates[0];
  }

  public async generate<T>(request: GenerationRequest, policy: ModelRoutingPolicy): Promise<GenerationResponse<T>> {
    const adapter = this.resolve(request, policy);
    return adapter.generate<T>(request);
  }
}
