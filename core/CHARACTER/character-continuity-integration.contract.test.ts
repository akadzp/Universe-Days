import { bindCharacterContinuity, buildCharacterContinuityTransition } from './character-continuity-integration.ts';
export const CHARACTER_CONTINUITY_CONTRACTS = Object.freeze([
  'Character identity is stable and bound explicitly to ContinuityIdentity',
  'continuity domain must be CHARACTER',
  'continuity does not copy or redefine Character domain truth',
  'transitions require explicit effective time and source event',
  'unknown/missing conditions are preserved rather than invented'
]);
void bindCharacterContinuity; void buildCharacterContinuityTransition;
