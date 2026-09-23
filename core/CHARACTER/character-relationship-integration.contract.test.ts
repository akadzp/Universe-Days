import { integrateEventRelationshipWithCharacter } from './character-relationship-integration.ts';

/** Contract cases intentionally avoid a test-runner dependency. */
export const CHARACTER_RELATIONSHIP_CONTRACTS = Object.freeze([
  'resolved Event may bind an authoritative Relationship to its Character endpoint',
  'unresolved Event is rejected',
  'AI_PROPOSAL/UNKNOWN Relationship source is rejected',
  'Group/co-occurrence is never sufficient relationship evidence',
  'relationship endpoint must match the Character participant',
  'effective time is taken from Event time'
]);

void integrateEventRelationshipWithCharacter;
