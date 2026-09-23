/** Validates proposed Character indicator effects before authoritative mutation. */
import { ActorDataSource } from '../actor.ts';
import { CharacterIndicatorEffect } from './indicator.ts';

export interface CharacterIndicatorEffectValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
export interface CharacterIndicatorEffectValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterIndicatorEffectValidationIssue[];
}

export function validateCharacterIndicatorEffect(effect: CharacterIndicatorEffect): CharacterIndicatorEffectValidationReport {
  const issues: CharacterIndicatorEffectValidationIssue[] = [];
  const required: Array<[string, string, string]> = [
    ['effectId', effect.effectId, 'MISSING_EFFECT_ID'],
    ['characterId', effect.characterId, 'MISSING_CHARACTER_ID'],
    ['indicatorKey', effect.indicatorKey, 'MISSING_INDICATOR_KEY'],
    ['ruleReference', effect.ruleReference, 'MISSING_RULE_REFERENCE'],
    ['triggerType', effect.triggerType, 'MISSING_TRIGGER_TYPE']
  ];
  for (const [path, value, code] of required) {
    if (!value.trim()) issues.push({ code, path, message: `${path} is required.` });
  }
  if (effect.source === ActorDataSource.AI_PROPOSAL || effect.source === ActorDataSource.UNKNOWN) {
    issues.push({
      code: 'NON_AUTHORITATIVE_EFFECT_SOURCE', path: 'source',
      message: `Indicator effects cannot become authoritative from source "${effect.source}".`
    });
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}
