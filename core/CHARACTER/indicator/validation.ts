/** Validates indicator shape against the registry; it does not mutate Character. */
import { CharacterIndicator, CharacterIndicatorDefinition, ContinuousIndicator, OrdinalIndicator } from './indicator.ts';

export interface CharacterIndicatorValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
export interface CharacterIndicatorValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterIndicatorValidationIssue[];
}

function issue(issues: CharacterIndicatorValidationIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

export function validateCharacterIndicator(
  indicator: CharacterIndicator,
  definition: CharacterIndicatorDefinition
): CharacterIndicatorValidationReport {
  const issues: CharacterIndicatorValidationIssue[] = [];
  if (indicator.key !== definition.key) issue(issues, 'INDICATOR_KEY_MISMATCH', 'key', 'Indicator key does not match registry definition.');
  if (indicator.type !== definition.type) issue(issues, 'INDICATOR_TYPE_MISMATCH', 'type', 'Indicator type does not match registry definition.');
  if (indicator.persistence !== definition.persistence) issue(issues, 'INDICATOR_PERSISTENCE_MISMATCH', 'persistence', 'Indicator persistence does not match registry definition.');
  if (indicator.mutable !== definition.mutable) issue(issues, 'INDICATOR_MUTABILITY_MISMATCH', 'mutable', 'Indicator mutability does not match registry definition.');

  if (indicator.type === 'CONTINUOUS') {
    const value = indicator as ContinuousIndicator;
    if (value.current < value.range.min || value.current > value.range.max) issue(issues, 'CONTINUOUS_VALUE_OUT_OF_RANGE', 'current', 'Current value is outside configured range.');
    if (value.baseline !== undefined && (value.baseline < value.range.min || value.baseline > value.range.max)) issue(issues, 'CONTINUOUS_BASELINE_OUT_OF_RANGE', 'baseline', 'Baseline is outside configured range.');
  }
  if (indicator.type === 'ORDINAL') {
    const value = indicator as OrdinalIndicator;
    if (!value.scale.includes(value.current)) issue(issues, 'ORDINAL_VALUE_NOT_IN_SCALE', 'current', 'Current value is not present in the ordinal scale.');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}
