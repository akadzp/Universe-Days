/** Phase 29 — Real Production Runner.
 * Coordinates Context Compilation -> Cost Authorization -> AI Proposal -> Output Validation -> Persistence.
 */

import { deterministicKey, hash32, stableSerialize } from '../shared.ts';
import type { ProductionContextCompiler } from '../context/compiler.ts';
import type { AIProductionService } from '../ai/production.ts';
import type { SemanticCache } from '../cache/semantic-cache.ts';
import type { CostController } from '../cost/controller.ts';
import type { FileProductionStore } from '../persistence/file.ts';
import { ProductionOutputValidator } from '../validation/validator.ts';
import type { ProductionRunInput, ProductionRunResult } from './types.ts';
import type { AIProductionPolicy } from '../ai/types.ts';

export class ProductionRunner {
  private readonly validator = new ProductionOutputValidator();

  public constructor(
    private readonly contextCompiler: ProductionContextCompiler,
    private readonly ai: AIProductionService,
    private readonly semanticCache: SemanticCache<any>,
    private readonly costController: CostController,
    private readonly productionStore: FileProductionStore
  ) {}

  public async run(input: ProductionRunInput = {}): Promise<ProductionRunResult> {
    const timestamp = new Date().toISOString();
    const purpose = input.purpose ?? 'GENERAL_PRODUCTION';
    const universeId = input.universeId ?? input.universe?.universeId;
    const universeScope = input.universeScope ?? 'GLOBAL';

    const runId = deterministicKey(
      'RUN',
      universeId ?? 'LOCAL',
      universeScope,
      purpose,
      input.userInstruction ?? 'DEFAULT',
      Date.now()
    );

    // Guard: An authoritative universe context is required for true engine production
    if (!input.universe && !universeId) {
      const blockedResult: ProductionRunResult = Object.freeze({
        runId,
        status: 'BLOCKED',
        universeId,
        universeScope,
        purpose,
        timestamp,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        reason: 'Authoritative Universe context is required for production execution.'
      });
      await this.productionStore.save(blockedResult);
      return blockedResult;
    }

    if (!this.ai.hasProvider()) {
      const failedResult: ProductionRunResult = Object.freeze({
        runId,
        status: 'FAILED',
        universeId,
        universeScope,
        purpose,
        timestamp,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        reason: 'No external AI provider is connected to generate proposals.'
      });
      await this.productionStore.save(failedResult);
      return failedResult;
    }

    // Estimate budget & authorize with CostController
    const estimatedInput = 1024;
    const estimatedOutput = input.maxOutputTokens ?? 2048;
    const authDecision = this.costController.authorize({
      runId,
      providerClass: 'default',
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      namespace: purpose
    });

    if (!authDecision.allowed) {
      const blockedResult: ProductionRunResult = Object.freeze({
        runId,
        status: 'BLOCKED',
        universeId,
        universeScope,
        purpose,
        timestamp,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        reason: authDecision.reason ?? 'Token/Cost controller budget authorization rejected.'
      });
      await this.productionStore.save(blockedResult);
      return blockedResult;
    }

    // Check semantic cache
    const contextFingerprint = hash32(
      stableSerialize({
        universeId,
        universeScope,
        purpose,
        instruction: input.userInstruction
      })
    );

    const cacheRequest = {
      namespace: purpose,
      intent: input.userInstruction ?? 'DEFAULT',
      contextFingerprint,
      modelProfile: 'default',
      generation: 1
    };

    if (!input.bypassCache) {
      const cached = this.semanticCache.find(cacheRequest);
      if (cached) {
        this.costController.release(runId);
        const cachedResult: ProductionRunResult = Object.freeze({
          runId,
          status: 'CACHED',
          universeId,
          universeScope,
          purpose,
          timestamp,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          cached: true,
          output: cached.value
        });
        await this.productionStore.save(cachedResult);
        return cachedResult;
      }
    }

    try {
      // Build context & request AI proposal
      const authoritativeReferences: Record<string, string> = {
        universeId: universeId!,
        universeScope,
        purpose
      };

      const aiContext = {
        contextId: deterministicKey('CTX', runId),
        universeId: universeId!,
        universeScope,
        systemInstruction:
          'You are a production creative assistant. Generate proposals according to the strict deterministic engine contracts.',
        userInstruction: input.userInstruction ?? 'Generate production output for today.',
        authoritativeReferences,
        contextBlocks: [
          `Universe: ${universeId}`,
          `Purpose: ${purpose}`,
          `Instruction: ${input.userInstruction ?? 'Generate narrative or page content.'}`
        ]
      };

      const policy: AIProductionPolicy = {
        routing: input.routing ?? { preferredTier: 'HIGH_CAPABILITY' },
        rejectAuthorityClaims: true,
        maxContextCharacters: 16_000
      };

      const proposal = await this.ai.propose(aiContext, policy, {
        maxOutputTokens: input.maxOutputTokens ?? 2048,
        temperature: input.temperature ?? 0.2
      });

      // Validate proposal with ProductionOutputValidator
      const validation = this.validator.validateProposal(proposal);
      if (!validation.valid) {
        this.costController.release(runId);
        const failedResult: ProductionRunResult = Object.freeze({
          runId,
          status: 'FAILED',
          universeId,
          universeScope,
          purpose,
          timestamp,
          inputTokens: proposal.response?.usage?.inputTokens ?? 0,
          outputTokens: proposal.response?.usage?.outputTokens ?? 0,
          cost: 0,
          reason: `Proposal failed output validation: ${validation.reason}`
        });
        await this.productionStore.save(failedResult);
        return failedResult;
      }

      const inputTokens = proposal.response?.usage?.inputTokens ?? estimatedInput;
      const outputTokens = proposal.response?.usage?.outputTokens ?? 512;
      const commit = this.costController.commit(runId, inputTokens, outputTokens);

      const outputData = proposal.response?.parsed ?? proposal.response?.rawText;

      // Populate semantic cache
      this.semanticCache.put(cacheRequest, outputData, inputTokens + outputTokens);

      const completedResult: ProductionRunResult = Object.freeze({
        runId,
        status: 'COMPLETED',
        universeId,
        universeScope,
        purpose,
        timestamp,
        inputTokens: commit.inputTokens,
        outputTokens: commit.outputTokens,
        cost: commit.cost,
        providerId: proposal.response?.providerId,
        modelId: proposal.response?.modelId,
        output: outputData
      });

      await this.productionStore.save(completedResult);
      return completedResult;
    } catch (err) {
      this.costController.release(runId);
      const failedResult: ProductionRunResult = Object.freeze({
        runId,
        status: 'FAILED',
        universeId,
        universeScope,
        purpose,
        timestamp,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        reason: err instanceof Error ? err.message : String(err)
      });
      await this.productionStore.save(failedResult);
      return failedResult;
    }
  }
}
