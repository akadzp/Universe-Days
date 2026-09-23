import { deterministicKey } from '../../SHARED/platform.ts';
import { HardeningPolicy } from '../../INFRA/HARDENING/policy.ts';

export interface GuardResult {
  readonly allowed: boolean;
  readonly code?: string;
  readonly message?: string;
}

export class RuntimeGuards {
  public constructor(private readonly policy: HardeningPolicy) {}

  public validatePageBatch(size: number): GuardResult {
    return size <= this.policy.maxPageBatchSize
      ? { allowed: true }
      : { allowed: false, code: 'PAGE_BATCH_LIMIT', message: `Page batch size ${size} exceeds limit ${this.policy.maxPageBatchSize}.` };
  }

  public validateContext(characters: number): GuardResult {
    return characters <= this.policy.maxContextCharacters
      ? { allowed: true }
      : { allowed: false, code: 'CONTEXT_LIMIT', message: `Context size ${characters} exceeds limit ${this.policy.maxContextCharacters}.` };
  }

  public validateTokenBudget(tokens: number): GuardResult {
    return tokens <= this.policy.maxTokenBudget
      ? { allowed: true }
      : { allowed: false, code: 'TOKEN_LIMIT', message: `Token budget ${tokens} exceeds limit ${this.policy.maxTokenBudget}.` };
  }

  public idempotencyKey(namespace: string, input: unknown): string {
    return deterministicKey('IDEMP', namespace, input);
  }
}
