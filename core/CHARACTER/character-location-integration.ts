/**
 * Location -> Event -> Character integration boundary.
 *
 * Location remains authoritative in DOMAIN/LOCATION. Character stores only a
 * location reference. This boundary never infers movement from mere presence
 * in an Event or from Event.locationRef alone; the movement must be explicit.
 */
import { CharacterEntity } from './character.ts';
import { CharacterAggregate, validateCharacterAggregate } from './character-aggregate.ts';
import { LocationEntity } from '../DOMAIN/LOCATION/location.ts';
import { EventEntity } from '../UNIVERSE/CANON/event.ts';
import { RevisionHistoryManager } from '../SHARED/history.ts';
import { makeSystemID } from '../SHARED/identifiers.ts';

export interface EventCharacterLocationChange {
  readonly characterId: string;
  readonly location: LocationEntity;
  readonly explicitMovementBasis: string;
  readonly effectiveFrom?: string;
}

export interface CharacterLocationIntegrationResult {
  readonly valid: boolean;
  readonly aggregate?: CharacterAggregate;
  readonly issues: readonly string[];
}

function participantMatches(event: EventEntity, characterId: string): boolean {
  return event.participantRefs.some(ref => (ref as string) === characterId);
}

export function integrateEventLocationWithCharacter(input: {
  readonly event: EventEntity;
  readonly aggregate: CharacterAggregate;
  readonly locationChange: EventCharacterLocationChange;
  readonly recordedAt: string;
}): CharacterLocationIntegrationResult {
  const characterId = input.aggregate.character.identity.id as string;
  const change = input.locationChange;
  if (change.characterId !== characterId) return Object.freeze({ valid: false, issues: Object.freeze(['Location change bukan milik Character aggregate ini.']) });
  if (!participantMatches(input.event, characterId)) return Object.freeze({ valid: false, issues: Object.freeze(['Event tidak mencantumkan Character sebagai participant.']) });
  if (input.event.status !== 'RESOLVED') return Object.freeze({ valid: false, issues: Object.freeze(['Location Character tidak boleh diaktualisasikan dari Event yang belum RESOLVED.']) });
  if (!change.explicitMovementBasis.trim()) return Object.freeze({ valid: false, issues: Object.freeze(['Perubahan lokasi Character wajib memiliki explicitMovementBasis.']) });
  if (change.location.identity.id !== input.event.locationRef) return Object.freeze({ valid: false, issues: Object.freeze(['Location change harus menunjuk ke Event.locationRef.']) });

  const effectiveFrom = change.effectiveFrom ?? input.event.temporalInterval.start;
  if (effectiveFrom !== input.event.temporalInterval.start) return Object.freeze({ valid: false, issues: Object.freeze(['Location change effectiveFrom harus sama dengan waktu efektif Event.']) });
  if (change.location.temporalValidity.effectiveTo && effectiveFrom > change.location.temporalValidity.effectiveTo) return Object.freeze({ valid: false, issues: Object.freeze(['Character tidak dapat ditempatkan pada Location setelah temporal validity Location berakhir.']) });

  const character: CharacterEntity = Object.freeze({
    ...input.aggregate.character,
    locationReference: change.location.identity.id,
    history: RevisionHistoryManager.appendRevision(
      input.aggregate.character.history,
      makeSystemID('CHARACTER_SYSTEM'),
      effectiveFrom,
      ['locationReference'],
      `Event ${input.event.eventId}: ${change.explicitMovementBasis}`
    )
  });
  const next = Object.freeze({ ...input.aggregate, character });
  const report = validateCharacterAggregate(next);
  if (!report.valid) return Object.freeze({ valid: false, issues: Object.freeze(report.issues.map(x => x.message)) });
  return Object.freeze({ valid: true, aggregate: next, issues: Object.freeze([]) });
}
