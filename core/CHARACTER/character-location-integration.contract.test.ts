import { integrateEventLocationWithCharacter } from './character-location-integration.ts';
export const CHARACTER_LOCATION_CONTRACTS = Object.freeze([
  'location remains domain-owned and Character stores only a reference',
  'movement requires explicit evidence',
  'unresolved Event cannot update Character location',
  'Event location and effective time must match the explicit movement',
  'no movement is inferred from co-occurrence alone'
]);
void integrateEventLocationWithCharacter;
