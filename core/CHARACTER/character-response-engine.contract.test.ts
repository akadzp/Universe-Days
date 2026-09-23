import { proposeCharacterResponse } from './character-response-engine.ts';
export const CHARACTER_RESPONSE_CONTRACTS = Object.freeze([
  'response is a proposal, not canon',
  'Character context is read-only',
  'Decision remains distinct from Action',
  'AI/proposal output requires explicit validation and approval before canon mutation'
]);
void proposeCharacterResponse;
