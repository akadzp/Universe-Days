/**
 * Phase 7: State Domain Integration Contract
 *
 * Authoritative Owner: STATE_SYSTEM
 * Domain ID: STATE
 *
 * Defines abstract integration contracts for reading universe state vectors,
 * previous state historical references, and requesting state machine transitions.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const STATE_DOMAIN_ID: DomainID = makeDomainID('STATE');
export const STATE_OWNER_ID: SystemID = makeSystemID('STATE_SYSTEM');

export enum StateOperation {
  GET_CURRENT_STATE = 'GET_CURRENT_STATE',
  GET_PREVIOUS_STATE_REF = 'GET_PREVIOUS_STATE_REF',
  REQUEST_TRANSITION = 'REQUEST_TRANSITION',
  EVALUATE_STATE_VECTOR = 'EVALUATE_STATE_VECTOR'
}

export interface StateVectorRef {
  stateId: string;
  currentState: string;
  previousState?: string;
  stateVersion: number;
  lastTransitionTime: string;
  activeFlags: string[];
  metrics: Record<string, number | string | boolean>;
}

export interface StatePreviousRef {
  stateId: string;
  previousState: string;
  transitionTime: string;
  triggerEventRef?: string;
  continuityChainId?: string;
}

export interface StateTransitionPayload {
  stateId: string;
  targetState: string;
  expectedCurrentState?: string;
  guardConditions?: string[];
  transitionReason: string;
  metadata?: Record<string, unknown>;
}

export type StateQueryRequest = DomainQueryRequest<{
  stateId?: string;
  includeHistory?: boolean;
}>;

export type StateQueryResult = DomainQueryResult<
  StateVectorRef | StatePreviousRef | StateVectorRef[]
>;

export type StateChangeRequest = DomainChangeRequest<StateTransitionPayload>;
export type StateChangeResult = DomainChangeResult<StateVectorRef>;
