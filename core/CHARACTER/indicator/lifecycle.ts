/**
 * Character Indicator Lifecycle
 *
 * Pure, explicit lifecycle operations for current values, baselines, and history.
 * This module does not mutate Profile, Behavior, Style, State, Level, or Group.
 * Callers supply effective/recorded timestamps; the lifecycle never uses Date.now().
 */
import { ActorDataSource } from '../actor.ts';
import {
  CharacterIndicator,
  CharacterIndicatorChange,
  ContinuousIndicator,
  CharacterIndicators,
  CharacterIndicatorDefinition,
} from './indicator.ts';
import { validateCharacterIndicator } from './validation.ts';

export interface CharacterIndicatorLifecycleIssue {
  readonly code: string;
  readonly message: string;
}

export interface CharacterIndicatorMutationResult<T extends CharacterIndicator = CharacterIndicator> {
  readonly valid: boolean;
  readonly indicator?: T;
  readonly change?: CharacterIndicatorChange;
  readonly issues: readonly CharacterIndicatorLifecycleIssue[];
}

function invalid<T extends CharacterIndicator>(...issues: CharacterIndicatorLifecycleIssue[]): CharacterIndicatorMutationResult<T> {
  return Object.freeze({ valid: false, issues: Object.freeze(issues) });
}

function valid<T extends CharacterIndicator>(indicator: T, change: CharacterIndicatorChange): CharacterIndicatorMutationResult<T> {
  return Object.freeze({ valid: true, indicator, change, issues: Object.freeze([]) });
}

function sameValue(a: unknown, b: unknown): boolean {
  return a === b;
}

function nextValue(indicator: CharacterIndicator, operation: 'SET' | 'INCREASE' | 'DECREASE' | 'TOGGLE', value: boolean | number | string): unknown {
  if (operation === 'SET') return value;
  if (operation === 'TOGGLE' && indicator.type === 'BOOLEAN') return !indicator.current;
  if ((operation === 'INCREASE' || operation === 'DECREASE') && indicator.type === 'CONTINUOUS' && typeof value === 'number') {
    return operation === 'INCREASE' ? indicator.current + value : indicator.current - value;
  }
  return undefined;
}

function buildChange(
  indicator: CharacterIndicator,
  next: unknown,
  triggerType: string,
  triggerReference: string | undefined,
  reason: string | undefined,
  effectiveAt: string,
  recordedAt: string,
  source: ActorDataSource,
  provenance: CharacterIndicatorChange['provenance'],
  changeId: string,
): CharacterIndicatorChange {
  return Object.freeze({
    changeId,
    indicatorId: indicator.indicatorId,
    previousValue: indicator.current,
    nextValue: next,
    triggerType,
    triggerReference,
    reason,
    effectiveAt,
    recordedAt,
    source,
    provenance,
  });
}

export interface ChangeIndicatorInput {
  readonly operation: 'SET' | 'INCREASE' | 'DECREASE' | 'TOGGLE';
  readonly value: boolean | number | string;
  readonly triggerType: string;
  readonly triggerReference?: string;
  readonly reason?: string;
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly changeId: string;
  readonly source: ActorDataSource;
  readonly provenance: CharacterIndicatorChange['provenance'];
}

/** Change current value. Baseline is intentionally untouched. */
export function changeIndicator(
  indicator: CharacterIndicator,
  definition: CharacterIndicatorDefinition,
  input: ChangeIndicatorInput,
): CharacterIndicatorMutationResult {
  const validation = validateCharacterIndicator(indicator, definition);
  if (!validation.valid) return invalid({ code: 'INVALID_INDICATOR', message: 'Indicator must be valid before lifecycle mutation.' });
  if (!indicator.mutable || indicator.persistence === 'PERSISTENT' || indicator.persistence === 'DERIVED') {
    return invalid({ code: 'INDICATOR_NOT_MUTABLE', message: `Indicator persistence "${indicator.persistence}" does not permit current-value mutation.` });
  }
  const next = nextValue(indicator, input.operation, input.value);
  if (next === undefined) return invalid({ code: 'INVALID_OPERATION', message: 'Operation is incompatible with indicator type or value.' });
  if (indicator.type === 'BOOLEAN' && typeof next !== 'boolean') return invalid({ code: 'INVALID_BOOLEAN_VALUE', message: 'Boolean indicator requires a boolean value.' });
  if (indicator.type === 'ORDINAL' && (typeof next !== 'string' || !indicator.scale.includes(next))) return invalid({ code: 'INVALID_ORDINAL_VALUE', message: 'Ordinal indicator value must exist in its scale.' });
  if (indicator.type === 'CONTINUOUS' && typeof next !== 'number') return invalid({ code: 'INVALID_CONTINUOUS_VALUE', message: 'Continuous indicator requires a numeric value.' });
  if (indicator.type === 'CONTINUOUS') {
    const c = indicator as ContinuousIndicator;
    if (typeof next !== 'number') return invalid({ code: 'INVALID_CONTINUOUS_VALUE', message: 'Continuous indicator requires a numeric value.' });
    if (next < c.range.min || next > c.range.max) return invalid({ code: 'CONTINUOUS_VALUE_OUT_OF_RANGE', message: 'Next continuous value is outside the configured range.' });
  }
  if (indicator.type === 'CATEGORICAL' && typeof next !== 'string') return invalid({ code: 'INVALID_CATEGORICAL_VALUE', message: 'Categorical indicator requires a string value.' });
  if (indicator.type === 'REFERENCE' && typeof next !== 'string') return invalid({ code: 'INVALID_REFERENCE_VALUE', message: 'Reference indicator requires a string reference.' });
  if (sameValue(indicator.current, next)) return invalid({ code: 'NO_CHANGE', message: 'Mutation does not change the indicator current value.' });

  const changed = Object.freeze({ ...indicator, current: next });
  const change = buildChange(indicator, next, input.triggerType, input.triggerReference, input.reason, input.effectiveAt, input.recordedAt, input.source, input.provenance, input.changeId);
  return valid(changed as CharacterIndicator, change);
}

export interface EvolveBaselineInput {
  readonly baseline: number;
  readonly triggerType: string;
  readonly triggerReference?: string;
  readonly reason?: string;
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly changeId: string;
  readonly source: ActorDataSource;
  readonly provenance: CharacterIndicatorChange['provenance'];
}

/** Evolve baseline only for continuous EVOLVING indicators. Current value is preserved. */
export function evolveContinuousBaseline(
  indicator: ContinuousIndicator,
  definition: CharacterIndicatorDefinition,
  input: EvolveBaselineInput,
): CharacterIndicatorMutationResult<ContinuousIndicator> {
  const validation = validateCharacterIndicator(indicator, definition);
  if (!validation.valid) return invalid({ code: 'INVALID_INDICATOR', message: 'Indicator must be valid before baseline evolution.' });
  if (indicator.type !== 'CONTINUOUS' || indicator.persistence !== 'EVOLVING') return invalid({ code: 'BASELINE_NOT_EVOLVING', message: 'Only continuous EVOLVING indicators may evolve their baseline.' });
  if (!indicator.mutable) return invalid({ code: 'INDICATOR_NOT_MUTABLE', message: 'Indicator is immutable.' });
  if (input.baseline < indicator.range.min || input.baseline > indicator.range.max) return invalid({ code: 'BASELINE_OUT_OF_RANGE', message: 'Baseline is outside the configured range.' });
  if (indicator.baseline === input.baseline) return invalid({ code: 'NO_CHANGE', message: 'Baseline evolution does not change the baseline.' });

  const changed = Object.freeze({ ...indicator, baseline: input.baseline });
  const change = Object.freeze({
    changeId: input.changeId,
    indicatorId: indicator.indicatorId,
    previousValue: indicator.baseline,
    nextValue: input.baseline,
    triggerType: input.triggerType,
    triggerReference: input.triggerReference,
    reason: input.reason,
    effectiveAt: input.effectiveAt,
    recordedAt: input.recordedAt,
    source: input.source,
    provenance: input.provenance,
  });
  return valid(changed, change);
}

/** Append a validated change to the Character indicator history. */
export function appendIndicatorChange(
  indicators: CharacterIndicators,
  change: CharacterIndicatorChange,
): CharacterIndicators {
  return Object.freeze({ ...indicators, history: Object.freeze([...indicators.history, change]) });
}
