/**
 * Universe Model Validation Layer
 *
 * Validates structure, cross-domain references, ownership bindings, temporal
 * metadata, Actor classification, Character Profile, Behavior, and Character State.
 * Validation never auto-repairs data.
 */

import { UniverseModel } from './universe.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { EntityIdentityFactory } from './identity.ts';
import { isKnownDomain } from '../../architecture/ownership.ts';
import { validateActorClassification } from './actor.ts';
import { validateCharacterProfile } from './character-profile.ts';
import { validateBehavior } from './behavior.ts';
import { CharacterStateEntity, validateCharacterState } from './character-state.ts';
import { CharacterStyleEntity, validateCharacterStyle } from './character-style.ts';
import { AuthorityLevel, EntityType } from './types.ts';
import { ObjectDataSource, ObjectRelationEntity } from './object.ts';
import { LocationDataSource, LocationEntity } from './location.ts';

export interface ValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING' | 'CONFLICT';
}

export interface UniverseValidationReport {
  readonly isValid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export class UniverseModelValidator {
  public static validate(universe: UniverseModel): UniverseValidationReport {
    const issues: ValidationIssue[] = [];

    if (!universe.universeId || !EntityIdentityFactory.isValidId(universe.universeId)) {
      issues.push({
        code: 'INVALID_UNIVERSE_ID',
        path: 'universeId',
        message: `Universe ID '${universe.universeId}' is invalid or empty`,
        severity: 'ERROR'
      });
    }

    if (!universe.temporalContext?.currentUniverseDate) {
      issues.push({
        code: 'MISSING_UNIVERSE_DATE',
        path: 'temporalContext.currentUniverseDate',
        message: 'Current universe date is required in temporal context',
        severity: 'ERROR'
      });
    }

    const knownEntityIds = new Set<string>();
    const locationIds = new Set<string>();

    for (const [id, char] of Object.entries(universe.characters || {})) {
      knownEntityIds.add(id);

      if (char.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `characters.${id}`,
          message: `Character map key '${id}' does not match entity id '${char.identity.id}'`,
          severity: 'ERROR'
        });
      }

      if (char.actor) {
        const actorValidation = validateActorClassification(char.actor);
        for (const issue of actorValidation.issues) {
          issues.push({
            code: issue.code,
            path: `characters.${id}.actor.${issue.path}`,
            message: issue.message,
            severity: 'ERROR'
          });
        }
      }

      if (char.profile) {
        const profileValidation = validateCharacterProfile(char.profile);
        for (const issue of profileValidation.issues) {
          issues.push({
            code: issue.code,
            path: `characters.${id}.profile.${issue.path}`,
            message: issue.message,
            severity: 'ERROR'
          });
        }
      }

      for (const behaviorRef of char.behaviorReferences ?? []) {
        if (!universe.behaviors || !universe.behaviors[behaviorRef]) {
          issues.push({
            code: 'DANGLING_BEHAVIOR_REFERENCE',
            path: `characters.${id}.behaviorReferences`,
            message: `Character behavior reference '${behaviorRef}' not found in behaviors`,
            severity: 'ERROR'
          });
        } else if (universe.behaviors[behaviorRef].characterId !== id) {
          issues.push({
            code: 'BEHAVIOR_CHARACTER_MISMATCH',
            path: `characters.${id}.behaviorReferences.${behaviorRef}`,
            message: `Behavior '${behaviorRef}' belongs to character '${universe.behaviors[behaviorRef].characterId}', not '${id}'`,
            severity: 'ERROR'
          });
        }
      }

      for (const styleRef of char.styleReferences ?? []) {
        if (!universe.styles || !universe.styles[styleRef]) {
          issues.push({
            code: 'DANGLING_STYLE_REFERENCE',
            path: `characters.${id}.styleReferences`,
            message: `Character style reference '${styleRef}' not found in styles`,
            severity: 'ERROR'
          });
        } else if (universe.styles[styleRef].characterId !== id) {
          issues.push({
            code: 'STYLE_CHARACTER_MISMATCH',
            path: `characters.${id}.styleReferences.${styleRef}`,
            message: `Style '${styleRef}' belongs to character '${universe.styles[styleRef].characterId}', not '${id}'`,
            severity: 'ERROR'
          });
        }
      }

      if (char.locationReference && char.locationReference !== 'UNKNOWN' && (!universe.locations || !universe.locations[char.locationReference])) {
        issues.push({
          code: 'DANGLING_LOCATION_REFERENCE',
          path: `characters.${id}.locationReference`,
          message: `Character location '${char.locationReference}' not found in locations`,
          severity: 'ERROR'
        });
      }

      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {
        issues.push({
          code: 'DANGLING_STATE_REFERENCE',
          path: `characters.${id}.stateReference`,
          message: `Character state '${char.stateReference}' not found in states`,
          severity: 'ERROR'
        });
      } else if (char.stateReference && universe.states[char.stateReference]) {
        const state = universe.states[char.stateReference];
        if (state.entityRef !== id) {
          issues.push({
            code: 'STATE_CHARACTER_MISMATCH',
            path: `characters.${id}.stateReference`,
            message: `State '${char.stateReference}' belongs to '${state.entityRef}', not '${id}'`,
            severity: 'ERROR'
          });
        }
      }
    }

    for (const [id, state] of Object.entries(universe.states || {})) {
      if (state.stateId !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `states.${id}`,
          message: `State map key '${id}' does not match state id '${state.stateId}'`,
          severity: 'ERROR'
        });
      }
      if (!universe.characters[state.entityRef]) {
        issues.push({
          code: 'DANGLING_STATE_CHARACTER_REFERENCE',
          path: `states.${id}.entityRef`,
          message: `State character '${state.entityRef}' not found in characters`,
          severity: 'ERROR'
        });
      }

      if (state.stateType === 'CHARACTER') {
        const charState = state as CharacterStateEntity;
        const charLoc = charState.currentValue?.currentLocationReference;
        if (charLoc && charLoc !== 'UNKNOWN' && (!universe.locations || !universe.locations[charLoc])) {
          issues.push({
            code: 'DANGLING_LOCATION_REFERENCE',
            path: `states.${id}.currentValue.currentLocationReference`,
            message: `Character state location '${charLoc}' not found in locations`,
            severity: 'ERROR'
          });
        }

        const stateValidation = validateCharacterState(charState);
        for (const issue of stateValidation.issues) {
          issues.push({
            code: issue.code,
            path: `states.${id}.${issue.path}`,
            message: issue.message,
            severity: 'ERROR'
          });
        }
      }
    }

    for (const [id, style] of Object.entries(universe.styles || {})) {
      if (style.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `styles.${id}`,
          message: `Style map key '${id}' does not match entity id '${style.identity.id}'`,
          severity: 'ERROR'
        });
      }
      const styleValidation = validateCharacterStyle(style as CharacterStyleEntity);
      for (const issue of styleValidation.issues) {
        issues.push({
          code: issue.code,
          path: `styles.${id}.${issue.path}`,
          message: issue.message,
          severity: 'ERROR'
        });
      }
      if (!universe.characters[style.characterId]) {
        issues.push({
          code: 'DANGLING_STYLE_CHARACTER_REFERENCE',
          path: `styles.${id}.characterId`,
          message: `Style character '${style.characterId}' not found in characters`,
          severity: 'ERROR'
        });
      }
    }

    for (const [id, loc] of Object.entries(universe.locations || {})) {
      locationIds.add(id);
      knownEntityIds.add(id);
      if (loc.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `locations.${id}`,
          message: `Location map key '${id}' does not match entity id '${loc.identity.id}'`,
          severity: 'ERROR'
        });
      }
    }

    for (const [id, obj] of Object.entries(universe.objects || {})) {
      knownEntityIds.add(id);
      if (obj.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `objects.${id}`,
          message: `Object map key '${id}' does not match entity id '${obj.identity.id}'`,
          severity: 'ERROR'
        });
      }
    }

    for (const [relId, rel] of Object.entries(universe.relationships || {})) {
      if (!rel.subjectRef || !rel.targetRef) {
        issues.push({
          code: 'INVALID_RELATIONSHIP_ENDPOINTS',
          path: `relationships.${relId}`,
          message: `Relationship '${relId}' must have both subjectRef and targetRef`,
          severity: 'ERROR'
        });
      }
      if (rel.subjectRef && !knownEntityIds.has(rel.subjectRef)) {
        issues.push({
          code: 'DANGLING_REFERENCE',
          path: `relationships.${relId}.subjectRef`,
          message: `Relationship subject '${rel.subjectRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }
      if (rel.targetRef && !knownEntityIds.has(rel.targetRef)) {
        issues.push({
          code: 'DANGLING_REFERENCE',
          path: `relationships.${relId}.targetRef`,
          message: `Relationship target '${rel.targetRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }
    }

    for (const [objId, obj] of Object.entries(universe.objects || {})) {
      // Validate Object ID
      if (!EntityIdentityFactory.isValidId(obj.identity.id)) {
        issues.push({
          code: 'INVALID_OBJECT_ID',
          path: `objects.${objId}.identity.id`,
          message: `Object ID '${obj.identity.id}' is invalid`,
          severity: 'ERROR'
        });
      }

      // Validate Object Type
      if (!obj.objectType || typeof obj.objectType !== 'string' || obj.objectType.trim() === '') {
        issues.push({
          code: 'INVALID_OBJECT_TYPE',
          path: `objects.${objId}.objectType`,
          message: `Object '${objId}' must specify a valid objectType`,
          severity: 'ERROR'
        });
      }

      // Validate Category Path
      if (obj.categoryPath !== undefined && !Array.isArray(obj.categoryPath)) {
        issues.push({
          code: 'INVALID_CATEGORY_PATH',
          path: `objects.${objId}.categoryPath`,
          message: `Object '${objId}' categoryPath must be an array of strings`,
          severity: 'ERROR'
        });
      }

      // Validate Actor References (Owner, Possessor, User, Wearer) - strict ERROR on dangling reference
      if (obj.ownershipRef && !knownEntityIds.has(obj.ownershipRef)) {
        issues.push({
          code: 'DANGLING_ACTOR_REFERENCE',
          path: `objects.${objId}.ownershipRef`,
          message: `Object owner '${obj.ownershipRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }
      if (obj.possessionRef && !knownEntityIds.has(obj.possessionRef)) {
        issues.push({
          code: 'DANGLING_ACTOR_REFERENCE',
          path: `objects.${objId}.possessionRef`,
          message: `Object possessor '${obj.possessionRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }
      if (obj.currentUserRef && !knownEntityIds.has(obj.currentUserRef)) {
        issues.push({
          code: 'DANGLING_ACTOR_REFERENCE',
          path: `objects.${objId}.currentUserRef`,
          message: `Object user '${obj.currentUserRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }
      if (obj.currentWearerRef && !knownEntityIds.has(obj.currentWearerRef)) {
        issues.push({
          code: 'DANGLING_ACTOR_REFERENCE',
          path: `objects.${objId}.currentWearerRef`,
          message: `Object wearer '${obj.currentWearerRef}' not found in known entities`,
          severity: 'ERROR'
        });
      }

      // Validate Location
      if (obj.locationRef && obj.locationRef !== 'UNKNOWN' && !locationIds.has(obj.locationRef)) {
        issues.push({
          code: 'DANGLING_LOCATION_REFERENCE',
          path: `objects.${objId}.locationRef`,
          message: `Object location '${obj.locationRef}' not found in locations`,
          severity: 'ERROR'
        });
      }

      // Validate Container Reference
      if (obj.containedWithinObjectRef !== undefined && obj.containedWithinObjectRef !== null) {
        if (obj.containedWithinObjectRef === objId) {
          issues.push({
            code: 'ILLEGAL_SELF_CONTAINMENT',
            path: `objects.${objId}.containedWithinObjectRef`,
            message: `Object '${objId}' cannot contain itself`,
            severity: 'ERROR'
          });
        } else if (!universe.objects?.[obj.containedWithinObjectRef]) {
          issues.push({
            code: 'DANGLING_CONTAINER_REFERENCE',
            path: `objects.${objId}.containedWithinObjectRef`,
            message: `Container object '${obj.containedWithinObjectRef}' not found in universe objects`,
            severity: 'ERROR'
          });
        }
      }

      // Validate Source Authority
      if (
        (obj.source === ObjectDataSource.AI_PROPOSAL || obj.source === ObjectDataSource.UNKNOWN) &&
        obj.provenance?.authorityLevel === AuthorityLevel.AUTHORITATIVE
      ) {
        issues.push({
          code: 'INVALID_SOURCE_AUTHORITY',
          path: `objects.${objId}.provenance.authorityLevel`,
          message: `Object '${objId}' derived from source '${obj.source}' cannot have AUTHORITATIVE status`,
          severity: 'ERROR'
        });
      }

      // Validate Temporal Validity
      if (obj.temporalValidity) {
        const fromTime = Date.parse(obj.temporalValidity.effectiveFrom);
        if (isNaN(fromTime)) {
          issues.push({
            code: 'INVALID_TEMPORAL_DATE',
            path: `objects.${objId}.temporalValidity.effectiveFrom`,
            message: `effectiveFrom date '${obj.temporalValidity.effectiveFrom}' is invalid`,
            severity: 'ERROR'
          });
        }
        if (obj.temporalValidity.effectiveTo) {
          const toTime = Date.parse(obj.temporalValidity.effectiveTo);
          if (isNaN(toTime) || toTime < fromTime) {
            issues.push({
              code: 'INVALID_TEMPORAL_RANGE',
              path: `objects.${objId}.temporalValidity.effectiveTo`,
              message: `effectiveTo date '${obj.temporalValidity.effectiveTo}' cannot precede effectiveFrom`,
              severity: 'ERROR'
            });
          }
        }
      }

      // Validate Revision History Monotonicity
      if (obj.history?.revisions && Array.isArray(obj.history.revisions)) {
        for (let i = 1; i < obj.history.revisions.length; i++) {
          const prevTime = Date.parse(obj.history.revisions[i - 1].effectiveTime);
          const currTime = Date.parse(obj.history.revisions[i].effectiveTime);
          if (isNaN(currTime) || isNaN(prevTime) || currTime < prevTime) {
            issues.push({
              code: 'CORRUPT_REVISION_HISTORY',
              path: `objects.${objId}.history.revisions[${i}]`,
              message: `Revision history contains non-chronological revision at index ${i}`,
              severity: 'ERROR'
            });
          }
        }
      }

      // Validate State Conflict / Inconsistency
      if (obj.status === 'DESTROYED' && (obj.condition === 'INTACT' || obj.accessStatus === 'ACCESSIBLE')) {
        issues.push({
          code: 'CONTRADICTORY_OBJECT_STATE',
          path: `objects.${objId}`,
          message: `Object '${objId}' is marked DESTROYED but has condition '${obj.condition}' and access '${obj.accessStatus}'`,
          severity: 'CONFLICT'
        });
      }

      // Validate Attached Object Relations
      if (obj.relations) {
        for (const rel of obj.relations) {
          if (!rel.relationId || !EntityIdentityFactory.isValidId(rel.relationId)) {
            issues.push({
              code: 'INVALID_RELATION_ID',
              path: `objects.${objId}.relations.${rel.relationId}`,
              message: `Relation ID '${rel.relationId}' is invalid`,
              severity: 'ERROR'
            });
          }
          if (rel.subjectRef === rel.targetRef) {
            issues.push({
              code: 'ILLEGAL_SELF_RELATION',
              path: `objects.${objId}.relations.${rel.relationId}`,
              message: `Illegal self-relation on object '${rel.subjectRef}'`,
              severity: 'ERROR'
            });
          }
          if (rel.targetRef && !universe.objects?.[rel.targetRef]) {
            issues.push({
              code: 'DANGLING_OBJECT_RELATION_TARGET',
              path: `objects.${objId}.relations.${rel.relationId}.targetRef`,
              message: `Relation target object '${rel.targetRef}' not found in objects`,
              severity: 'ERROR'
            });
          }
        }
      }
    }

    // Validate Root Object Relations (UniverseModel.objectRelations)
    for (const [relId, rel] of Object.entries(universe.objectRelations || {})) {
      if (rel.subjectRef === rel.targetRef) {
        issues.push({
          code: 'ILLEGAL_SELF_RELATION',
          path: `objectRelations.${relId}`,
          message: `Illegal self-relation on object '${rel.subjectRef}'`,
          severity: 'ERROR'
        });
      }
      if (!universe.objects?.[rel.subjectRef]) {
        issues.push({
          code: 'DANGLING_OBJECT_RELATION_SUBJECT',
          path: `objectRelations.${relId}.subjectRef`,
          message: `Relation subject object '${rel.subjectRef}' not found in objects`,
          severity: 'ERROR'
        });
      }
      if (!universe.objects?.[rel.targetRef]) {
        issues.push({
          code: 'DANGLING_OBJECT_RELATION_TARGET',
          path: `objectRelations.${relId}.targetRef`,
          message: `Relation target object '${rel.targetRef}' not found in objects`,
          severity: 'ERROR'
        });
      }
    }

    const validAccessStatuses: readonly string[] = ['OPEN', 'RESTRICTED', 'SEALED', 'DESTROYED'];

    for (const [locId, loc] of Object.entries(universe.locations || {})) {
      // 1. ID validation
      if (!EntityIdentityFactory.isValidId(loc.identity.id)) {
        issues.push({
          code: 'INVALID_LOCATION_ID',
          path: `locations.${locId}.identity.id`,
          message: `Location ID '${loc.identity.id}' is invalid`,
          severity: 'ERROR'
        });
      }

      if (loc.identity.entityType !== EntityType.LOCATION) {
        issues.push({
          code: 'INVALID_ENTITY_TYPE',
          path: `locations.${locId}.identity.entityType`,
          message: `Location '${locId}' has invalid entityType '${loc.identity.entityType}'`,
          severity: 'ERROR'
        });
      }

      // 2. Type validation
      if (!loc.locationType || typeof loc.locationType !== 'string' || loc.locationType.trim() === '') {
        issues.push({
          code: 'INVALID_LOCATION_TYPE',
          path: `locations.${locId}.locationType`,
          message: `Location '${locId}' must specify a valid locationType`,
          severity: 'ERROR'
        });
      }

      // 3. Parent Location validation
      if (loc.parentLocationRef !== null && loc.parentLocationRef !== undefined) {
        if (loc.parentLocationRef === locId) {
          issues.push({
            code: 'SELF_PARENT_LOCATION',
            path: `locations.${locId}.parentLocationRef`,
            message: `Location '${locId}' cannot be its own parent`,
            severity: 'ERROR'
          });
        } else if (!universe.locations[loc.parentLocationRef]) {
          issues.push({
            code: 'DANGLING_PARENT_LOCATION_REFERENCE',
            path: `locations.${locId}.parentLocationRef`,
            message: `Parent location '${loc.parentLocationRef}' not found in locations`,
            severity: 'ERROR'
          });
        } else {
          // Circular hierarchy detection
          let currentParent: string | null = loc.parentLocationRef;
          const visited = new Set<string>([locId]);
          while (currentParent) {
            if (visited.has(currentParent)) {
              issues.push({
                code: 'CIRCULAR_LOCATION_HIERARCHY',
                path: `locations.${locId}.parentLocationRef`,
                message: `Circular parent hierarchy detected involving location '${currentParent}'`,
                severity: 'ERROR'
              });
              break;
            }
            visited.add(currentParent);
            const parentLoc: LocationEntity | undefined = universe.locations[currentParent];
            currentParent = parentLoc ? parentLoc.parentLocationRef : null;
          }
        }
      }

      // 4. Contained Locations (Children) validation
      for (const childRef of loc.containedLocationRefs ?? []) {
        if (childRef === locId) {
          issues.push({
            code: 'SELF_CONTAINED_LOCATION',
            path: `locations.${locId}.containedLocationRefs`,
            message: `Location '${locId}' cannot contain itself`,
            severity: 'ERROR'
          });
        } else if (!universe.locations[childRef]) {
          issues.push({
            code: 'DANGLING_CHILD_LOCATION_REFERENCE',
            path: `locations.${locId}.containedLocationRefs`,
            message: `Contained child location '${childRef}' not found in locations`,
            severity: 'ERROR'
          });
        } else {
          const childLoc = universe.locations[childRef];
          if (childLoc.parentLocationRef !== locId) {
            issues.push({
              code: 'LOCATION_CONTAINMENT_MISMATCH',
              path: `locations.${locId}.containedLocationRefs.${childRef}`,
              message: `Location '${locId}' lists '${childRef}' in containedLocationRefs, but '${childRef}' has parentLocationRef '${childLoc.parentLocationRef}'`,
              severity: 'ERROR'
            });
          }
        }
      }

      // 5. Adjacency validation
      for (const adjRef of loc.adjacentLocationRefs ?? []) {
        if (adjRef === locId) {
          issues.push({
            code: 'SELF_ADJACENT_LOCATION',
            path: `locations.${locId}.adjacentLocationRefs`,
            message: `Location '${locId}' cannot be adjacent to itself`,
            severity: 'ERROR'
          });
        } else if (!universe.locations[adjRef]) {
          issues.push({
            code: 'DANGLING_ADJACENT_LOCATION_REFERENCE',
            path: `locations.${locId}.adjacentLocationRefs`,
            message: `Adjacent location '${adjRef}' not found in locations`,
            severity: 'ERROR'
          });
        } else {
          // Symmetric adjacency check
          const adjLoc = universe.locations[adjRef];
          if (adjLoc && (!adjLoc.adjacentLocationRefs || !adjLoc.adjacentLocationRefs.includes(locId))) {
            issues.push({
              code: 'ASYMMETRIC_LOCATION_ADJACENCY',
              path: `locations.${locId}.adjacentLocationRefs.${adjRef}`,
              message: `Asymmetric adjacency detected: location '${locId}' connects to '${adjRef}', but '${adjRef}' does not connect back to '${locId}'`,
              severity: 'ERROR'
            });
          }
        }
      }

      // 6. Accessibility Status validation
      if (!validAccessStatuses.includes(loc.accessibilityStatus)) {
        issues.push({
          code: 'INVALID_ACCESSIBILITY_STATUS',
          path: `locations.${locId}.accessibilityStatus`,
          message: `Location '${locId}' has invalid accessibilityStatus '${loc.accessibilityStatus}'`,
          severity: 'ERROR'
        });
      }

      // 7. Coordinates validation
      if (loc.coordinates) {
        const { x, y, z } = loc.coordinates;
        if (x !== undefined && (typeof x !== 'number' || isNaN(x))) {
          issues.push({
            code: 'INVALID_LOCATION_COORDINATES',
            path: `locations.${locId}.coordinates.x`,
            message: `Coordinate x on location '${locId}' must be a valid number`,
            severity: 'ERROR'
          });
        }
        if (y !== undefined && (typeof y !== 'number' || isNaN(y))) {
          issues.push({
            code: 'INVALID_LOCATION_COORDINATES',
            path: `locations.${locId}.coordinates.y`,
            message: `Coordinate y on location '${locId}' must be a valid number`,
            severity: 'ERROR'
          });
        }
        if (z !== undefined && (typeof z !== 'number' || isNaN(z))) {
          issues.push({
            code: 'INVALID_LOCATION_COORDINATES',
            path: `locations.${locId}.coordinates.z`,
            message: `Coordinate z on location '${locId}' must be a valid number`,
            severity: 'ERROR'
          });
        }
      }

      // 8. Temporal Validity validation
      if (loc.temporalValidity) {
        const fromTime = Date.parse(loc.temporalValidity.effectiveFrom);
        if (isNaN(fromTime)) {
          issues.push({
            code: 'INVALID_TEMPORAL_DATE',
            path: `locations.${locId}.temporalValidity.effectiveFrom`,
            message: `effectiveFrom date '${loc.temporalValidity.effectiveFrom}' on location '${locId}' is invalid`,
            severity: 'ERROR'
          });
        }
        if (loc.temporalValidity.effectiveTo) {
          const toTime = Date.parse(loc.temporalValidity.effectiveTo);
          if (isNaN(toTime) || toTime < fromTime) {
            issues.push({
              code: 'INVALID_TEMPORAL_RANGE',
              path: `locations.${locId}.temporalValidity.effectiveTo`,
              message: `effectiveTo date '${loc.temporalValidity.effectiveTo}' cannot precede effectiveFrom on location '${locId}'`,
              severity: 'ERROR'
            });
          }
        }
      }

      // 9. Source Authority validation
      if (
        (loc.source === LocationDataSource.AI_PROPOSAL || loc.source === LocationDataSource.UNKNOWN) &&
        loc.provenance?.authorityLevel === AuthorityLevel.AUTHORITATIVE
      ) {
        issues.push({
          code: 'INVALID_SOURCE_AUTHORITY',
          path: `locations.${locId}.provenance.authorityLevel`,
          message: `Location '${locId}' derived from source '${loc.source}' cannot have AUTHORITATIVE status`,
          severity: 'ERROR'
        });
      }

      // 10. Revision History Monotonicity
      if (loc.history?.revisions && Array.isArray(loc.history.revisions)) {
        for (let i = 1; i < loc.history.revisions.length; i++) {
          const prevTime = Date.parse(loc.history.revisions[i - 1].effectiveTime);
          const currTime = Date.parse(loc.history.revisions[i].effectiveTime);
          if (isNaN(currTime) || isNaN(prevTime) || currTime < prevTime) {
            issues.push({
              code: 'CORRUPT_REVISION_HISTORY',
              path: `locations.${locId}.history.revisions[${i}]`,
              message: `Location '${locId}' history contains non-chronological revision at index ${i}`,
              severity: 'ERROR'
            });
          }
        }
      }
    }

    for (const [procId] of Object.entries(universe.processes || {})) {
      const checkCycles = (currId: string, path: string[]): boolean => {
        if (path.includes(currId)) {
          issues.push({
            code: 'CIRCULAR_PROCESS_DEPENDENCY',
            path: `processes.${procId}.dependencies`,
            message: `Circular dependency detected in process: ${[...path, currId].join(' -> ')}`,
            severity: 'ERROR'
          });
          return true;
        }
        const currProc = universe.processes[currId];
        if (currProc?.dependencies) {
          for (const depId of currProc.dependencies) {
            if (checkCycles(depId, [...path, currId])) return true;
          }
        }
        return false;
      };
      checkCycles(procId, []);
    }

    for (const binding of universe.domainBindings || []) {
      if (!isKnownDomain(String(binding.domainId))) {
        issues.push({
          code: 'UNKNOWN_DOMAIN_BINDING',
          path: `domainBindings.${binding.domainId}`,
          message: `Domain '${binding.domainId}' is not registered in CoreDomain`,
          severity: 'ERROR'
        });
      }
    }

    const hasErrors = issues.some(i => i.severity === 'ERROR' || i.severity === 'CONFLICT');
    return { isValid: !hasErrors, issues: Object.freeze(issues) };
  }

  public static validateAsResult(universe: UniverseModel): Result<UniverseModel> {
    const report = this.validate(universe);
    if (!report.isValid) {
      const firstErr = report.issues.find(i => i.severity === 'ERROR' || i.severity === 'CONFLICT');
      return failure(
        EngineErrorCode.UNIVERSE_VALIDATION_FAILED,
        `Universe validation failed: ${firstErr ? firstErr.message : 'Unknown validation errors'}`
      );
    }
    return success(universe);
  }
}
