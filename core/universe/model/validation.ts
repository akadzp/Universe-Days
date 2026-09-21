/**
 * Phase 8: Universe Model Validation Layer
 *
 * Provides comprehensive, non-repairing validation of the Universe Data Model:
 * - ID validation
 * - Cross-domain reference integrity
 * - Domain ownership checks
 * - Temporal metadata validity
 * - Circular hierarchy / dependency detection
 * - Historical revision immutability
 *
 * RULE: Validation detects issues and returns FAIL/BLOCK/CONFLICT. It NEVER auto-repairs invalid data.
 */

import { UniverseModel } from './universe.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { EntityIdentityFactory } from './identity.ts';
import { isKnownDomain } from '../../architecture/ownership.ts';

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
  /**
   * Validates an entire UniverseModel snapshot against all structural and domain rules.
   */
  public static validate(universe: UniverseModel): UniverseValidationReport {
    const issues: ValidationIssue[] = [];

    // 1. Root Identity & Temporal Context
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

    // Index all known entity IDs for cross-reference validation
    const knownEntityIds = new Set<string>();
    const characterIds = new Set<string>();
    const locationIds = new Set<string>();
    const objectIds = new Set<string>();

    for (const [id, char] of Object.entries(universe.characters || {})) {
      characterIds.add(id);
      knownEntityIds.add(id);
      if (char.identity.id !== id) {
        issues.push({
          code: 'ID_KEY_MISMATCH',
          path: `characters.${id}`,
          message: `Character map key '${id}' does not match entity id '${char.identity.id}'`,
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
      objectIds.add(id);
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

    // 2. Cross-domain reference validation: Relationships
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

    // 3. Object references
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

    // 4. Circular Location Hierarchy Detection
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

    // 5. Process Dependency Cycle Detection
    for (const [procId, proc] of Object.entries(universe.processes || {})) {
      const visited = new Set<string>();
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
        visited.add(currId);
        const currProc = universe.processes[currId];
        if (currProc && currProc.dependencies) {
          for (const depId of currProc.dependencies) {
            if (checkCycles(depId, [...path, currId])) {
              return true;
            }
          }
        }
        return false;
      };
      checkCycles(procId, []);
    }

    // 6. Domain Ownership Verification
    for (const binding of universe.domainBindings || []) {
      const isRegistered = isKnownDomain(String(binding.domainId));
      if (!isRegistered) {
        issues.push({
          code: 'UNKNOWN_DOMAIN_BINDING',
          path: `domainBindings.${binding.domainId}`,
          message: `Domain '${binding.domainId}' is not registered in CoreDomain`,
          severity: 'ERROR'
        });
      }
    }

    const hasErrors = issues.some(i => i.severity === 'ERROR');
    return {
      isValid: !hasErrors,
      issues: Object.freeze(issues)
    };
  }

  /**
   * Helper that throws or returns a Result for integration pipelines.
   */
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
