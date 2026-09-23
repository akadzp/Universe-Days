/**
 * Daily Story -> Character read boundary.
 *
 * Daily Story is a projection/production layer. This adapter assembles a
 * validated Character context for story production without redefining canon.
 */
import { CharacterAggregate } from '../CHARACTER/character-aggregate.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import { StoryProductionPackage } from './orchestrator.ts';

export interface DailyStoryCharacterContext {
  readonly storyId: string;
  readonly characterId: string;
  readonly eventId?: string;
  readonly character: CharacterAggregate;
  readonly canonReadOnly: true;
}

export function buildDailyStoryCharacterContext(input: {
  readonly story: StoryProductionPackage;
  readonly character: CharacterAggregate;
  readonly event?: EventEntity;
}): DailyStoryCharacterContext {
  const characterId = input.character.character.identity.id as string;
  if (input.event && !input.event.participantRefs.some(ref => (ref as string) === characterId)) {
    throw new Error('Character bukan participant Event yang diberikan kepada Daily Story context.');
  }
  return Object.freeze({
    storyId: input.story.storyId,
    characterId,
    eventId: input.event?.eventId,
    character: input.character,
    canonReadOnly: true
  });
}
