/**
 * Character Core / Sims System
 *
 * Stores character-profile information from the Pocer semantic specification.
 * This module does not invent missing character facts and does not own
 * state/location/relationship/speech-style domains.
 */

import { ActorDataSource } from './actor.ts';

export enum SocialTendency {
  INTROVERT = 'INTROVERT',
  AMBIVERT = 'AMBIVERT',
  EXTROVERT = 'EXTROVERT',
  UNKNOWN = 'UNKNOWN'
}

export interface CharacterProfile {
  readonly fullName?: string;
  readonly nickname?: string;
  readonly age?: number;
  readonly birthDate?: string;
  readonly zodiac?: string;
  readonly shio?: string;

  readonly distinctiveFeatures?: readonly string[];
  /** Appearance/clothing/impression style; speech style belongs to Style System. */
  readonly appearanceStyle?: string;

  readonly personalityType?: string;
  readonly mainTraits?: readonly string[];
  readonly flaws?: readonly string[];
  readonly habits?: readonly string[];
  readonly fears?: readonly string[];
  readonly values?: readonly string[];

  readonly occupation?: string;
  readonly hobbies?: readonly string[];
  readonly interests?: readonly string[];
  readonly skills?: readonly string[];
  readonly dailyPattern?: string;
  readonly socialTendency: SocialTendency;

  readonly openWounds?: readonly string[];
  readonly personalGoal?: string;
  readonly longTermAspiration?: string;
  readonly secrets?: readonly string[];
  readonly backstorySummary?: string;
  readonly notes?: string;

  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface CharacterProfileInput {
  readonly fullName?: string;
  readonly nickname?: string;
  readonly age?: number;
  readonly birthDate?: string;
  readonly zodiac?: string;
  readonly shio?: string;

  readonly distinctiveFeatures?: readonly string[];
  readonly appearanceStyle?: string;

  readonly personalityType?: string;
  readonly mainTraits?: readonly string[];
  readonly flaws?: readonly string[];
  readonly habits?: readonly string[];
  readonly fears?: readonly string[];
  readonly values?: readonly string[];

  readonly occupation?: string;
  readonly hobbies?: readonly string[];
  readonly interests?: readonly string[];
  readonly skills?: readonly string[];
  readonly dailyPattern?: string;
  readonly socialTendency?: SocialTendency;

  readonly openWounds?: readonly string[];
  readonly personalGoal?: string;
  readonly longTermAspiration?: string;
  readonly secrets?: readonly string[];
  readonly backstorySummary?: string;
  readonly notes?: string;

  readonly source?: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
}

export interface CharacterProfileValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterProfileValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterProfileValidationIssue[];
}

function issue(
  issues: CharacterProfileValidationIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function cloneList(values?: readonly string[]): readonly string[] | undefined {
  return values === undefined ? undefined : Object.freeze([...values]);
}

function trimOptional(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function authoritativeSourceIssues(source: ActorDataSource, operation: string): string[] {
  if (source === ActorDataSource.AI_PROPOSAL || source === ActorDataSource.UNKNOWN) {
    return [`${operation} cannot become authoritative from source "${source}".`];
  }
  return [];
}

export function validateCharacterProfile(profile: CharacterProfile): CharacterProfileValidationReport {
  const issues: CharacterProfileValidationIssue[] = [];

  if (!Object.values(SocialTendency).includes(profile.socialTendency)) {
    issue(
      issues,
      'INVALID_SOCIAL_TENDENCY',
      'socialTendency',
      `Unknown social tendency "${profile.socialTendency}".`
    );
  }

  if (profile.age !== undefined && (!Number.isInteger(profile.age) || profile.age < 0)) {
    issue(issues, 'INVALID_AGE', 'age', 'Age must be a non-negative integer when provided.');
  }

  if (
    profile.mainTraits !== undefined &&
    profile.source === ActorDataSource.USER_DEFINED &&
    (profile.mainTraits.length < 3 || profile.mainTraits.length > 5)
  ) {
    issue(
      issues,
      'INVALID_MAIN_TRAITS_COUNT',
      'mainTraits',
      'MAIN_TRAITS must contain 3–5 traits when the profile explicitly provides them.'
    );
  }

  for (const [field, fieldSource] of Object.entries(profile.fieldSources ?? {})) {
    if (fieldSource === ActorDataSource.AI_PROPOSAL) {
      issue(
        issues,
        'AI_PROPOSAL_NOT_AUTHORITATIVE',
        `fieldSources.${field}`,
        `Field source for "${field}" cannot be AI_PROPOSAL in authoritative Character Profile data.`
      );
    }
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function buildProfile(input: CharacterProfileInput, source: ActorDataSource): CharacterProfile {
  return Object.freeze({
    fullName: trimOptional(input.fullName),
    nickname: trimOptional(input.nickname),
    age: input.age,
    birthDate: trimOptional(input.birthDate),
    zodiac: trimOptional(input.zodiac),
    shio: trimOptional(input.shio),

    distinctiveFeatures: cloneList(input.distinctiveFeatures),
    appearanceStyle: trimOptional(input.appearanceStyle),

    personalityType: trimOptional(input.personalityType),
    mainTraits: cloneList(input.mainTraits),
    flaws: cloneList(input.flaws),
    habits: cloneList(input.habits),
    fears: cloneList(input.fears),
    values: cloneList(input.values),

    occupation: trimOptional(input.occupation),
    hobbies: cloneList(input.hobbies),
    interests: cloneList(input.interests),
    skills: cloneList(input.skills),
    dailyPattern: trimOptional(input.dailyPattern),
    socialTendency: input.socialTendency ?? SocialTendency.UNKNOWN,

    openWounds: cloneList(input.openWounds),
    personalGoal: trimOptional(input.personalGoal),
    longTermAspiration: trimOptional(input.longTermAspiration),
    secrets: cloneList(input.secrets),
    backstorySummary: trimOptional(input.backstorySummary),
    notes: trimOptional(input.notes),

    source,
    fieldSources: input.fieldSources ? Object.freeze({ ...input.fieldSources }) : undefined
  });
}

export class CharacterProfileLifecycle {
  public static createManual(input: CharacterProfileInput): CharacterProfile {
    const source = input.source ?? ActorDataSource.USER_DEFINED;
    const sourceIssues = authoritativeSourceIssues(source, 'Manual Character Profile creation');
    if (sourceIssues.length > 0) throw new Error(sourceIssues.join(' '));

    const profile = buildProfile(input, source);
    const validation = validateCharacterProfile(profile);
    if (!validation.valid) {
      throw new Error(validation.issues.map(value => value.message).join(' '));
    }
    return profile;
  }

  public static deriveFromStory(input: CharacterProfileInput): CharacterProfile {
    const profile = buildProfile(input, ActorDataSource.STORY_DERIVED);
    const validation = validateCharacterProfile(profile);
    if (!validation.valid) {
      throw new Error(validation.issues.map(value => value.message).join(' '));
    }
    return profile;
  }
}
