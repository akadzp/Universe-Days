import { PocerExecutionEngine } from '../../../core/engine/orchestrator.ts';
import { RuleRegistryEngine } from '../../../core/engine/rule-engine.ts';
import { UniverseCommand } from '../../../core/engine/command.ts';
import { WorkflowDefinition } from '../../../core/engine/workflow.ts';
import { EngineExecutionStatus } from '../../../core/engine/result.ts';
import { makeSystemID, makeDomainID } from '../../../core/types/identifiers.ts';
import { MockCharacterDomainAdapter } from '../../../core/domains/mocks/character-mock.ts';
import { DomainRegistry } from '../../../core/domains/registry.ts';
import { Result, success } from '../../../core/types/result.ts';

// Dummy implementation sesuai interface UniverseRepository yang dibutuhkan Orchestrator
class DummyUniverseRepository {
  public getUniverse(id: string): Result<any> {
    return success({
      universeId: id,
      temporalContext: { currentUniverseTime: '2024-01-01T08:00:00Z', currentPeriodRef: 'PERIOD_1' },
      characters: { 'CHAR_ABSTRACT_01': { conditionStatus: 'NORMAL' } },
      relationships: {}, objects: {}, knowledge: {}, states: {}, locations: {}, events: {}, processes: {}, unresolvedConditions: {}, continuityContext: { activeChainRefs: [] }
    });
  }
  public saveUniverse(universe: any, actor: any): Result<boolean> {
    return success(true);
  }
}

export async function runIntegrationScenario() {
  const repository = new DummyUniverseRepository();
  const ruleRegistry = new RuleRegistryEngine();
  
  const domainRegistry = DomainRegistry.getInstance();
  domainRegistry.reset();
  domainRegistry.registerAdapter(new MockCharacterDomainAdapter());

  const engine = new PocerExecutionEngine({ repository, ruleRegistry });

  const command: UniverseCommand = {
    commandId: 'CMD_GENERIC_01',
    commandType: 'MUTATE_CHARACTER',
    requestedBy: makeSystemID('ENGINE_SYSTEM'), // Sesuai otoritas di orchestrator.ts
    target: { domain: makeDomainID('CHARACTER'), entityId: 'CHAR_ABSTRACT_01' },
    input: { targetCondition: 'ACTIVE' },
    universeContext: { universeId: 'UNV_TEST' },
    executionMode: 'TRANSACTIONAL',
    requestedAt: Date.now(),
    correlationId: 'CORR_01'
  };

  const workflow: WorkflowDefinition = {
    workflowId: 'WF_GENERIC_01',
    name: 'Generic End-to-End Workflow',
    steps: [
      {
        stepId: 'STEP_REQUEST_CHANGE',
        name: 'Domain Request and Apply',
        executor: async (ctx, tx) => {
          tx.stageMutation({
            domain: makeDomainID('CHARACTER'),
            entityId: 'CHAR_ABSTRACT_01',
            entityData: { conditionStatus: 'ACTIVE' },
            authoritativeOwner: makeSystemID('CHARACTER_SYSTEM')
          });
          return success({ status: 'STAGED' });
        }
      }
    ]
  };

  const result = await engine.executeCommand(command, workflow);
  return result;
}
