/**
 * Phase 4: Continuity Transition Models.
 * Defines generic transition types and payloads without domain-specific interpretation.
 */

import { ConditionReference } from '../../UNIVERSE/CONTINUITY/condition-reference.ts';
import { ContinuityIdentity, EffectiveTime } from '../../UNIVERSE/CONTINUITY/continuity-model.ts';
import { ContinuityDependency } from '../../UNIVERSE/CONTINUITY/dependency.ts';

export enum TransitionType {
  CONTINUE = 'CONTINUE',
  CHANGE = 'CHANGE',
  END = 'END',
  SUSPEND = 'SUSPEND',
  RESUME = 'RESUME',
  TRANSFORM = 'TRANSFORM',
  REPLACE = 'REPLACE',
  NEW = 'NEW',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN'
}

export interface Transition {
  transitionId?: string;
  type: TransitionType;
  continuityId: string;
  previousConditionRef?: ConditionReference | null;
  currentConditionRef?: ConditionReference | null;
  effectiveTime: EffectiveTime;
  sourceReference?: string;
  terminationBasis?: string;
  predecessorIdentity?: ContinuityIdentity;
  replacementIdentity?: ContinuityIdentity;
  dependencies?: ContinuityDependency[];
  metadata?: Record<string, unknown>;
}
