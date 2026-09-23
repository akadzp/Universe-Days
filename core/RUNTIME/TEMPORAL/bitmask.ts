/**
 * Temporal Engine Bitmask Integration.
 * Defines bit flags for temporal state validation:
 * TIME_VALID (bit 0)
 * ORDER_VALID (bit 1)
 * POSITION_RESOLVED (bit 2)
 * HAS_CONFLICT (bit 3)
 */

import { BitmaskRegistry, BitmaskSet } from '../ENGINE/state/bitmask.ts';

export const TEMPORAL_BIT_NAMES = {
  TIME_VALID: 'TIME_VALID',
  ORDER_VALID: 'ORDER_VALID',
  POSITION_RESOLVED: 'POSITION_RESOLVED',
  HAS_CONFLICT: 'HAS_CONFLICT'
} as const;

export function createTemporalBitmaskRegistry(): BitmaskRegistry {
  const registry = new BitmaskRegistry();
  registry.declareBit(TEMPORAL_BIT_NAMES.TIME_VALID, 0, 'Temporal coordinate is valid Gregorian calendar time');
  registry.declareBit(TEMPORAL_BIT_NAMES.ORDER_VALID, 1, 'Temporal ordering is verified without unknown gaps');
  registry.declareBit(TEMPORAL_BIT_NAMES.POSITION_RESOLVED, 2, 'Temporal position (PAST/PRESENT/FUTURE) is resolved');
  registry.declareBit(TEMPORAL_BIT_NAMES.HAS_CONFLICT, 3, 'Contradiction or cyclic dependency detected');
  return registry;
}

export function createTemporalBitmaskSet(registry?: BitmaskRegistry): BitmaskSet {
  const reg = registry || createTemporalBitmaskRegistry();
  return new BitmaskSet(reg);
}
