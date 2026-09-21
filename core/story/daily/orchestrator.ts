/**
 * Phase 6: Daily Story Core Orchestrator.
 * Orchestrates the full deterministic pipeline from validated UniversePeriodContext
 * to a verified StoryProductionPackage ready for narrative production.
 */

import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { UniversePeriodContext } from '../../universe/daily/initialization.ts';
import { StoryTrigger, StoryTriggerEvaluator } from './trigger.ts';
import { StoryScope, StoryScopeBuilder } from './scope.ts';
import { StoryDateInfo, StoryDateResolver } from './date.ts';
import { StoryIdGenerator } from './identity.ts';
import { StoryLifecycleManager, StoryLifecycleEvent, StoryLifecycleStatus } from './lifecycle.ts';
import { StoryHandoffContext, StoryHandoffBuilder } from './handoff.ts';
import { CanonProtectionGuard } from './canon.ts';
import { StoryCoreValidator, StoryValidationReport } from './validation.ts';

export interface StoryProductionPackage {
  storyId: string;
  storyDate: StoryDateInfo;
  trigger: StoryTrigger;
  scope: StoryScope;
  handoff: StoryHandoffContext;
  lifecycleStatus: StoryLifecycleStatus;
  validationReport: StoryValidationReport;
  createdAtUniverseTime: string;
}

export interface ProduceStoryOptions {
  instanceRef?: string;
  scopeId?: string;
  customScope?: StoryScope;
  additionalActors?: string[];
  additionalDomains?: string[];
  restrictions?: string[];
}

export class DailyStoryOrchestrator {
  /**
   * Orchestrates the complete deterministic creation of a StoryProductionPackage.
   */
  public static produceStory(
    universeContext: UniversePeriodContext,
    trigger: StoryTrigger,
    options?: ProduceStoryOptions
  ): Result<StoryProductionPackage> {
    const instanceRef = options?.instanceRef ?? `INST_${universeContext.period.periodId}_${trigger.triggerId}`;

    // 0. Compute initial fingerprint for immutability check
    const initialUniverseFingerprint = CanonProtectionGuard.computeUniverseContextFingerprint(universeContext);

    // 1. Lifecycle: Initialize and Accept Trigger
    const lifecycle = new StoryLifecycleManager();
    const trigAcceptRes = lifecycle.transition(StoryLifecycleEvent.ACCEPT_TRIGGER, {
      triggerId: trigger.triggerId,
      reason: 'Trigger submitted to orchestrator'
    });
    if (!trigAcceptRes.success) return failure(trigAcceptRes.error!);

    // Evaluate trigger validity
    const triggerEval = StoryTriggerEvaluator.evaluateTrigger(trigger, universeContext);
    if (!triggerEval.success) {
      lifecycle.transition(StoryLifecycleEvent.FAIL, { reason: triggerEval.error?.message });
      return failure(triggerEval.error!);
    }
    if (!triggerEval.data.valid) {
      if (triggerEval.data.triggerStatus === 'BLOCKED') {
        lifecycle.transition(StoryLifecycleEvent.BLOCK, { reason: triggerEval.data.reasons.join(', ') });
        return failure(
          EngineErrorCode.STORY_TRIGGER_BLOCKED,
          `Trigger is blocked: ${triggerEval.data.reasons.join(', ')}`
        );
      }
      lifecycle.transition(StoryLifecycleEvent.FAIL, { reason: triggerEval.data.reasons.join(', ') });
      return failure(
        EngineErrorCode.INVALID_STORY_TRIGGER,
        `Trigger is invalid: ${triggerEval.data.reasons.join(', ')}`
      );
    }

    // 2. Scope: Build or use provided Scope
    let scope: StoryScope;
    if (options?.customScope) {
      scope = options.customScope;
    } else {
      const scopeRes = StoryScopeBuilder.buildFromTrigger(trigger, universeContext, {
        scopeId: options?.scopeId,
        additionalActors: options?.additionalActors,
        additionalDomains: options?.additionalDomains
      });
      if (!scopeRes.success) {
        lifecycle.transition(StoryLifecycleEvent.FAIL, { reason: scopeRes.error?.message });
        return failure(scopeRes.error!);
      }
      scope = scopeRes.data;
    }

    const scopeTransition = lifecycle.transition(StoryLifecycleEvent.BIND_SCOPE, {
      reason: `Bound scope ${scope.scopeId}`
    });
    if (!scopeTransition.success) return failure(scopeTransition.error!);

    // 3. Date: Resolve authoritative Story Date
    const dateRes = StoryDateResolver.resolveDate(universeContext, trigger);
    if (!dateRes.success) {
      lifecycle.transition(StoryLifecycleEvent.FAIL, { reason: dateRes.error?.message });
      return failure(dateRes.error!);
    }
    const storyDate = dateRes.data;

    const dateTransition = lifecycle.transition(StoryLifecycleEvent.ASSIGN_DATE, {
      reason: `Assigned date ${storyDate.storyDate}`
    });
    if (!dateTransition.success) return failure(dateTransition.error!);

    // 4. Identity: Generate deterministic Story ID
    const storyId = StoryIdGenerator.generate(
      universeContext.period.universeScope,
      storyDate,
      trigger,
      scope
    );

    const idTransition = lifecycle.transition(StoryLifecycleEvent.ASSIGN_ID, {
      storyId,
      reason: 'Generated deterministic Story ID'
    });
    if (!idTransition.success) return failure(idTransition.error!);

    // 5. Build Handoff Context
    const handoff = StoryHandoffBuilder.buildHandoff({
      instanceRef,
      storyId,
      storyDate,
      trigger,
      scope,
      universeContext,
      upstreamFingerprint: initialUniverseFingerprint,
      restrictions: options?.restrictions
    });

    // 6. Comprehensive Validation
    const validationReport = StoryCoreValidator.validateStoryProduction({
      trigger,
      scope,
      storyDate,
      storyId,
      universeContext,
      lifecycle,
      handoff
    });

    if (!validationReport.isValid) {
      lifecycle.transition(StoryLifecycleEvent.FAIL, {
        reason: validationReport.errors.map(e => e.message).join('; ')
      });
      return failure(
        EngineErrorCode.STORY_PRODUCTION_ERROR,
        `Story validation failed with ${validationReport.errors.length} error(s): ${validationReport.errors.map(e => e.message).join('; ')}`
      );
    }

    // 7. Mark READY_FOR_PRODUCTION
    const readyTransition = lifecycle.transition(StoryLifecycleEvent.MARK_READY, {
      storyId,
      reason: 'All pre-production validations passed'
    });
    if (!readyTransition.success) return failure(readyTransition.error!);

    // 8. Canon Protection Immutability Check
    const immutabilityRes = CanonProtectionGuard.verifyContextImmutability(
      initialUniverseFingerprint,
      universeContext
    );
    if (!immutabilityRes.success) {
      return failure(immutabilityRes.error!);
    }

    const createdAtUniverseTime = universeContext.clock
      ? universeContext.clock.readCurrentTime().toCanonical()
      : storyDate.storyDateTime;

    return success({
      storyId,
      storyDate,
      trigger,
      scope,
      handoff,
      lifecycleStatus: lifecycle.currentStatus,
      validationReport,
      createdAtUniverseTime
    });
  }
}
