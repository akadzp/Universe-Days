/** Phase 26 — provider-neutral AI production proposal service. */

import { deterministicKey } from '../shared.ts';
import { ModelRouter } from '../model/router.ts';
import type { GenerationRequest, GenerationResponse } from '../model/types.ts';
import { DefaultAIProposalGuard } from './guard.ts';
import type { AIProductionContext, AIProductionPolicy, AIProposal } from './types.ts';

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildUserContext(context: AIProductionContext, maxCharacters?: number): string {
  const sections = [
    `AUTHORITATIVE REFERENCES:\n${JSON.stringify(context.authoritativeReferences)}`,
    `CONTEXT BLOCKS:\n${context.contextBlocks.map(compact).join('\n')}`,
    `USER INSTRUCTION:\n${context.userInstruction}`
  ];

  const combined = sections.join('\n\n');
  if (!maxCharacters || combined.length <= maxCharacters) return combined;
  return combined.slice(0, Math.max(0, maxCharacters));
}

export class AIProductionService {
  private readonly guard = new DefaultAIProposalGuard();

  public constructor(private readonly models: ModelRouter) {}

  public hasProvider(): boolean {
    return this.models.list().length > 0;
  }

  public async propose<T = unknown>(
    context: AIProductionContext,
    policy: AIProductionPolicy,
    options?: {
      readonly structuredSchema?: Record<string, unknown>;
      readonly maxOutputTokens?: number;
      readonly temperature?: number;
    }
  ): Promise<AIProposal<T>> {
    if (!context.contextId || !context.universeId || !context.universeScope) {
      throw new Error('AI production context requires universe identity and scope.');
    }
    if (!this.hasProvider()) {
      throw new Error('No AI model provider is connected.');
    }

    const requestId = deterministicKey(
      'AIREQ',
      context.contextId,
      context.universeId,
      context.universeScope,
      context.systemInstruction,
      context.userInstruction,
      context.contextBlocks,
      policy.routing,
      options ?? {}
    );

    const request: GenerationRequest = Object.freeze({
      requestId,
      task: 'STORY_GENERATION',
      systemContext: [
        context.systemInstruction,
        'The model is a non-authoritative proposal generator.',
        'Do not invent authoritative IDs, permissions, storage paths, transactions, or Canon mutations.',
        'Return only the requested creative or semantic proposal.'
      ].join('\n\n'),
      userContext: buildUserContext(context, policy.maxContextCharacters),
      ...(options?.structuredSchema ? { structuredSchema: options.structuredSchema } : {}),
      ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      temperature: options?.temperature ?? 0.2
    });

    let response: GenerationResponse<T>;
    try {
      response = await this.models.generate<T>(request, policy.routing);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'AI provider generation failed.');
    }

    const proposal = Object.freeze({
      proposalId: deterministicKey('AIPROPOSAL', request.requestId, response.modelId, response.providerId, response.rawText),
      status: 'PROPOSED' as const,
      request,
      response
    });

    if (policy.rejectAuthorityClaims) {
      const validation = this.guard.validate(proposal);
      if (!validation.valid) {
        return Object.freeze({
          proposalId: proposal.proposalId,
          status: 'REJECTED' as const,
          request,
          response,
          rejectionReason: validation.reason
        });
      }
    }

    return proposal;
  }
}
