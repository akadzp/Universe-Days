import type { ProductionContextPurpose } from '../../core/platform/context/compiler.ts';
import type { ModelRoutingPolicy, ModelTier } from '../../core/platform/model/types.ts';
import type { ProductionRunInput } from '../../core/platform/production/types.ts';
import type { DailyProductionBridgeInput } from '../../core/platform/production/daily-bridge.ts';

const MAX_INSTRUCTION_CHARS = 8_000;
const MAX_PAGE_INSTRUCTION_CHARS = 2_000;
const MAX_PAGE_IDS = 200;
const MAX_OUTPUT_TOKENS = 65_536;
const MAX_INPUT_TOKENS = 1_000_000;
const MODEL_TIERS: readonly ModelTier[] = ['LOCAL', 'LOW_COST', 'STANDARD', 'HIGH_CAPABILITY'];
const PURPOSES: readonly ProductionContextPurpose[] = ['DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION'];

export interface SanitizedProductionHttpInput {
  readonly purpose: ProductionContextPurpose;
  readonly userInstruction: string;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly routing?: ModelRoutingPolicy;
  readonly bypassCache: boolean;
  readonly pageDefinitionIds?: readonly string[];
  readonly pageInstructionPrefix?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function optionalInteger(value: unknown, name: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function optionalTemperature(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2) {
    throw new Error('temperature must be a finite number between 0 and 2.');
  }
  return value;
}

function parseRouting(value: unknown): ModelRoutingPolicy | undefined {
  if (value === undefined) return undefined;
  const input = asRecord(value);
  const preferredTier = input.preferredTier;
  if (typeof preferredTier !== 'string' || !MODEL_TIERS.includes(preferredTier as ModelTier)) {
    throw new Error('routing.preferredTier is invalid.');
  }

  const requireStructuredOutput = input.requireStructuredOutput;
  const requireVision = input.requireVision;
  if (requireStructuredOutput !== undefined && typeof requireStructuredOutput !== 'boolean') {
    throw new Error('routing.requireStructuredOutput must be boolean.');
  }
  if (requireVision !== undefined && typeof requireVision !== 'boolean') {
    throw new Error('routing.requireVision must be boolean.');
  }

  return Object.freeze({
    preferredTier: preferredTier as ModelTier,
    ...(requireStructuredOutput === undefined ? {} : { requireStructuredOutput }),
    ...(requireVision === undefined ? {} : { requireVision }),
    ...(input.maxInputTokens === undefined ? {} : { maxInputTokens: optionalInteger(input.maxInputTokens, 'routing.maxInputTokens', 1, MAX_INPUT_TOKENS) }),
    ...(input.maxOutputTokens === undefined ? {} : { maxOutputTokens: optionalInteger(input.maxOutputTokens, 'routing.maxOutputTokens', 1, MAX_OUTPUT_TOKENS) })
  });
}

export function parseProductionHttpInput(body: unknown, defaultPurpose: ProductionContextPurpose): SanitizedProductionHttpInput {
  const input = asRecord(body);
  const purposeRaw = input.purpose ?? defaultPurpose;
  if (typeof purposeRaw !== 'string' || !PURPOSES.includes(purposeRaw as ProductionContextPurpose)) {
    throw new Error('purpose must be DAILY_STORY, DAILY_PAGE, or GENERAL_PRODUCTION.');
  }

  const userInstruction = typeof input.userInstruction === 'string'
    ? input.userInstruction.trim()
    : 'Generate production output for the current authoritative Universe.';
  if (!userInstruction) throw new Error('userInstruction cannot be empty.');
  if (userInstruction.length > MAX_INSTRUCTION_CHARS) throw new Error(`userInstruction exceeds ${MAX_INSTRUCTION_CHARS} characters.`);

  let pageDefinitionIds: readonly string[] | undefined;
  if (input.pageDefinitionIds !== undefined) {
    if (!Array.isArray(input.pageDefinitionIds)) throw new Error('pageDefinitionIds must be an array of strings.');
    if (input.pageDefinitionIds.length > MAX_PAGE_IDS) throw new Error(`pageDefinitionIds may contain at most ${MAX_PAGE_IDS} items.`);
    const ids = input.pageDefinitionIds.map((value, index) => {
      if (typeof value !== 'string' || !value.trim()) throw new Error(`pageDefinitionIds[${index}] must be a non-empty string.`);
      return value.trim();
    });
    pageDefinitionIds = Object.freeze([...new Set(ids)]);
  }

  const pageInstructionPrefix = input.pageInstructionPrefix === undefined
    ? undefined
    : typeof input.pageInstructionPrefix === 'string'
      ? input.pageInstructionPrefix.trim()
      : (() => { throw new Error('pageInstructionPrefix must be a string.'); })();
  if (pageInstructionPrefix && pageInstructionPrefix.length > MAX_PAGE_INSTRUCTION_CHARS) {
    throw new Error(`pageInstructionPrefix exceeds ${MAX_PAGE_INSTRUCTION_CHARS} characters.`);
  }

  const bypassCache = input.bypassCache === undefined ? false : input.bypassCache;
  if (typeof bypassCache !== 'boolean') throw new Error('bypassCache must be boolean.');

  return Object.freeze({
    purpose: purposeRaw as ProductionContextPurpose,
    userInstruction,
    maxOutputTokens: optionalInteger(input.maxOutputTokens, 'maxOutputTokens', 1, MAX_OUTPUT_TOKENS),
    temperature: optionalTemperature(input.temperature),
    routing: parseRouting(input.routing),
    bypassCache,
    ...(pageDefinitionIds ? { pageDefinitionIds } : {}),
    ...(pageInstructionPrefix ? { pageInstructionPrefix } : {})
  });
}

export function toProductionRunInput(input: SanitizedProductionHttpInput, universe: ProductionRunInput['universe'], universeScope: string): ProductionRunInput {
  return Object.freeze({
    universe,
    universeId: universe?.universeId,
    universeScope,
    purpose: input.purpose,
    userInstruction: input.userInstruction,
    ...(input.maxOutputTokens === undefined ? {} : { maxOutputTokens: input.maxOutputTokens }),
    ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
    ...(input.routing ? { routing: input.routing } : {}),
    ...(input.bypassCache ? { bypassCache: true } : {}),
    ...(input.pageDefinitionIds ? { pageDefinitionIds: input.pageDefinitionIds } : {})
  });
}

export function toDailyBridgeInput(input: SanitizedProductionHttpInput, universe: DailyProductionBridgeInput['universe'], universeScope: string): DailyProductionBridgeInput {
  return Object.freeze({
    universe,
    universeScope,
    userInstruction: input.userInstruction,
    mode: input.purpose === 'DAILY_PAGE' ? 'PAGE_ONLY' : 'FULL_DAILY',
    ...(input.maxOutputTokens === undefined ? {} : { maxOutputTokens: input.maxOutputTokens }),
    ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
    ...(input.routing ? { routing: input.routing } : {}),
    ...(input.bypassCache ? { bypassCache: true } : {}),
    ...(input.pageDefinitionIds ? { pageDefinitionIds: input.pageDefinitionIds } : {}),
    ...(input.pageInstructionPrefix ? { pageInstructionPrefix: input.pageInstructionPrefix } : {})
  });
}
