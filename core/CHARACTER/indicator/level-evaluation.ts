import { ActorLevel } from '../actor';

/** Evidence about a character's narrative impact. Frequency alone is never sufficient. */
export interface CharacterStoryImpactEvidence {
  readonly centralToStoryArc: boolean;
  readonly changesMajorDecision: boolean;
  readonly causesMajorConsequence: boolean;
  readonly recurringNarrativeImportance: boolean;
  readonly rareButSignificantAppearance: boolean;
}

export interface CharacterLevelEvidence {
  readonly evidence: CharacterStoryImpactEvidence;
  /** True only when the character is an entity/non-human actor under the existing classification. */
  readonly isEntity: boolean;
}

export interface CharacterLevelEvaluation {
  readonly level: ActorLevel | null;
  readonly reason: string;
}

/**
 * Evaluates story-impact classification without using frequency, personality, indicators,
 * group membership, or gender as a level score.
 *
 * The evaluator intentionally returns null when evidence is insufficient. Callers must
 * validate and decide whether a level transition is canonically permitted.
 */
export function evaluateCharacterLevel(input: CharacterLevelEvidence): CharacterLevelEvaluation {
  if (input.isEntity) {
    return { level: ActorLevel.ENTITY, reason: 'ENTITY classification is explicit.' };
  }

  const { evidence } = input;

  if (evidence.centralToStoryArc) {
    return { level: ActorLevel.CORE, reason: 'Character is central to the story arc.' };
  }

  if (
    evidence.changesMajorDecision ||
    evidence.causesMajorConsequence ||
    evidence.recurringNarrativeImportance
  ) {
    return { level: ActorLevel.MAJOR, reason: 'Character has substantial narrative impact below CORE.' };
  }

  if (evidence.rareButSignificantAppearance) {
    return { level: ActorLevel.IMPACT, reason: 'Rare appearance has meaningful story impact.' };
  }

  return {
    level: ActorLevel.PERIPHERAL,
    reason: 'No sufficient evidence of meaningful story-arc impact.',
  };
}
