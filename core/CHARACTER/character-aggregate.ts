/**
 * Character Aggregate
 *
 * Composition boundary for Character-owned data and references.
 * It coordinates domains without becoming the owner of Behavior, Style,
 * State, Knowledge, Relationship, Level, or Group truth.
 */
import { CharacterEntity } from './character.ts';
import { ActorLevel, validateActorClassification } from './actor.ts';
import { BehaviorEntity } from './behavior.ts';
import { CharacterStyleEntity } from './character-style.ts';
import { CharacterStateEntity } from '../DOMAIN/STATE/character-state.ts';
import { EntityIdentityFactory } from '../SHARED/identity.ts';
import { CharacterIndicator, CharacterIndicators, CharacterIndicatorChange, CharacterIndicatorDefinition } from './indicator/indicator.ts';
import { changeIndicator, ChangeIndicatorInput, appendIndicatorChange } from './indicator/lifecycle.ts';
import { CHARACTER_INDICATOR_DEFINITIONS } from './indicator/registry.ts';
import { validateCharacterIndicatorEffect } from './indicator/effects.ts';
import { CharacterIndicatorEffect } from './indicator/indicator.ts';
import { RevisionHistoryManager } from '../SHARED/history.ts';
import { makeSystemID } from '../SHARED/identifiers.ts';

export interface CharacterAggregate {
  readonly character: CharacterEntity;
  readonly behaviors: Readonly<Record<string, BehaviorEntity>>;
  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;
  readonly state?: CharacterStateEntity;
}

export interface CharacterAggregateValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterAggregateValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterAggregateValidationIssue[];
}

export interface ApplyCharacterIndicatorEffectInput extends ChangeIndicatorInput {
  readonly effect: CharacterIndicatorEffect;
}

export interface CharacterAggregateMutationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly change?: CharacterIndicatorChange;
  readonly issues: readonly CharacterAggregateValidationIssue[];
}

function issue(code: string, path: string, message: string): CharacterAggregateValidationIssue {
  return { code, path, message };
}

function indicatorEntries(indicators: CharacterIndicators): Array<[string, CharacterIndicator]> {
  const groups = [indicators.personality, indicators.behavior, indicators.capability, indicators.motivation, indicators.social, indicators.condition];
  const entries: Array<[string, CharacterIndicator]> = [];
  for (const group of groups) {
    for (const [key, value] of Object.entries(group)) {
      if (value !== undefined) entries.push([key, value as CharacterIndicator]);
    }
  }
  return entries;
}

function findIndicator(indicators: CharacterIndicators, key: string): CharacterIndicator | undefined {
  return indicatorEntries(indicators).find(([entryKey]) => entryKey === key)?.[1];
}

function findDefinition(key: string): CharacterIndicatorDefinition | undefined {
  return CHARACTER_INDICATOR_DEFINITIONS.find(definition => definition.key === key);
}

function replaceIndicator(indicators: CharacterIndicators, key: string, next: CharacterIndicator): CharacterIndicators {
  const groups: Array<keyof Pick<CharacterIndicators, 'personality' | 'behavior' | 'capability' | 'motivation' | 'social' | 'condition'>> = [
    'personality', 'behavior', 'capability', 'motivation', 'social', 'condition'
  ];
  for (const groupName of groups) {
    const group = indicators[groupName] as Record<string, CharacterIndicator | undefined>;
    if (Object.prototype.hasOwnProperty.call(group, key)) {
      return Object.freeze({ ...indicators, [groupName]: Object.freeze({ ...group, [key]: next }) });
    }
  }
  return indicators;
}

export function validateCharacterAggregate(aggregate: CharacterAggregate): CharacterAggregateValidationReport {
  const issues: CharacterAggregateValidationIssue[] = [];
  const character = aggregate.character;
  const characterId = character.identity.id as string;

  if (!EntityIdentityFactory.isValidId(characterId)) {
    issues.push(issue('INVALID_CHARACTER_ID', 'character.identity.id', 'Character identity ID tidak valid.'));
  }

  if (character.actor) {
    const actorReport = validateActorClassification(character.actor);
    for (const actorIssue of actorReport.issues) {
      issues.push(issue(`ACTOR_${actorIssue.code}`, `character.actor.${actorIssue.path}`, actorIssue.message));
    }
  }

  for (const [id, behavior] of Object.entries(aggregate.behaviors)) {
    if (behavior.characterId !== characterId) {
      issues.push(issue('BEHAVIOR_CHARACTER_MISMATCH', `behaviors.${id}.characterId`, 'Behavior terhubung ke Character ID yang berbeda.'));
    }
    if (!(character.behaviorReferences ?? []).includes(id)) {
      issues.push(issue('BEHAVIOR_REFERENCE_MISSING', `behaviors.${id}`, 'Behavior entity tersedia tetapi tidak direferensikan oleh Character.'));
    }
  }

  for (const [id, style] of Object.entries(aggregate.styles)) {
    if (style.characterId !== characterId) {
      issues.push(issue('STYLE_CHARACTER_MISMATCH', `styles.${id}.characterId`, 'Style terhubung ke Character ID yang berbeda.'));
    }
    if (!(character.styleReferences ?? []).includes(id)) {
      issues.push(issue('STYLE_REFERENCE_MISSING', `styles.${id}`, 'Style entity tersedia tetapi tidak direferensikan oleh Character.'));
    }
  }

  if (aggregate.state) {
    if ((aggregate.state.entityRef as string) !== characterId) {
      issues.push(issue('STATE_CHARACTER_MISMATCH', 'state.entityRef', 'State terhubung ke Character ID yang berbeda.'));
    }
    if (character.stateReference !== aggregate.state.stateId) {
      issues.push(issue('STATE_REFERENCE_MISMATCH', 'character.stateReference', 'Character stateReference tidak menunjuk ke State entity yang diberikan.'));
    }
  }

  for (const ref of [
    ...(character.behaviorReferences ?? []),
    ...(character.styleReferences ?? []),
    ...character.roleReferences,
    ...character.knowledgeReferences,
    ...character.relationshipReferences
  ]) {
    if (!ref.trim()) issues.push(issue('EMPTY_REFERENCE', 'character.references', 'Character tidak boleh memiliki reference kosong.'));
  }

  if (character.indicators) {
    for (const [key, indicator] of indicatorEntries(character.indicators)) {
      const definition = findDefinition(key);
      if (!definition) {
        issues.push(issue('UNKNOWN_INDICATOR_DEFINITION', `character.indicators.${key}`, `Indicator '${key}' tidak memiliki registry definition.`));
      }
    }
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

export class CharacterAggregateLifecycle {
  public static applyIndicatorEffect(
    aggregate: CharacterAggregate,
    input: ApplyCharacterIndicatorEffectInput
  ): CharacterAggregateMutationResult {
    const effectReport = validateCharacterIndicatorEffect(input.effect);
    if (!effectReport.valid) {
      return Object.freeze({ valid: false, issues: Object.freeze(effectReport.issues.map(x => issue(x.code, x.path, x.message))) });
    }
    if (input.effect.characterId !== (aggregate.character.identity.id as string)) {
      return Object.freeze({ valid: false, issues: Object.freeze([issue('CHARACTER_ID_MISMATCH', 'effect.characterId', 'Effect tidak ditujukan kepada Character aggregate ini.')]) });
    }
    if (!aggregate.character.indicators) {
      return Object.freeze({ valid: false, issues: Object.freeze([issue('INDICATORS_MISSING', 'character.indicators', 'Character belum memiliki indicator layer.')]) });
    }

    const current = findIndicator(aggregate.character.indicators, input.effect.indicatorKey);
    const definition = findDefinition(input.effect.indicatorKey);
    if (!current || !definition) {
      return Object.freeze({ valid: false, issues: Object.freeze([issue('INDICATOR_NOT_FOUND', `character.indicators.${input.effect.indicatorKey}`, 'Target indicator tidak ditemukan pada Character Registry.')] ) });
    }

    const mutation = changeIndicator(current, definition, input);
    if (!mutation.valid || !mutation.indicator || !mutation.change) {
      return Object.freeze({ valid: false, issues: Object.freeze(mutation.issues.map(x => issue(x.code, `character.indicators.${input.effect.indicatorKey}`, x.message))) });
    }

    const nextIndicators = appendIndicatorChange(
      replaceIndicator(aggregate.character.indicators, input.effect.indicatorKey, mutation.indicator),
      mutation.change
    );
    const nextHistory = RevisionHistoryManager.appendRevision(
      aggregate.character.history,
      makeSystemID('CHARACTER_SYSTEM'),
      input.effectiveAt,
      ['indicators'],
      input.reason ?? `Indicator effect: ${input.effect.effectId}`
    );
    const nextCharacter: CharacterEntity = Object.freeze({
      ...aggregate.character,
      indicators: nextIndicators,
      history: nextHistory,
      provenance: Object.freeze({
        ...aggregate.character.provenance,
        revision: nextHistory.currentRevisionId
      })
    });
    const nextAggregate = Object.freeze({ ...aggregate, character: nextCharacter });
    const report = validateCharacterAggregate(nextAggregate);
    if (!report.valid) return Object.freeze({ valid: false, issues: report.issues });
    return Object.freeze({ valid: true, aggregate: nextAggregate, change: mutation.change, issues: Object.freeze([]) });
  }

  public static indicator(aggregate: CharacterAggregate, key: string): CharacterIndicator | undefined {
    return aggregate.character.indicators ? findIndicator(aggregate.character.indicators, key) : undefined;
  }
}

export const CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY: Readonly<Record<ActorLevel, { groupRequired: boolean; groupMutable: boolean }>> = Object.freeze({
  [ActorLevel.CORE]: Object.freeze({ groupRequired: true, groupMutable: false }),
  [ActorLevel.MAJOR]: Object.freeze({ groupRequired: true, groupMutable: true }),
  [ActorLevel.IMPACT]: Object.freeze({ groupRequired: false, groupMutable: false }),
  [ActorLevel.PERIPHERAL]: Object.freeze({ groupRequired: false, groupMutable: false }),
  [ActorLevel.ENTITY]: Object.freeze({ groupRequired: true, groupMutable: true })
});
