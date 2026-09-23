/**
 * Story/Event -> Character indicator effect boundary.
 *
 * Events and AI may propose effects, but proposals never mutate Character.
 * The resolver is pure: it calculates an effect from the event's base effect,
 * character disposition, and current condition. Authoritative mutation remains
 * the responsibility of indicator lifecycle + validation.
 */
import { ActorDataSource } from '../actor.ts';
import { CharacterIndicators, CharacterIndicatorEffect } from './indicator.ts';

export type CharacterIndicatorEffectProposalStatus = 'PROPOSED' | 'RESOLVED';

export interface CharacterIndicatorEffectProposal {
  readonly proposalId: string;
  readonly characterId: string;
  readonly indicatorKey: string;
  readonly triggerType: string;
  readonly triggerReference?: string;
  readonly baseOperation: 'SET' | 'INCREASE' | 'DECREASE' | 'TOGGLE';
  readonly baseValue: boolean | number | string;
  readonly dispositionFactor?: number;
  readonly conditionFactor?: number;
  readonly resolvedValue?: boolean | number | string;
  readonly ruleReference: string;
  readonly source: ActorDataSource;
  readonly status: CharacterIndicatorEffectProposalStatus;
  readonly reason?: string;
}

export interface ResolveCharacterIndicatorEffectInput {
  readonly proposal: CharacterIndicatorEffectProposal;
  readonly indicators: CharacterIndicators;
}

function clampFactor(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.max(0, value);
}

/**
 * Resolve a numeric INCREASE/DECREASE effect without mutating Character.
 * Factors are multiplicative: baseValue * dispositionFactor * conditionFactor.
 * Non-numeric operations are preserved and must be handled by their domain
 * rules rather than silently coerced.
 */
export function resolveCharacterIndicatorEffect(
  input: ResolveCharacterIndicatorEffectInput,
): CharacterIndicatorEffectProposal {
  const { proposal } = input;
  if (proposal.baseOperation !== 'INCREASE' && proposal.baseOperation !== 'DECREASE') {
    return Object.freeze({ ...proposal, status: 'RESOLVED' });
  }

  if (typeof proposal.baseValue !== 'number') {
    return Object.freeze({ ...proposal, status: 'RESOLVED' });
  }

  const factor = clampFactor(proposal.dispositionFactor) * clampFactor(proposal.conditionFactor);
  const resolvedValue = proposal.baseValue * factor;

  return Object.freeze({
    ...proposal,
    resolvedValue,
    status: 'RESOLVED',
  });
}

/**
 * Convert a resolved non-AI proposal into an effect consumable by lifecycle
 * validation. AI proposals intentionally remain proposals and cannot become
 * authoritative through this function.
 */
export function materializeCharacterIndicatorEffect(
  proposal: CharacterIndicatorEffectProposal,
): CharacterIndicatorEffect | undefined {
  if (proposal.status !== 'RESOLVED') return undefined;
  if (proposal.source === ActorDataSource.AI_PROPOSAL || proposal.source === ActorDataSource.UNKNOWN) return undefined;
  if (proposal.resolvedValue === undefined && proposal.baseValue === undefined) return undefined;

  return Object.freeze({
    effectId: proposal.proposalId,
    characterId: proposal.characterId,
    indicatorKey: proposal.indicatorKey,
    triggerType: proposal.triggerType,
    triggerReference: proposal.triggerReference,
    operation: proposal.baseOperation,
    value: proposal.resolvedValue ?? proposal.baseValue,
    ruleReference: proposal.ruleReference,
    source: proposal.source,
  });
}
