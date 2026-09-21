/**
 * Phase 9: LLM Boundary & Non-Authority Adapter
 *
 * Defines the contract and boundary for LLM interaction.
 *
 * CRITICAL INVARIANTS:
 * 1. LLM is NOT an architectural authority.
 * 2. LLM cannot mutate Canon directly.
 * 3. LLM cannot determine Universe Date or Clocks.
 * 4. LLM cannot invent IDs, ownership, or permissions.
 * 5. LLM output must pass full domain owner validation.
 */

import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';

export type LLMCapability = 'TEXT_GENERATION' | 'STRUCTURED_DATA' | 'SUMMARIZATION' | 'PROPOSAL';

export interface LLMRequest {
  requestId: string;
  capability: LLMCapability;
  prompt: string;
  contextData?: Record<string, unknown>;
  schema?: Record<string, unknown>;
  temperature?: number;
}

export interface LLMResponse<TData = unknown> {
  requestId: string;
  rawText: string;
  parsedData?: TData;
  tokensUsed?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMAdapter {
  invoke<TData = unknown>(request: LLMRequest): Promise<Result<LLMResponse<TData>>>;
}

/**
 * Mock LLM Adapter for Phase 9 testing.
 * Strictly guarantees that LLM outputs are treated as PROPOSALS, not authoritative facts.
 */
export class MockLLMAdapter implements LLMAdapter {
  private responses: Map<string, unknown> = new Map();

  public registerResponse(promptKeyword: string, responseData: unknown): void {
    this.responses.set(promptKeyword, responseData);
  }

  public async invoke<TData = unknown>(request: LLMRequest): Promise<Result<LLMResponse<TData>>> {
    if (!request.requestId || !request.prompt) {
      return failure(
        EngineErrorCode.INVALID_DOMAIN_REQUEST,
        'LLMRequest validation failed: requestId and prompt are required.'
      );
    }

    let matchingData: unknown = null;
    for (const [key, val] of this.responses.entries()) {
      if (request.prompt.includes(key)) {
        matchingData = val;
        break;
      }
    }

    const response: LLMResponse<TData> = {
      requestId: request.requestId,
      rawText: JSON.stringify(matchingData ?? { text: 'Mock LLM proposal output' }),
      parsedData: (matchingData as TData) ?? undefined,
      tokensUsed: 42,
      metadata: { mock: true, generatedAt: Date.now() }
    };

    return success(response);
  }
}
