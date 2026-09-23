/**
 * Character -> supporting domain integration boundary.
 *
 * Character owns stable references to Knowledge, Relationship, and Location,
 * while each supporting domain remains authoritative for its own entity.
 * This module only validates/binds references; it does not duplicate domain truth.
 */
import { CharacterEntity } from './character.ts';
import { KnowledgeEntity, validateKnowledge } from '../DOMAIN/KNOWLEDGE/knowledge.ts';
import { RelationshipEntity, validateRelationship } from '../DOMAIN/RELATIONSHIP/relationship.ts';
import { LocationEntity } from '../DOMAIN/LOCATION/location.ts';
import { EntityIdentityFactory } from '../SHARED/identity.ts';

export interface CharacterDomainIntegrationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CharacterDomainIntegrationReport {
  readonly valid: boolean;
  readonly issues: readonly CharacterDomainIntegrationIssue[];
}

export interface CharacterDomainBindings {
  readonly character: CharacterEntity;
  readonly knowledge: Readonly<Record<string, KnowledgeEntity>>;
  readonly relationships: Readonly<Record<string, RelationshipEntity>>;
  readonly locations: Readonly<Record<string, LocationEntity>>;
}

function issue(code: string, path: string, message: string): CharacterDomainIntegrationIssue {
  return { code, path, message };
}

function hasRef(refs: readonly string[], id: string): boolean {
  return refs.includes(id);
}

/**
 * Validates that supporting domain entities actually belong to this Character
 * through explicit references. Missing evidence is reported, never inferred.
 */
export function validateCharacterDomainBindings(
  bindings: CharacterDomainBindings
): CharacterDomainIntegrationReport {
  const issues: CharacterDomainIntegrationIssue[] = [];
  const characterId = bindings.character.identity.id as string;

  if (!EntityIdentityFactory.isValidId(characterId)) {
    issues.push(issue('INVALID_CHARACTER_ID', 'character.identity.id', 'Character identity ID tidak valid.'));
  }

  for (const [id, knowledge] of Object.entries(bindings.knowledge)) {
    if (knowledge.knowerRef !== characterId) {
      issues.push(issue('KNOWLEDGE_KNOWER_MISMATCH', `knowledge.${id}.knowerRef`, 'Knowledge dimiliki oleh Character yang berbeda.'));
    }
    if (!hasRef(bindings.character.knowledgeReferences, id)) {
      issues.push(issue('KNOWLEDGE_REFERENCE_MISSING', `knowledge.${id}`, 'Knowledge entity tersedia tetapi tidak direferensikan oleh Character.'));
    }
    const report = validateKnowledge(knowledge);
    for (const finding of report.issues) {
      issues.push(issue(`KNOWLEDGE_${finding.code}`, `knowledge.${id}.${finding.path}`, finding.message));
    }
  }

  for (const [id, relationship] of Object.entries(bindings.relationships)) {
    const subject = relationship.subjectRef as string;
    const target = relationship.targetRef as string;
    if (subject !== characterId && target !== characterId) {
      issues.push(issue('RELATIONSHIP_CHARACTER_MISMATCH', `relationships.${id}`, 'Relationship tidak melibatkan Character aggregate ini.'));
    }
    if (!hasRef(bindings.character.relationshipReferences, id)) {
      issues.push(issue('RELATIONSHIP_REFERENCE_MISSING', `relationships.${id}`, 'Relationship entity tersedia tetapi tidak direferensikan oleh Character.'));
    }
    const report = validateRelationship(relationship);
    for (const finding of report.issues) {
      issues.push(issue(`RELATIONSHIP_${finding.code}`, `relationships.${id}.${finding.path}`, finding.message));
    }
  }

  if (bindings.character.locationReference) {
    const location = bindings.locations[bindings.character.locationReference];
    if (!location) {
      issues.push(issue('LOCATION_REFERENCE_NOT_FOUND', 'character.locationReference', 'Location reference tidak ditemukan pada Location domain snapshot.'));
    }
  }

  for (const [id] of Object.entries(bindings.locations)) {
    if (id === bindings.character.locationReference) continue;
    // Location records are allowed to exist in the snapshot without being the
    // Character current location; no ownership is inferred from co-presence.
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

/** Bind a newly authoritative Knowledge entity without copying its contents. */
export function bindKnowledgeReference(
  character: CharacterEntity,
  knowledge: KnowledgeEntity
): CharacterEntity {
  const characterId = character.identity.id as string;
  if (knowledge.knowerRef !== characterId) {
    throw new Error('Knowledge knowerRef tidak cocok dengan Character.');
  }
  const refs = character.knowledgeReferences.includes(knowledge.knowledgeId)
    ? character.knowledgeReferences
    : [...character.knowledgeReferences, knowledge.knowledgeId];
  return Object.freeze({ ...character, knowledgeReferences: Object.freeze(refs) });
}

/** Bind a Relationship owned by the Relationship domain; no relationship is inferred. */
export function bindRelationshipReference(
  character: CharacterEntity,
  relationship: RelationshipEntity
): CharacterEntity {
  const characterId = character.identity.id as string;
  if ((relationship.subjectRef as string) !== characterId && (relationship.targetRef as string) !== characterId) {
    throw new Error('Relationship tidak melibatkan Character.');
  }
  const refs = character.relationshipReferences.includes(relationship.relationshipId)
    ? character.relationshipReferences
    : [...character.relationshipReferences, relationship.relationshipId];
  return Object.freeze({ ...character, relationshipReferences: Object.freeze(refs) });
}

/** Bind current Location explicitly; co-presence is never inferred as location ownership. */
export function bindLocationReference(
  character: CharacterEntity,
  location: LocationEntity
): CharacterEntity {
  if (!location.identity.id) throw new Error('Location identity wajib tersedia.');
  return Object.freeze({ ...character, locationReference: location.identity.id });
}
