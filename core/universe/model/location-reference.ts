/**
 * Location Reference Resolver
 *
 * Deterministic, read-only reference resolution and disambiguation for locations.
 * Never mutates Universe state.
 * Never guesses or arbitrarily selects among ties.
 */

import { LocationEntity, LocationAccessibilityStatus } from './location.ts';

export type LocationReferenceStatus =
  | 'RESOLVED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID_REFERENCE';

export type LocationMatchType =
  | 'EXACT_ID'
  | 'EXACT_NAME'
  | 'ALIAS'
  | 'SUBSTRING'
  | 'CONTEXTUAL';

export interface LocationReferenceQuery {
  readonly locationId?: string;
  readonly mentionOrName?: string;
  readonly aliases?: readonly string[];
  readonly locationType?: string;
  readonly parentLocationRef?: string | null;
  readonly accessibilityStatus?: LocationAccessibilityStatus;
  readonly knownLocations: Readonly<Record<string, LocationEntity>>;
}

export interface LocationReferenceCandidate {
  readonly locationId: string;
  readonly matchScore: number;
  readonly matchedCriteria: readonly string[];
}

export interface LocationReferenceResolution {
  readonly status: LocationReferenceStatus;
  readonly matchedLocationId?: string;
  readonly matchedLocation?: LocationEntity;
  readonly matchType?: LocationMatchType;
  readonly candidates: readonly LocationReferenceCandidate[];
  readonly reason: string;
}

export class LocationReferenceResolver {
  /**
   * Deterministically resolves a location reference against a UniverseModel snapshot.
   * Zero mutations.
   */
  public static resolveFromUniverse(
    universe: { readonly locations?: Readonly<Record<string, LocationEntity>> },
    query: Omit<LocationReferenceQuery, 'knownLocations'>
  ): LocationReferenceResolution {
    return this.resolve({
      ...query,
      knownLocations: universe.locations || {}
    });
  }

  /**
   * Deterministically resolves a location reference against a given set of known locations.
   * Zero mutations. If multiple candidates tie for highest score, returns 'AMBIGUOUS'.
   */
  public static resolve(query: LocationReferenceQuery): LocationReferenceResolution {
    const locations = Object.values(query.knownLocations || {});

    // 1. Direct ID match (highest priority, strict)
    if (query.locationId) {
      const directMatch = query.knownLocations[query.locationId];
      if (directMatch) {
        return {
          status: 'RESOLVED',
          matchedLocationId: directMatch.identity.id,
          matchedLocation: directMatch,
          matchType: 'EXACT_ID',
          candidates: [
            {
              locationId: directMatch.identity.id,
              matchScore: 100,
              matchedCriteria: ['EXACT_ID']
            }
          ],
          reason: `Exact location ID match for "${query.locationId}".`
        };
      } else {
        return {
          status: 'NOT_FOUND',
          candidates: [],
          reason: `Location with ID "${query.locationId}" was not found in known entities.`
        };
      }
    }

    const mention = (query.mentionOrName ?? '').trim().toLowerCase();
    const queryAliases = (query.aliases ?? []).map(a => a.trim().toLowerCase()).filter(Boolean);

    // If query has neither ID nor mention/alias nor criteria, it's invalid
    if (!mention && queryAliases.length === 0 && !query.locationType && query.parentLocationRef === undefined) {
      return {
        status: 'INVALID_REFERENCE',
        candidates: [],
        reason: 'Empty reference query: no name, mention, alias, or criteria provided.'
      };
    }

    // 2. Score candidates deterministically
    const scoredCandidates: LocationReferenceCandidate[] = [];

    for (const loc of locations) {
      if (!loc || !loc.identity) continue;
      let score = 0;
      const matchedCriteria: string[] = [];
      const locName = (loc.identity.displayName || '').toLowerCase();
      const locAliases = (loc.aliases ?? []).map(a => a.toLowerCase());

      // A. Mention matching
      if (mention) {
        if (locName === mention) {
          score += 80;
          matchedCriteria.push('EXACT_DISPLAY_NAME');
        } else if (locName.includes(mention) || mention.includes(locName)) {
          score += 40;
          matchedCriteria.push('SUBSTRING_DISPLAY_NAME');
        }

        if (locAliases.includes(mention)) {
          score += 75;
          matchedCriteria.push('EXACT_ALIAS');
        } else if (locAliases.some(a => a.includes(mention) || mention.includes(a))) {
          score += 35;
          matchedCriteria.push('SUBSTRING_ALIAS');
        }
      }

      // B. Query aliases matching candidate aliases or display name
      for (const qa of queryAliases) {
        if (locName === qa) {
          score += 70;
          matchedCriteria.push(`QUERY_ALIAS_NAME_MATCH:${qa}`);
        } else if (locAliases.includes(qa)) {
          score += 65;
          matchedCriteria.push(`QUERY_ALIAS_MATCH:${qa}`);
        }
      }

      // C. Contextual criteria
      if (query.locationType && loc.locationType.toLowerCase() === query.locationType.toLowerCase()) {
        score += 15;
        matchedCriteria.push('LOCATION_TYPE');
      }

      if (query.parentLocationRef !== undefined && loc.parentLocationRef === query.parentLocationRef) {
        score += 20;
        matchedCriteria.push('PARENT_LOCATION');
      }

      if (query.accessibilityStatus && loc.accessibilityStatus === query.accessibilityStatus) {
        score += 10;
        matchedCriteria.push('ACCESSIBILITY_STATUS');
      }

      if (score > 0) {
        scoredCandidates.push({
          locationId: loc.identity.id,
          matchScore: score,
          matchedCriteria: Object.freeze(matchedCriteria)
        });
      }
    }

    if (scoredCandidates.length === 0) {
      return {
        status: 'NOT_FOUND',
        candidates: [],
        reason: 'No location matched the provided reference criteria.'
      };
    }

    // Sort descending by score, tie-break by locationId ascending
    scoredCandidates.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.locationId.localeCompare(b.locationId);
    });

    const topCandidate = scoredCandidates[0];

    // If top candidate is below confidence threshold (50)
    if (topCandidate.matchScore < 50) {
      return {
        status: 'NOT_FOUND',
        candidates: Object.freeze(scoredCandidates),
        reason: `Best candidate "${topCandidate.locationId}" only scored ${topCandidate.matchScore}, below confidence threshold (50).`
      };
    }

    // Check for ambiguity (ties for top score)
    const topTied = scoredCandidates.filter(c => c.matchScore === topCandidate.matchScore);
    if (topTied.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: Object.freeze(scoredCandidates),
        reason: `Reference is ambiguous between ${topTied.length} locations with identical score (${topCandidate.matchScore}): ${topTied.map(c => c.locationId).join(', ')}.`
      };
    }

    const matchedLocation = query.knownLocations[topCandidate.locationId];
    let matchType: LocationMatchType = 'CONTEXTUAL';
    if (topCandidate.matchedCriteria.includes('EXACT_DISPLAY_NAME')) {
      matchType = 'EXACT_NAME';
    } else if (
      topCandidate.matchedCriteria.includes('EXACT_ALIAS') ||
      topCandidate.matchedCriteria.some(c => c.startsWith('QUERY_ALIAS_MATCH:'))
    ) {
      matchType = 'ALIAS';
    } else if (
      topCandidate.matchedCriteria.some(c => c.startsWith('SUBSTRING_'))
    ) {
      matchType = 'SUBSTRING';
    }

    return {
      status: 'RESOLVED',
      matchedLocationId: topCandidate.locationId,
      matchedLocation,
      matchType,
      candidates: Object.freeze(scoredCandidates),
      reason: `Deterministically resolved to "${topCandidate.locationId}" with score ${topCandidate.matchScore}.`
    };
  }
}
