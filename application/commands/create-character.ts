import { makeSystemID, makeDomainID } from '../../core/SHARED/identifiers.ts';
import { CHARACTER_OWNER_CAPABILITY } from '../../core/RUNTIME/GOVERNANCE/ownership.ts';
import { success, failure } from '../../core/SHARED/result.ts';
import type { WorkflowDefinition } from '../../core/RUNTIME/ENGINE/workflow.ts';
import { validateCharacterAggregate } from '../../core/CHARACTER/character-aggregate.ts';
import type { CreateCharacterPayload } from '../contracts.ts';

export function createCharacterWorkflow(payload: CreateCharacterPayload): WorkflowDefinition {
  return {
    workflowId: `APP_CREATE_CHARACTER_${String(payload.character.identity.id)}`,
    name: 'Application Create Character',
    steps: [{
      stepId: 'VALIDATE_AND_STAGE_CHARACTER',
      name: 'Validate Character aggregate and stage canonical mutation',
      executor: (ctx, tx) => {
        const id = String(payload.character.identity.id);
        if (ctx.universeSnapshot.characters[id]) return failure('CHARACTER_ALREADY_EXISTS', `Character '${id}' already exists.`);

        const aggregate = { character: payload.character, behaviors: Object.freeze({}), styles: Object.freeze({}) };
        const report = validateCharacterAggregate(aggregate);
        if (!report.valid) return failure('INVALID_CHARACTER_AGGREGATE', report.issues.map(issue => issue.message).join('; '));

        tx.stageMutation({
          domain: makeDomainID('CHARACTER'),
          entityId: id,
          entityData: payload.character,
          ownerCapability: CHARACTER_OWNER_CAPABILITY,
          authoritativeOwner: makeSystemID('CHARACTER_SYSTEM'),
        });

        return success({ characterId: id });
      },
    }],
  };
}
