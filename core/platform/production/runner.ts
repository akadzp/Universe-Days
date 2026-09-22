/** Phase 34 — hardened deterministic real production runner. */
import { deterministicKey, hash32, stableSerialize } from '../shared.ts';
import type { ProductionContextCompiler } from '../context/compiler.ts';
import type { AIProductionService } from '../ai/production.ts';
import type { SemanticCache } from '../cache/semantic-cache.ts';
import type { CostController } from '../cost/controller.ts';
import type { FileProductionStore } from '../persistence/file.ts';
import { ProductionOutputValidator } from '../validation/validator.ts';
import type { ProductionRunInput, ProductionRunResult } from './types.ts';
import type { AIProductionPolicy } from '../ai/types.ts';

const MAX_USER_INSTRUCTION_CHARS = 8_000;
const MAX_OUTPUT_TOKENS = 65_536;
const PURPOSES = new Set(['DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION']);

export class ProductionRunner {
  private readonly validator = new ProductionOutputValidator();

  public constructor(
    private readonly contextCompiler: ProductionContextCompiler,
    private readonly ai: AIProductionService,
    private readonly semanticCache: SemanticCache<any>,
    private readonly costController: CostController,
    private readonly productionStore: FileProductionStore
  ) {}

  private validateRuntimeInput(input: ProductionRunInput): string | null {
    if (input.purpose !== undefined && !PURPOSES.has(input.purpose)) return 'Unsupported production purpose.';
    if (input.userInstruction !== undefined && input.userInstruction.length > MAX_USER_INSTRUCTION_CHARS) return `userInstruction exceeds ${MAX_USER_INSTRUCTION_CHARS} characters.`;
    if (input.maxOutputTokens !== undefined && (!Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens < 1 || input.maxOutputTokens > MAX_OUTPUT_TOKENS)) return `maxOutputTokens must be an integer between 1 and ${MAX_OUTPUT_TOKENS}.`;
    if (input.temperature !== undefined && (!Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2)) return 'temperature must be a finite number between 0 and 2.';
    return null;
  }

  public async run(input: ProductionRunInput = {}): Promise<ProductionRunResult> {
    const purpose = input.purpose ?? 'GENERAL_PRODUCTION';
    const universe = input.universe;
    const universeId = universe?.universeId;
    const universeScope = input.universeScope ?? 'GLOBAL';
    const userInstruction = input.userInstruction?.trim() || 'Generate production output for the current authoritative Universe.';
    const invalid = this.validateRuntimeInput({ ...input, userInstruction });

    if (invalid) {
      const runId = deterministicKey('RUN', universeId ?? 'UNRESOLVED', universeScope, purpose, userInstruction, 'INVALID_INPUT');
      const result: ProductionRunResult = Object.freeze({ runId, status: 'BLOCKED', universeId, universeScope, purpose, timestamp: universe?.temporalContext.currentUniverseTime ?? 'UNRESOLVED', inputTokens: 0, outputTokens: 0, cost: 0, reason: invalid });
      await this.productionStore.save(result);
      return result;
    }

    if (!universe) {
      const runId = deterministicKey('RUN', 'UNMOUNTED', universeScope, purpose, userInstruction);
      const result: ProductionRunResult = Object.freeze({ runId, status: 'BLOCKED', universeId, universeScope, purpose, timestamp: 'UNRESOLVED', inputTokens: 0, outputTokens: 0, cost: 0, reason: 'Authoritative Universe context is required for production execution.' });
      await this.productionStore.save(result);
      return result;
    }

    const runId = deterministicKey(
      'RUN',
      universeId,
      universeScope,
      universe.temporalContext.currentUniverseDate,
      universe.temporalContext.currentUniverseTime,
      purpose,
      input.dailyContext?.period?.periodId ?? 'NO_PERIOD',
      input.storyPackage?.storyId ?? 'NO_STORY',
      input.pagePackage?.pageId ? String(input.pagePackage.pageId) : 'NO_PAGE',
      userInstruction,
      hash32(stableSerialize(universe))
    );
    const timestamp = universe.temporalContext.currentUniverseTime;

    if (!this.ai.hasProvider()) {
      const result: ProductionRunResult = Object.freeze({ runId, status: 'FAILED', universeId, universeScope, purpose, timestamp, inputTokens: 0, outputTokens: 0, cost: 0, reason: 'No external AI provider is connected to generate proposals.' });
      await this.productionStore.save(result);
      return result;
    }

    const estimatedOutput = input.maxOutputTokens ?? 2048;
    const budget = Object.freeze({ inputLimit: 8192, outputReserve: estimatedOutput, safetyReserve: 256 });
    let compiled;
    try {
      compiled = this.contextCompiler.compile({ universe, universeScope, purpose, userInstruction, dailyContext: input.dailyContext, storyPackage: input.storyPackage, pagePackage: input.pagePackage, budget, maxCharacters: 24_000 });
    } catch (err) {
      const result: ProductionRunResult = Object.freeze({ runId, status: 'BLOCKED', universeId, universeScope, purpose, timestamp, inputTokens: 0, outputTokens: 0, cost: 0, reason: err instanceof Error ? err.message : String(err) });
      await this.productionStore.save(result);
      return result;
    }

    const contextFingerprint = compiled.sourceFingerprint;
    const authDecision = this.costController.authorize({ runId, providerClass: 'default', inputTokens: compiled.estimatedInputTokens, outputTokens: estimatedOutput, namespace: purpose });
    if (!authDecision.allowed) {
      const result: ProductionRunResult = Object.freeze({ runId, status: 'BLOCKED', universeId, universeScope, purpose, timestamp, inputTokens: 0, outputTokens: 0, cost: 0, contextFingerprint, reason: authDecision.reason ?? 'Token/Cost controller budget authorization rejected.' });
      await this.productionStore.save(result);
      return result;
    }

    const cacheRequest = { namespace: purpose, intent: userInstruction, contextFingerprint, modelProfile: 'default', generation: 1 };
    if (!input.bypassCache) {
      const cached = this.semanticCache.find(cacheRequest);
      if (cached) {
        this.costController.release(runId);
        const result: ProductionRunResult = Object.freeze({ runId, status: 'CACHED', universeId, universeScope, purpose, timestamp, inputTokens: 0, outputTokens: 0, cost: 0, contextFingerprint, cached: true, output: cached.value });
        await this.productionStore.save(result);
        return result;
      }
    }

    try {
      const policy: AIProductionPolicy = { routing: input.routing ?? { preferredTier: 'HIGH_CAPABILITY' }, rejectAuthorityClaims: true, maxContextCharacters: 24_000 };
      const proposal = await this.ai.propose(compiled.context, policy, { maxOutputTokens: estimatedOutput, temperature: input.temperature ?? 0.2 });
      const validation = this.validator.validateProposal(proposal);
      if (!validation.valid) {
        this.costController.release(runId);
        const result: ProductionRunResult = Object.freeze({ runId, status: 'FAILED', universeId, universeScope, purpose, timestamp, inputTokens: proposal.response?.usage?.inputTokens ?? 0, outputTokens: proposal.response?.usage?.outputTokens ?? 0, cost: 0, contextFingerprint, reason: `Proposal failed output validation: ${validation.reason}` });
        await this.productionStore.save(result);
        return result;
      }

      const inputTokens = proposal.response?.usage?.inputTokens ?? compiled.estimatedInputTokens;
      const outputTokens = proposal.response?.usage?.outputTokens ?? 0;
      const commit = this.costController.commit(runId, inputTokens, outputTokens);
      const outputData = proposal.response?.parsed ?? proposal.response?.rawText;
      this.semanticCache.put(cacheRequest, outputData, inputTokens + outputTokens);
      const result: ProductionRunResult = Object.freeze({ runId, status: 'COMPLETED', universeId, universeScope, purpose, timestamp, inputTokens: commit.inputTokens, outputTokens: commit.outputTokens, cost: commit.cost, providerId: proposal.response?.providerId, modelId: proposal.response?.modelId, contextFingerprint, output: outputData });
      await this.productionStore.save(result);
      return result;
    } catch (err) {
      this.costController.release(runId);
      const result: ProductionRunResult = Object.freeze({ runId, status: 'FAILED', universeId, universeScope, purpose, timestamp, inputTokens: 0, outputTokens: 0, cost: 0, contextFingerprint, reason: err instanceof Error ? err.message : String(err) });
      await this.productionStore.save(result);
      return result;
    }
  }
}
