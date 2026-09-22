/** Provider-neutral bridge for the existing LLMAdapter boundary. */

import type { LLMAdapter } from '../../engine/llm-boundary.ts';
import { GenerationRequest, GenerationResponse, ModelAdapter, ModelProfile } from './types.ts';

export class LegacyLLMModelAdapter implements ModelAdapter {
  public constructor(
    public readonly profile: ModelProfile,
    private readonly adapter: LLMAdapter
  ) {}

  public async generate<T = unknown>(request: GenerationRequest): Promise<GenerationResponse<T>> {
    const response = await this.adapter.invoke<T>({
      requestId: request.requestId,
      capability: request.structuredSchema ? 'STRUCTURED_DATA' : 'TEXT_GENERATION',
      prompt: `${request.systemContext}\n\n${request.userContext}`,
      schema: request.structuredSchema,
      temperature: request.temperature
    });
    if (!response.success || !response.data) {
      throw new Error(response.message ?? 'Legacy LLM adapter failed.');
    }
    return Object.freeze({
      requestId: response.data.requestId,
      modelId: this.profile.modelId,
      providerId: this.profile.providerId,
      rawText: response.data.rawText,
      parsed: response.data.parsedData,
      ...(response.data.tokensUsed === undefined ? {} : {
        usage: { inputTokens: 0, outputTokens: response.data.tokensUsed }
      })
    });
  }
}

export class DeterministicModelAdapter implements ModelAdapter {
  public constructor(public readonly profile: ModelProfile) {}

  public async generate<T = unknown>(request: GenerationRequest): Promise<GenerationResponse<T>> {
    const parsed = request.structuredSchema ? ({} as T) : undefined;
    return Object.freeze({
      requestId: request.requestId,
      modelId: this.profile.modelId,
      providerId: this.profile.providerId,
      rawText: `DETERMINISTIC_MODEL:${request.task}:${request.requestId}`,
      ...(parsed === undefined ? {} : { parsed }),
      usage: { inputTokens: Math.ceil((request.systemContext.length + request.userContext.length) / 4), outputTokens: 1 }
    });
  }
}
