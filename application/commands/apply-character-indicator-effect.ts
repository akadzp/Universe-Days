import { makeSystemID } from '../../core/SHARED/identifiers.ts';
import { CHARACTER_OWNER_CAPABILITY } from '../../core/RUNTIME/GOVERNANCE/ownership.ts';
import { success, failure } from '../../core/SHARED/result.ts';
import type { WorkflowDefinition } from '../../core/RUNTIME/ENGINE/workflow.ts';
import { CharacterAggregateLifecycle, validateCharacterAggregate } from '../../core/CHARACTER/character-aggregate.ts';
import type { ApplyCharacterIndicatorEffectPayload } from '../contracts.ts';

export function applyCharacterIndicatorEffectWorkflow(
  payload: ApplyCharacterIndicatorEffectPayload,
): WorkflowDefinition {
  return {
    workflowId: `APP_APPLY_CHARACTER_EFFECT_${payload.effect.effectId}`,
    name: 'Application Apply Character Indicator Effect',
    steps: [{
      stepId: 'APPLY_EFFECT_AND_STAGE_CHARACTER',
      name: 'Apply domain lifecycle and stage canonical Character mutation',
      executor: (ctx, tx) => {
        const id = payload.effect.characterId;
        const character = ctx.universeSnapshot.characters[id];
        if (!character) {
          return failure('CHARACTER_NOT_FOUND', `Character '${id}' was not found.`);
        }

        const aggregate = {
          character,
          behaviors: Object.freeze(
            Object.fromEntries(
              (character.behaviorReferences ?? [])
                .filter(ref => ctx.universeSnapshot.behaviors[ref])
                .map(ref => [ref, ctx.universeSnapshot.behaviors[ref]])
            )
          ),
          styles: Object.freeze(
            Object.fromEntries(
              (character.styleReferences ?? [])
                .filter(ref => ctx.universeSnapshot.styles[ref])
                .map(ref => [ref, ctx.universeSnapshot.styles[ref]])
            )
          ),
        };

        const validation = validateCharacterAggregate(aggregate);
        if (!validation.valid) {
          return failure(
            'INVALID_CHARACTER_AGGREGATE',
            validation.issues.map(issue => issue.message).join('; '),
          );
        }

        const mutation = CharacterAggregateLifecycle.applyIndicatorEffect(
          aggregate,
          {
            effect: payload.effect,
            effectiveAt: payload.effectiveAt,
            recordedAt: payload.recordedAt,
            changeId: payload.changeId,
            source: payload.provenance.source,
            triggerType: payload.effect.triggerType,
            triggerReference: payload.effect.triggerReference,
            operation: payload.effect.operation,
            value: payload.effect.value,
            ruleReference: payload.effect.ruleReference,
            reason: `Application command ${payload.effect.effectId}`,
            provenance: character.provenance,
          },
        );

        if (!mutation.valid || !mutation.aggregate) {
          return failure(
            'CHARACTER_INDICATOR_MUTATION_REJECTED',
            mutation.issues.map(issue => issue.message).join('; '),
          );
        }

        tx.stageMutation({
          domain: 'CHARACTER',
          entityId: id,
          entityData: mutation.aggregate.character,
          ownerCapability: CHARACTER_OWNER_CAPABILITY,
          authoritativeOwner: makeSystemID('CHARACTER_SYSTEM'),
        });

        return success({ characterId: id, change: mutation.change });
      },
    }],
  };
}
