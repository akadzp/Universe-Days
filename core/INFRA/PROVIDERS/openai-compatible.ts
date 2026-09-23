/** Phase 33 — OpenAI-compatible REST model adapter.
 * Implements the provider-neutral ModelAdapter interface.
 */

import type {
  GenerationRequest,
  GenerationResponse,
  ModelAdapter,
  ModelProfile
} from '../../INFRA/MODEL/types.ts';

export interface OpenAICompatibleAdapterOptions {
  readonly apiKey: string;
  readonly modelId: string;
  readonly providerId?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly profileOverrides?: Partial<ModelProfile>;
}

interface OpenAIChatCompletionResponse {
  readonly id?: string;
  readonly choices?: Array<{
    readonly message?: {
      readonly content?: string;
    };
    readonly finish_reason?: string;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly error?: {
    readonly message?: string;
  };
}

export class OpenAICompatibleModelAdapter implements ModelAdapter {
  public readonly profile: ModelProfile;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  public constructor(options: OpenAICompatibleAdapterOptions) {
    if (!options.apiKey) throw new Error('API key is required for OpenAI-compatible adapter.');
    if (!options.modelId) throw new Error('modelId is required for OpenAI-compatible adapter.');

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.timeoutMs = Math.max(1_000, options.timeoutMs ?? 60_000);

    this.profile = Object.freeze({
      modelId: options.modelId,
      providerId: options.providerId ?? 'openai-compatible',
      tier: 'HIGH_CAPABILITY',
      capabilities: {
        structuredOutput: true,
        vision: false,
        embeddings: false,
        maxInputTokens: 128_000,
        maxOutputTokens: 16_384
      },
      costWeight: 3,
      qualityWeight: 4,
      ...options.profileOverrides
    });
  }

  public async generate<T = unknown>(request: GenerationRequest): Promise<GenerationResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: request.systemContext },
        { role: 'user', content: request.userContext }
      ];

      const body: Record<string, unknown> = {
        model: this.profile.modelId,
        messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxOutputTokens ?? 4_096
      };

      if (request.structuredSchema) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'generation_output',
            strict: true,
            schema: request.structuredSchema
          }
        };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
      }

      const payload = (await response.json()) as OpenAIChatCompletionResponse;
      if (payload.error) {
        throw new Error(`OpenAI API returned error: ${payload.error.message}`);
      }

      const rawText = payload.choices?.[0]?.message?.content ?? '';
      let parsed: T | undefined;
      if (request.structuredSchema || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          parsed = JSON.parse(rawText) as T;
        } catch {
          // Leave parsed undefined if not valid JSON
        }
      }

      return Object.freeze({
        requestId: request.requestId,
        modelId: this.profile.modelId,
        providerId: this.profile.providerId,
        rawText,
        ...(parsed !== undefined ? { parsed } : {}),
        ...(payload.usage
          ? {
              usage: {
                inputTokens: payload.usage.prompt_tokens ?? 0,
                outputTokens: payload.usage.completion_tokens ?? 0
              }
            }
          : {})
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createOpenAICompatibleAdapterFromEnv(
  env: Record<string, string | undefined> = process.env
): OpenAICompatibleModelAdapter | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const modelId = env.OPENAI_MODEL?.trim() || (apiKey ? 'gpt-4o-mini' : undefined);
  if (!apiKey || !modelId) return null;

  return new OpenAICompatibleModelAdapter({
    apiKey,
    modelId,
    providerId: env.OPENAI_PROVIDER_ID?.trim() || 'openai',
    baseUrl: env.OPENAI_BASE_URL?.trim() || undefined,
    timeoutMs: env.OPENAI_TIMEOUT_MS ? Number(env.OPENAI_TIMEOUT_MS) : undefined
  });
}
