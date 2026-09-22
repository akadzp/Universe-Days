/**
 * Universe Model Validation Layer
 *
 * Validates structure, cross-domain references, ownership bindings, temporal
 * metadata, and Actor classification rules. Validation never auto-repairs data.
 */

import { UniverseModel } from './universe.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { EntityIdentityFactory } from './identity.ts';
import { isKnownDomain } from '../../architecture/ownership.ts';
import { validateActorClassification } from './actor.ts';

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

      if (char.stateReference && (!universe.states || !universe.states[char.stateReference])) {
        issues.push({
          code: 'DANGLING_STATE_REFERENCE',
          path: `characters.${id}.stateReference`,
          message: `Character state '${char.stateReference}' not found in states`,
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
      if (obj.ownershipRef && !knownEntityIds.has(obj.ownershipRef)) {
        issues.push({
          code: 'DANGLING_REFERENCE',
          path: `objects.${objId}.ownershipRef`,
          message: `Object owner '${obj.ownershipRef}' not found in known entities`,
          severity: 'WARNING'
        });
      }
      if (obj.possessionRef && !knownEntityIds.has(obj.possessionRef)) {
        issues.push({
          code: 'DANGLING_REFERENCE',
          path: `objects.${objId}.possessionRef`,
          message: `Object possessor '${obj.possessionRef}' not found in known entities`,
          severity: 'WARNING'
        });
      }
      if (obj.locationRef && !locationIds.has(obj.locationRef)) {
        issues.push({
          code: 'DANGLING_REFERENCE',
          path: `objects.${objId}.locationRef`,
          message: `Object location '${obj.locationRef}' not found in locations`,
          severity: 'ERROR'
        });
      }
    }

    for (const [locId, loc] of Object.entries(universe.locations || {})) {
      let currentParent = loc.parentLocationRef;
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
        const parentLoc = universe.locations[currentParent];
        currentParent = parentLoc ? parentLoc.parentLocationRef : null;
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

    const hasErrors = issues.some(i => i.severity === 'ERROR');
    return { isValid: !hasErrors, issues: Object.freeze(issues) };
  }

  public static validateAsResult(universe: UniverseModel): Result<UniverseModel> {
    const report = this.validate(universe);
    if (!report.isValid) {
      const firstErr = report.issues.find(i => i.severity === 'ERROR');
      return failure(
        EngineErrorCode.UNIVERSE_VALIDATION_FAILED,
        `Universe validation failed: ${firstErr ? firstErr.message : 'Unknown validation errors'}`
      );
    }
    return success(universe);
  }
}
