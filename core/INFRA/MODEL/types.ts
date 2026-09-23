/** Phase 23 — provider-neutral AI model boundary. */

export type ModelTask = 'STORY_GENERATION' | 'STRUCTURED_PROPOSAL' | 'SUMMARIZATION' | 'CLASSIFICATION' | 'EMBEDDING';
export type ModelTier = 'LOCAL' | 'LOW_COST' | 'STANDARD' | 'HIGH_CAPABILITY';

export interface ModelCapabilities {
  readonly structuredOutput: boolean;
  readonly vision: boolean;
  readonly embeddings: boolean;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
}

export interface ModelProfile {
  readonly modelId: string;
  readonly providerId: string;
  readonly tier: ModelTier;
  readonly capabilities: ModelCapabilities;
  readonly costWeight: number;
  readonly qualityWeight: number;
}

export interface GenerationRequest {
  readonly requestId: string;
  readonly task: ModelTask;
  readonly systemContext: string;
  readonly userContext: string;
  readonly structuredSchema?: Record<string, unknown>;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
}

export interface GenerationUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface GenerationResponse<T = unknown> {
  readonly requestId: string;
  readonly modelId: string;
  readonly providerId: string;
  readonly rawText: string;
  readonly parsed?: T;
  readonly usage?: GenerationUsage;
}

export interface ModelAdapter {
  readonly profile: ModelProfile;
  generate<T = unknown>(request: GenerationRequest): Promise<GenerationResponse<T>>;
}

export interface ModelRoutingPolicy {
  readonly preferredTier: ModelTier;
  readonly requireStructuredOutput?: boolean;
  readonly requireVision?: boolean;
  readonly maxInputTokens?: number;
  readonly maxOutputTokens?: number;
}
