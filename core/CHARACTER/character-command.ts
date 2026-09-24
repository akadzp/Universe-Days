/**
 * Explicit Character command/materialization boundary.
 *
 * This service is intentionally a pure Character-domain materializer.
 * It does not persist or remount Universe state. Canonical persistence
 * belongs exclusively to the runtime TransactionBoundary.
 */
import type { MountedUniverse } from '../INFRA/INSTANCE/authority.ts';
import type { CharacterEntity } from './character.ts';
import {
  ActorDataSource, ActorEntityType, ActorGender, ActorLevel, ActorLifecycle
} from './actor.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';

export interface CreateCharacterCommandInput {
  readonly id: string;
  readonly displayName: string;
  readonly role?: string;
  readonly locationRef?: string | null;
  readonly effectiveTime: string;
}

function normalizeId(id: string): string {
  const clean = String(id).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return clean.startsWith('CHAR_') ? clean : `CHAR_${clean}`;
}

export class CharacterCommandService {
  public static createCharacter(
    mounted: MountedUniverse,
    input: CreateCharacterCommandInput
  ): CharacterEntity {
    if (!input.id.trim() || !input.displayName.trim()) {
      throw new Error('Character command requires id and displayName.');
    }
    if (!input.effectiveTime.trim()) {
      throw new Error('Character command requires explicit effectiveTime.');
    }

    const id = normalizeId(input.id);
    if (mounted.universe.characters[id]) {
      throw new Error(`Character with id '${id}' already exists.`);
    }

    const actor = ActorLifecycle.createManual({
      actorId: id,
      displayName: input.displayName.trim(),
      gender: ActorGender.UNKNOWN,
      level: ActorLevel.PERIPHERAL,
      entityType: ActorEntityType.UNKNOWN,
      roleReferences: input.role ? [input.role] : [],
      effectiveFrom: input.effectiveTime,
      source: ActorDataSource.USER_DEFINED
    });

    if (actor.result !== 'ACCEPTED' || !actor.data) {
      throw new Error(actor.reasons.join(' ') || 'Character creation rejected.');
    }

    const a = actor.data;
    return Object.freeze({
      identity: a.identity,
      actor: a.classification,
      roleReferences: Object.freeze(input.role ? [input.role] : []),
      knowledgeReferences: Object.freeze([]),
      relationshipReferences: Object.freeze([]),
      locationReference: input.locationRef ?? undefined,
      temporalValidity: Object.freeze({
        effectiveFrom: input.effectiveTime,
        temporalCategory: TemporalStatus.ACTUAL
      }),
      history: a.history,
      provenance: a.provenance
    });
  }
}
