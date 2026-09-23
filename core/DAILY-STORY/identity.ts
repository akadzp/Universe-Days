/**
 * Phase 6: Deterministic Story ID.
 * Generates and validates immutable, deterministic Story IDs.
 * Story IDs must NOT depend on randomness, model output, or story titles.
 */

import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { StoryTrigger } from './trigger.ts';
import { StoryDateInfo } from './date.ts';
import { StoryScope } from './scope.ts';

/**
 * Deterministic 32-bit FNV-1a hash function for strings.
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export class StoryIdGenerator {
  /**
   * Generates a stable, deterministic Story ID.
   * Format: STORY_<UNIVERSE_SCOPE>_<YYYYMMDD>_<TRIGGER_TYPE>_<HASH>
   */
  public static generate(
    universeScope: string,
    storyDate: StoryDateInfo,
    trigger: StoryTrigger,
    scope?: StoryScope
  ): string {
    const cleanScope = universeScope.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
    const cleanDate = storyDate.storyDate.replace(/-/g, '');
    const triggerType = trigger.type;

    // Stable hash based on trigger source, trigger ID, and scope items
    const hashPayload = [
      universeScope,
      storyDate.storyDate,
      trigger.triggerId,
      trigger.sourceReference,
      trigger.type,
      scope?.primaryContext ?? '',
      (scope?.relevantEventIds ?? []).sort().join(','),
      (scope?.relevantProcessIds ?? []).sort().join(',')
    ].join('::');

    const hash = fnv1aHash(hashPayload);

    return `STORY_${cleanScope}_${cleanDate}_${triggerType}_${hash}`;
  }

  /**
   * Validates that a story ID conforms to the canonical deterministic structure.
   */
  public static validate(storyId: string): Result<boolean> {
    if (!storyId || typeof storyId !== 'string') {
      return failure(
        EngineErrorCode.INVALID_STORY_ID,
        'Story ID must be a non-empty string'
      );
    }

    // Regex: STORY_<SCOPE>_<YYYYMMDD>_<TRIGGER_TYPE>_<8-HEX-HASH>
    const match = storyId.match(/^STORY_(.+)_\d{8}_[A-Z0-9_]+_[A-F0-9]{8}$/);
    if (!match) {
      return failure(
        EngineErrorCode.INVALID_STORY_ID,
        `Story ID "${storyId}" does not match canonical pattern STORY_<SCOPE>_<YYYYMMDD>_<TRIGGER>_<HASH>`
      );
    }

    return success(true);
  }
}
