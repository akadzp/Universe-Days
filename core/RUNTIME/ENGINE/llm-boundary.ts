/**
 * Phase 9: LLM Boundary & Non-Authority Adapter
 *
 * LLM is a proposal/semantic adapter only.
 * Mock output is deterministic and contains no wall-clock metadata.
 */

import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

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

export class MockLLMAdapter implements LLMAdapter {
  private responses: Map<string, unknown> = new Map();

  public registerResponse(promptKeyword: string, responseData: unknown): void {
    this.responses.set(promptKeyword, responseData);
  }

  public async invoke<TData = unknown>(
    request: LLMRequest
  ): Promise<Result<LLMResponse<TData>>> {
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
      rawText: JSON.stringify(
        matchingData ?? { text: 'Mock LLM proposal output' }
      ),
      parsedData: (matchingData as TData) ?? undefined,
      tokensUsed: 42,
      metadata: {
        mock: true,
        deterministic: true
      }
    };

    return success(response);
  }
}
