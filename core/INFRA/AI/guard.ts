/** Phase 26 — proposal-only authority guard. */

import type { AIProposal, AIProposalGuard } from '../../INFRA/AI/types.ts';

const FORBIDDEN_KEYS = new Set([
  'mutateCanon',
  'mutation',
  'storagePath',
  'filesystemPath',
  'permissionGrant',
  'ownerOverride',
  'authorizationOverride',
  'directPersistence',
  'applyTransition',
  'deterministicId',
  'transactionId'
]);

function findForbidden(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findForbidden(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
    const found = findForbidden(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

export class DefaultAIProposalGuard implements AIProposalGuard {
  public validate<T>(proposal: AIProposal<T>) {
    if (!proposal.proposalId || !proposal.request.requestId) {
      return { valid: false as const, reason: 'Proposal identity is missing.' };
    }
    if (proposal.status !== 'PROPOSED') {
      return { valid: false as const, reason: 'Only PROPOSED outputs may cross the proposal boundary.' };
    }
    if (!proposal.response) {
      return { valid: false as const, reason: 'AI response is missing.' };
    }

    const forbidden = findForbidden(proposal.response.parsed);
    if (forbidden) {
      return {
        valid: false as const,
        reason: `AI output attempted to cross an authority boundary at ${forbidden}.`
      };
    }

    return { valid: true as const };
  }
}
