/**
 * Phase 6: Daily Story Core Validation Engine.
 * Provides thorough, structured validation across all Story subsystem components.
 */

import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { UniversePeriodContext } from '../../universe/daily/initialization.ts';
import { StoryTrigger, StoryTriggerEvaluator } from './trigger.ts';
import { StoryScope, StoryScopeValidator } from './scope.ts';
import { StoryDateInfo, StoryDateResolver } from './date.ts';
import { StoryIdGenerator } from './identity.ts';
import { StoryHandoffContext } from './handoff.ts';
import { StoryLifecycleManager, StoryLifecycleStatus } from './lifecycle.ts';
import { CanonProtectionGuard } from './canon.ts';

export interface StoryValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: EngineErrorCode | string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface StoryValidationReport {
  isValid: boolean;
  canProceedToProduction: boolean;
  issues: StoryValidationIssue[];
  errors: StoryValidationIssue[];
  warnings: StoryValidationIssue[];
  checkedComponents: {
    trigger: boolean;
    scope: boolean;
    date: boolean;
    identity: boolean;
    canon: boolean;
    continuity: boolean;
    lifecycle: boolean;
  };
}

export class StoryCoreValidator {
  /**
   * Validates all components of a Daily Story against the authoritative UniversePeriodContext.
   */
  public static validateStoryProduction(params: {
    trigger: StoryTrigger;
    scope: StoryScope;
    storyDate: StoryDateInfo;
    storyId: string;
    universeContext: UniversePeriodContext;
    lifecycle?: StoryLifecycleManager;
    handoff?: StoryHandoffContext;
  }): StoryValidationReport {
    const { trigger, scope, storyDate, storyId, universeContext, lifecycle } = params;
    const issues: StoryValidationIssue[] = [];

    const checked = {
      trigger: false,
      scope: false,
      date: false,
      identity: false,
      canon: false,
      continuity: false,
      lifecycle: false
    };

    // 1. Trigger Validation
    const triggerEval = StoryTriggerEvaluator.evaluateTrigger(trigger, universeContext);
    checked.trigger = true;
    if (!triggerEval.success || !triggerEval.data) {
      issues.push({
        severity: 'ERROR',
        code: ((triggerEval.error as any)?.code || triggerEval.error) ?? EngineErrorCode.INVALID_STORY_TRIGGER,
        message: triggerEval.message ?? 'Trigger evaluation failed',
        field: 'trigger'
      });
    } else if (!triggerEval.data.valid) {
      issues.push({
        severity: 'ERROR',
        code: triggerEval.data.triggerStatus === 'BLOCKED'
          ? EngineErrorCode.STORY_TRIGGER_BLOCKED
          : EngineErrorCode.INVALID_STORY_TRIGGER,
        message: `Trigger invalid or blocked: ${triggerEval.data.reasons.join(', ')}`,
        field: 'trigger'
      });
    }

    // 2. Scope Validation
    const scopeReport = StoryScopeValidator.validateScope(scope, universeContext);
    checked.scope = true;
    if (!scopeReport.valid) {
      for (const err of scopeReport.errors) {
        issues.push({
          severity: 'ERROR',
          code: EngineErrorCode.INVALID_STORY_SCOPE,
          message: err,
          field: 'scope'
        });
      }
    }
    for (const warn of scopeReport.warnings) {
      issues.push({
        severity: 'WARNING',
        code: 'SCOPE_WARNING',
        message: warn,
        field: 'scope'
      });
    }

    // 3. Date Validation
    const dateVal = StoryDateResolver.validateDate(storyDate, universeContext);
    checked.date = true;
    if (!dateVal.success) {
      issues.push({
        severity: 'ERROR',
        code: ((dateVal.error as any)?.code || dateVal.error) ?? EngineErrorCode.INVALID_STORY_DATE,
        message: dateVal.message ?? 'Date validation failed',
        field: 'storyDate'
      });
    }

    // 4. Story ID Validation
    const idVal = StoryIdGenerator.validate(storyId);
    checked.identity = true;
    if (!idVal.success) {
      issues.push({
        severity: 'ERROR',
        code: ((idVal.error as any)?.code || idVal.error) ?? EngineErrorCode.INVALID_STORY_ID,
        message: idVal.message ?? 'Story ID validation failed',
        field: 'storyId'
      });
    }

    // 5. Canon Protection Validation
    const canonClaims = CanonProtectionGuard.validateClaims(scope.relevantActorEntityRefs, universeContext);
    checked.canon = true;
    if (!canonClaims.isCanonCompliant) {
      issues.push({
        severity: 'ERROR',
        code: EngineErrorCode.CANON_MUTATION_PROHIBITED,
        message: `Unauthorized entity references in scope: ${canonClaims.unauthorizedClaims.join(', ')}`,
        field: 'canon'
      });
    }

    // 6. Continuity Consistency
    checked.continuity = true;
    const knownContinuityIds = new Set(universeContext.continuityItems.map(c => c.identity.continuityId));
    for (const contId of scope.relevantContinuityIds) {
      if (!knownContinuityIds.has(contId)) {
        issues.push({
          severity: 'ERROR',
          code: EngineErrorCode.MISSING_REQUIRED_CONTEXT,
          message: `Continuity item "${contId}" missing from Universe context`,
          field: 'continuity'
        });
      }
    }

    // 7. Lifecycle Validation
    if (lifecycle) {
      checked.lifecycle = true;
      const status = lifecycle.currentStatus;
      if (status === StoryLifecycleStatus.BLOCKED || status === StoryLifecycleStatus.FAILED || status === StoryLifecycleStatus.CANCELLED) {
        issues.push({
          severity: 'ERROR',
          code: EngineErrorCode.STORY_LIFECYCLE_BLOCKED,
          message: `Story lifecycle is in exceptional/blocked state: ${status}`,
          field: 'lifecycle'
        });
      }
    }

    const errors = issues.filter(i => i.severity === 'ERROR');
    const warnings = issues.filter(i => i.severity === 'WARNING');
    const isValid = errors.length === 0;

    return {
      isValid,
      canProceedToProduction: isValid,
      issues,
      errors,
      warnings,
      checkedComponents: checked
    };
  }
}
