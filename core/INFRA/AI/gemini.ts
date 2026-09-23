/** Phase 26 — Gemini REST adapter.
 *
 * The adapter is provider-specific, but it implements the provider-neutral
 * ModelAdapter contract. It never mutates Universe state and never receives
 * storage or authority handles.
 */

import type {
  GenerationRequest,
  GenerationResponse,
  ModelAdapter,
  ModelProfile
} from '../../INFRA/MODEL/types.ts';

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  promptFeedback?: {
    blockReason?: string;
  };
}

export interface GeminiAdapterOptions {
  readonly apiKey: string;
  readonly modelId: string;
  readonly providerId?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly profileOverrides?: Partial<ModelProfile>;
}

export class GeminiModelAdapter implements ModelAdapter {
  public readonly profile: ModelProfile;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  public constructor(options: GeminiAdapterOptions) {
    if (!options.apiKey) throw new Error('Gemini API key is required.');
    if (!options.modelId) throw new Error('Gemini modelId is required.');

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    this.timeoutMs = Math.max(1_000, options.timeoutMs ?? 60_000);

    this.profile = Object.freeze({
      modelId: options.modelId,
      providerId: options.providerId ?? 'gemini',
      tier: 'HIGH_CAPABILITY',
      capabilities: {
        structuredOutput: true,
        vision: false,
        embeddings: false,
        maxInputTokens: Number.MAX_SAFE_INTEGER,
        maxOutputTokens: 65_536
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
      const url = `${this.baseUrl}/models/${encodeURIComponent(this.profile.modelId)}:generateContent`;
      const generationConfig: Record<string, unknown> = {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? 4_096
      };

      if (request.structuredSchema) {
        generationConfig.response_mime_type = 'application/json';
        generationConfig.response_schema = request.structuredSchema;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: request.systemContext }]
          },
          contents: [{
            role: 'user',
            parts: [{ text: request.userContext }]
          }],
          generationConfig
        }),
        signal: controller.signal
      });

      const payload = await response.json() as GeminiGenerateResponse & { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? `Gemini API request failed with HTTP ${response.status}.`);
      }

      if (payload.promptFeedback?.blockReason) {
        throw new Error(`Gemini blocked the request: ${payload.promptFeedback.blockReason}.`);
      }

      const candidate = payload.candidates?.[0];
      if (!candidate) throw new Error('Gemini returned no candidate.');

      const rawText = (candidate.content?.parts ?? [])
        .map(part => part.text ?? '')
        .join('')
        .trim();

      if (!rawText) {
        throw new Error(`Gemini returned an empty response${candidate.finishReason ? ` (${candidate.finishReason})` : ''}.`);
      }

      let parsed: T | undefined;
      if (request.structuredSchema) {
        try {
          parsed = JSON.parse(rawText) as T;
        } catch {
          throw new Error('Gemini returned non-JSON output for a structured request.');
        }
      }

      return Object.freeze({
        requestId: request.requestId,
        modelId: this.profile.modelId,
        providerId: this.profile.providerId,
        rawText,
        ...(parsed === undefined ? {} : { parsed }),
        ...(payload.usageMetadata
          ? {
              usage: {
                inputTokens: payload.usageMetadata.promptTokenCount ?? 0,
                outputTokens: payload.usageMetadata.candidatesTokenCount ?? 0
              }
            }
          : {})
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createGeminiAdapterFromEnv(env: Record<string, string | undefined> = process.env): GeminiModelAdapter | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const modelId = env.GEMINI_MODEL?.trim();
  if (!apiKey || !modelId) return null;

  return new GeminiModelAdapter({
    apiKey,
    modelId,
    providerId: env.GEMINI_PROVIDER_ID?.trim() || 'gemini',
    baseUrl: env.GEMINI_BASE_URL?.trim() || undefined,
    timeoutMs: env.GEMINI_TIMEOUT_MS ? Number(env.GEMINI_TIMEOUT_MS) : undefined
  });
}
