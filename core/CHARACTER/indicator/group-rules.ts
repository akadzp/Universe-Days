import { ActorLevel } from '../actor';

export interface CharacterGroupRule {
  readonly required: boolean;
  readonly mutable: boolean;
}

/** Group availability is a classification rule, not a source of level truth. */
export function getCharacterGroupRule(level: ActorLevel): CharacterGroupRule {
  switch (level) {
    case ActorLevel.CORE:
      return { required: true, mutable: false };
    case ActorLevel.MAJOR:
      return { required: true, mutable: true };
    case ActorLevel.IMPACT:
    case ActorLevel.PERIPHERAL:
      return { required: false, mutable: false };
    case ActorLevel.ENTITY:
      return { required: true, mutable: true };
  }
}

export function canChangeCharacterGroup(level: ActorLevel): boolean {
  return getCharacterGroupRule(level).mutable;
}
