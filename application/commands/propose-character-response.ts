import { success, failure } from '../../core/SHARED/result.ts';
import type { WorkflowDefinition } from '../../core/RUNTIME/ENGINE/workflow.ts';
import type { ProposeCharacterResponsePayload } from '../contracts.ts';

export function proposeCharacterResponseWorkflow(
  payload: ProposeCharacterResponsePayload,
): WorkflowDefinition {
  return {
    workflowId: `APP_PROPOSE_CHARACTER_RESPONSE_${payload.characterId}_${payload.eventId ?? 'NONE'}`,
    name: 'Application Propose Character Response',
    steps: [{
      stepId: 'BUILD_PROPOSAL',
      name: 'Build non-authoritative character response proposal',
      executor: (ctx) => {
        const character = ctx.universeSnapshot.characters[payload.characterId];
        if (!character) {
          return failure('CHARACTER_NOT_FOUND', `Character '${payload.characterId}' was not found.`);
        }

        return success({
          authoritative: false,
          characterId: payload.characterId,
          eventId: payload.eventId,
          instruction: payload.instruction,
          characterProfile: character.profile,
        });
      },
    }],
  };
}
