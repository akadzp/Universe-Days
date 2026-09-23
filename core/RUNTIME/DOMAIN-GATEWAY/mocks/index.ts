/**
 * Phase 7: Mock Domain Adapters Index & Setup
 *
 * Provides a bootstrap utility to register all 6 abstract mock domain adapters.
 */

import { DomainRegistry } from '../registry.ts';
import { MockCharacterDomainAdapter } from './character-mock.ts';
import { MockRelationshipDomainAdapter } from './relationship-mock.ts';
import { MockObjectDomainAdapter } from './object-mock.ts';
import { MockKnowledgeDomainAdapter } from './knowledge-mock.ts';
import { MockStateDomainAdapter } from './state-mock.ts';
import { MockLocationDomainAdapter } from './location-mock.ts';

export * from './character-mock.ts';
export * from './relationship-mock.ts';
export * from './object-mock.ts';
export * from './knowledge-mock.ts';
export * from './state-mock.ts';
export * from './location-mock.ts';

export interface RegisteredMocks {
  character: MockCharacterDomainAdapter;
  relationship: MockRelationshipDomainAdapter;
  object: MockObjectDomainAdapter;
  knowledge: MockKnowledgeDomainAdapter;
  state: MockStateDomainAdapter;
  location: MockLocationDomainAdapter;
}

/**
 * Registers fresh mock adapters for all 6 core domains into DomainRegistry.
 */
export function registerAllMockDomainAdapters(): RegisteredMocks {
  const registry = DomainRegistry.getInstance();
  registry.reset();

  const character = new MockCharacterDomainAdapter();
  const relationship = new MockRelationshipDomainAdapter();
  const object = new MockObjectDomainAdapter();
  const knowledge = new MockKnowledgeDomainAdapter();
  const state = new MockStateDomainAdapter();
  const location = new MockLocationDomainAdapter();

  registry.registerAdapter(character);
  registry.registerAdapter(relationship);
  registry.registerAdapter(object);
  registry.registerAdapter(knowledge);
  registry.registerAdapter(state);
  registry.registerAdapter(location);

  return {
    character,
    relationship,
    object,
    knowledge,
    state,
    location
  };
}
