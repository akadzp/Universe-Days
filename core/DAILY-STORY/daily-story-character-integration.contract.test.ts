import { buildDailyStoryCharacterContext } from './daily-story-character-integration.ts';
export const DAILY_STORY_CHARACTER_CONTRACTS = Object.freeze([
  'Daily Story reads Character canon rather than redefining it',
  'Character must be an explicit Event participant when an Event is supplied',
  'Daily Story context is read-only with respect to Character canon'
]);
void buildDailyStoryCharacterContext;
