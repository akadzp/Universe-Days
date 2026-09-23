/**
 * Contract tests for Character <-> Knowledge/Relationship/Location bindings.
 * These are intentionally framework-neutral so the repository can execute them
 * with its chosen test runner without introducing a new dependency.
 */
import assert from 'node:assert/strict';
import {
  bindKnowledgeReference,
  bindLocationReference,
  bindRelationshipReference,
  validateCharacterDomainBindings,
} from './character-domain-integration.ts';

export function runCharacterDomainIntegrationContractTests(fixtures: {
  character: any;
  knowledge: any;
  relationship: any;
  location: any;
}): void {
  const withKnowledge = bindKnowledgeReference(fixtures.character, fixtures.knowledge);
  assert.equal(withKnowledge.knowledgeReferences.includes(fixtures.knowledge.knowledgeId), true);

  const withRelationship = bindRelationshipReference(withKnowledge, fixtures.relationship);
  assert.equal(withRelationship.relationshipReferences.includes(fixtures.relationship.relationshipId), true);

  const withLocation = bindLocationReference(withRelationship, fixtures.location);
  assert.equal(withLocation.locationReference, fixtures.location.identity.id);

  const report = validateCharacterDomainBindings({
    character: withLocation,
    knowledge: { [fixtures.knowledge.knowledgeId]: fixtures.knowledge },
    relationships: { [fixtures.relationship.relationshipId]: fixtures.relationship },
    locations: { [fixtures.location.identity.id]: fixtures.location },
  });
  assert.equal(report.valid, true, report.issues.map(x => x.message).join('; '));
}
