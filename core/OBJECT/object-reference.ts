/**
 * Object Reference Resolver
 *
 * Deterministic, read-only reference resolution and disambiguation for objects.
 * Never mutates Universe state.
 * Never guesses or arbitrarily selects among ties.
 */

import { EntityID } from '../SHARED/identifiers.ts';
import { ObjectEntity, ObjectType, ObjectCondition, ObjectStatus } from './object.ts';

export type ObjectReferenceStatus =
  | 'RESOLVED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID_REFERENCE';

export interface ObjectReferenceQuery {
  readonly objectId?: string;
  readonly mentionOrName?: string;
  readonly aliases?: readonly string[];
  readonly category?: string;
  readonly objectType?: ObjectType | string;
  readonly ownerRef?: EntityID | null;
  readonly holderRef?: EntityID | null;
  readonly userRef?: EntityID | null;
  readonly wearerRef?: EntityID | null;
  readonly locationRef?: string;
  readonly containerRef?: EntityID | null;
  readonly condition?: ObjectCondition | string;
  readonly status?: ObjectStatus | string;
  readonly temporalContext?: string;
  readonly knownObjects: Readonly<Record<string, ObjectEntity>>;
}

export interface ObjectReferenceCandidate {
  readonly objectId: string;
  readonly matchScore: number;
  readonly matchedCriteria: readonly string[];
}

export interface ObjectReferenceResolution {
  readonly status: ObjectReferenceStatus;
  readonly matchedObjectId?: string;
  readonly matchedObject?: ObjectEntity;
  readonly candidates: readonly ObjectReferenceCandidate[];
  readonly reason: string;
}

export class ObjectReferenceResolver {
  /**
   * Deterministically resolves an object reference against a given set of known objects.
   * Zero mutations. If multiple candidates tie for highest score, returns 'AMBIGUOUS'.
   */
  public static resolve(query: ObjectReferenceQuery): ObjectReferenceResolution {
    const objects = Object.values(query.knownObjects || {});

    // 1. Direct ID match (highest priority, strict)
    if (query.objectId) {
      const directMatch = query.knownObjects[query.objectId];
      if (directMatch) {
        return {
          status: 'RESOLVED',
          matchedObjectId: directMatch.identity.id,
          matchedObject: directMatch,
          candidates: [
            {
              objectId: directMatch.identity.id,
              matchScore: 100,
              matchedCriteria: ['EXACT_ID']
            }
          ],
          reason: `Exact object ID match for "${query.objectId}".`
        };
      } else {
        return {
          status: 'NOT_FOUND',
          candidates: [],
          reason: `Object with ID "${query.objectId}" was not found in known entities.`
        };
      }
    }

    const mention = (query.mentionOrName ?? '').trim().toLowerCase();
    const queryAliases = (query.aliases ?? []).map(a => a.trim().toLowerCase()).filter(Boolean);

    // If query has neither ID nor mention/alias nor attributes, it's invalid
    if (!mention && queryAliases.length === 0 && !query.category && !query.ownerRef && !query.locationRef) {
      return {
        status: 'INVALID_REFERENCE',
        candidates: [],
        reason: 'Empty reference query: no name, mention, alias, or criteria provided.'
      };
    }

    // 2. Score candidates deterministically
    const scoredCandidates: ObjectReferenceCandidate[] = [];

    for (const obj of objects) {
      let score = 0;
      const matched: string[] = [];

      const objDisplayName = (obj.identity.displayName || '').toLowerCase();
      const objName = (obj.objectName || '').toLowerCase();
      const objAliases = (obj.aliases || []).map(a => a.toLowerCase());

      // Name matching
      if (mention) {
        if (objDisplayName === mention || objName === mention) {
          score += 40;
          matched.push('EXACT_NAME');
        } else if (objAliases.includes(mention)) {
          score += 35;
          matched.push('EXACT_ALIAS');
        } else if (objDisplayName.includes(mention) || mention.includes(objDisplayName)) {
          score += 15;
          matched.push('PARTIAL_NAME');
        }
      }

      // Query aliases matching obj names or aliases
      for (const qa of queryAliases) {
        if (objAliases.includes(qa) || objName === qa || objDisplayName === qa) {
          score += 20;
          matched.push(`ALIAS_MATCH_${qa}`);
        }
      }

      // Category matching
      if (query.category) {
        const queryCat = query.category.toLowerCase();
        if (obj.category.toLowerCase() === queryCat) {
          score += 10;
          matched.push('CATEGORY');
        }
        if (obj.categoryPath?.some(c => c.toLowerCase() === queryCat)) {
          score += 10;
          matched.push('CATEGORY_PATH');
        }
      }

      // Object Type matching
      if (query.objectType && obj.objectType === query.objectType) {
        score += 5;
        matched.push('TYPE');
      }

      // Owner matching
      if (query.ownerRef !== undefined) {
        if (obj.ownershipRef === query.ownerRef) {
          score += 25;
          matched.push('OWNER');
        } else if (query.ownerRef !== null && obj.ownershipRef !== query.ownerRef) {
          // Explicit mismatch penalty if different owner specified
          score -= 30;
        }
      }

      // Possessor / Holder matching
      if (query.holderRef !== undefined) {
        if (obj.possessionRef === query.holderRef) {
          score += 20;
          matched.push('HOLDER');
        }
      }

      // User matching
      if (query.userRef !== undefined) {
        if (obj.currentUserRef === query.userRef) {
          score += 20;
          matched.push('USER');
        }
      }

      // Wearer matching
      if (query.wearerRef !== undefined) {
        if (obj.currentWearerRef === query.wearerRef) {
          score += 20;
          matched.push('WEARER');
        }
      }

      // Location matching
      if (query.locationRef !== undefined) {
        if (obj.locationRef === query.locationRef) {
          score += 15;
          matched.push('LOCATION');
        }
      }

      // Container matching
      if (query.containerRef !== undefined) {
        if (obj.containedWithinObjectRef === query.containerRef) {
          score += 15;
          matched.push('CONTAINER');
        }
      }

      // Condition matching
      if (query.condition && obj.condition === query.condition) {
        score += 5;
        matched.push('CONDITION');
      }

      // Status matching
      if (query.status && obj.status === query.status) {
        score += 5;
        matched.push('STATUS');
      }

      if (score > 0) {
        scoredCandidates.push({
          objectId: obj.identity.id,
          matchScore: score,
          matchedCriteria: Object.freeze(matched)
        });
      }
    }

    // Sort descending by score, then alphabetically by objectId for strict determinism
    scoredCandidates.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.objectId.localeCompare(b.objectId);
    });

    if (scoredCandidates.length === 0) {
      return {
        status: 'NOT_FOUND',
        candidates: [],
        reason: `No matching object found for query "${mention || query.category || 'criteria'}".`
      };
    }

    const topScore = scoredCandidates[0].matchScore;
    const topCandidates = scoredCandidates.filter(c => c.matchScore === topScore);

    // If more than one candidate has the identical top score: AMBIGUOUS
    if (topCandidates.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: Object.freeze(scoredCandidates),
        reason: `Ambiguous match: ${topCandidates.length} objects tied with score ${topScore} (${topCandidates.map(c => c.objectId).join(', ')}).`
      };
    }

    // Single winner
    const winner = query.knownObjects[topCandidates[0].objectId];
    return {
      status: 'RESOLVED',
      matchedObjectId: winner.identity.id,
      matchedObject: winner,
      candidates: Object.freeze(scoredCandidates),
      reason: `Deterministically resolved to ${winner.identity.id} with score ${topScore} [${topCandidates[0].matchedCriteria.join(', ')}].`
    };
  }
}
