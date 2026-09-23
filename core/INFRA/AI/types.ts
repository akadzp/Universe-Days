/** Phase 26 — AI Production Integration contracts. */

import type { GenerationRequest, GenerationResponse, ModelRoutingPolicy } from '../../INFRA/MODEL/types.ts';

export type AIProposalStatus = 'PROPOSED' | 'REJECTED';

export interface AIProductionContext {
  readonly contextId: string;
  readonly universeId: string;
  readonly universeScope: string;
  readonly authoritativeReferences: Readonly<Record<string, string>>;
  readonly systemInstruction: string;
  readonly userInstruction: string;
  readonly contextBlocks: readonly string[];
}

export interface AIProposal<T = unknown> {
  readonly proposalId: string;
  readonly status: AIProposalStatus;
  readonly request: GenerationRequest;
  readonly response?: GenerationResponse<T>;
  readonly rejectionReason?: string;
}

export interface AIProductionPolicy {
  readonly routing: ModelRoutingPolicy;
  readonly maxContextCharacters?: number;
  readonly rejectAuthorityClaims?: boolean;
}

export interface AIProposalGuard {
  validate<T>(proposal: AIProposal<T>): { readonly valid: true } | { readonly valid: false; readonly reason: string };
}
