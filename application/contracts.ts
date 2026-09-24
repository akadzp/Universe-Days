import type { SystemID } from '../core/SHARED/identifiers.ts';
import type { CharacterEntity } from '../core/CHARACTER/character.ts';
import type { CharacterIndicatorEffect } from '../core/CHARACTER/indicator/indicator.ts';
import type { ActorDataSource } from '../core/CHARACTER/actor.ts';

export type ApplicationRole =
  | 'SYSTEM'
  | 'AUTHOR'
  | 'PLAYER'
  | 'AI_AGENT'
  | 'OBSERVER';

export interface ActorContext {
  readonly actorId: SystemID;
  readonly role: ApplicationRole;
  readonly requestTimestamp: number;
  readonly correlationId?: string;
}

export interface ApplicationCommand<TPayload = unknown> {
  readonly commandId: string;
  readonly commandType: string;
  readonly actor: ActorContext;
  readonly universeId: string;
  readonly universeTime: string;
  readonly payload: TPayload;
  readonly idempotencyKey?: string;
}

export interface CommandResult<T = unknown> {
  readonly success: boolean;
  readonly status: string;
  readonly executionId?: string;
  readonly data?: T;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface CreateCharacterPayload {
  readonly character: CharacterEntity;
}

export interface ApplyCharacterIndicatorEffectPayload {
  readonly effect: CharacterIndicatorEffect;
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly changeId: string;
  readonly provenance: CharacterIndicatorEffectProvenance;
}

export interface CharacterIndicatorEffectProvenance {
  readonly source: ActorDataSource;
  readonly ruleReference: string;
}

export interface ProposeCharacterResponsePayload {
  readonly characterId: string;
  readonly eventId?: string;
  readonly instruction: string;
}

export interface UniverseSummaryDTO {
  readonly universeId: string;
  readonly universeDate: string;
  readonly universeTime: string;
  readonly periodRef?: string;
  readonly characterCount: number;
  readonly eventCount: number;
  readonly unresolvedCount: number;
}

export interface CharacterSummaryDTO {
  readonly id: string;
  readonly name?: string;
  readonly roleReferences: readonly string[];
  readonly stateReference?: string;
  readonly knowledgeReferences: readonly string[];
  readonly relationshipReferences: readonly string[];
  readonly locationReference?: string;
  readonly temporalValidity: CharacterEntity['temporalValidity'];
  readonly indicatorKeys: readonly string[];
}

export interface DailyCycleStatusDTO {
  readonly universeDate: string;
  readonly universeTime: string;
  readonly periodRef?: string;
  readonly periodLifecycleState?: string;
  readonly periodSequence?: number;
  readonly unresolvedCount: number;
  readonly activeProcessCount: number;
}

