/** Phase 27 — deterministic Production Context Compiler. */

import { deterministicKey, hash32, stableSerialize } from '../shared.ts';
import { CharacterRatioTokenEstimator, TokenBudget, TokenBudgetManager } from '../token/budget.ts';
import { TokenContextPlanner, ContextPriority, TokenContextItem } from '../token/context-plan.ts';
import { DeterministicContextCompressor, ContextCompressionPolicy } from './compressor.ts';
import type { ContextPack, ContextSegment, ContextSegmentKind } from './segments.ts';
import type { UniverseModel } from '../../universe/model/universe.ts';
import type { UniversePeriodContext } from '../../universe/daily/initialization.ts';
import type { StoryProductionPackage } from '../../story/daily/orchestrator.ts';
import type { DailyPageProductionPackage } from '../../page/daily/types.ts';
import type { AIProductionContext } from '../ai/types.ts';

export type ProductionContextPurpose = 'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION';
export type ContextDomain =
  | 'CHARACTERS'
  | 'RELATIONSHIPS'
  | 'OBJECTS'
  | 'KNOWLEDGE'
  | 'STATES'
  | 'LOCATIONS'
  | 'EVENTS'
  | 'PROCESSES'
  | 'UNRESOLVED_CONDITIONS'
  | 'CONTINUITY'
  | 'STORY'
  | 'PAGE';

export interface ProductionContextRequest {
  readonly universe: UniverseModel;
  readonly universeScope: string;
  readonly purpose: ProductionContextPurpose;
  readonly userInstruction: string;
  readonly dailyContext?: UniversePeriodContext;
  readonly storyPackage?: StoryProductionPackage;
  readonly pagePackage?: DailyPageProductionPackage;
  readonly budget: TokenBudget;
  readonly includeDomains?: readonly ContextDomain[];
  readonly systemInstruction?: string;
  readonly maxCharacters?: number;
}

export interface CompiledProductionContext {
  readonly context: AIProductionContext;
  readonly contextPack: ContextPack;
  readonly tokenPlanId: string;
  readonly sourceFingerprint: string;
  readonly compilerVersion: string;
  readonly estimatedInputTokens: number;
  readonly droppedContextIds: readonly string[];
}

const COMPILER_VERSION = '27.0.0';

const defaultDomains: readonly ContextDomain[] = Object.freeze([
  'CHARACTERS',
  'RELATIONSHIPS',
  'STATES',
  'LOCATIONS',
  'EVENTS',
  'PROCESSES',
  'UNRESOLVED_CONDITIONS',
  'CONTINUITY',
  'STORY',
  'PAGE'
]);

const domainFieldMap: Record<ContextDomain, keyof UniverseModel | null> = {
  CHARACTERS: 'characters',
  RELATIONSHIPS: 'relationships',
  OBJECTS: 'objects',
  KNOWLEDGE: 'knowledge',
  STATES: 'states',
  LOCATIONS: 'locations',
  EVENTS: 'events',
  PROCESSES: 'processes',
  UNRESOLVED_CONDITIONS: 'unresolvedConditions',
  CONTINUITY: null,
  STORY: null,
  PAGE: null
};

function compactJson(value: unknown): string {
  return JSON.stringify(value, (_key, child) => {
    if (typeof child === 'undefined') return undefined;
    return child;
  });
}

function countMap(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.keys(value as Record<string, unknown>).length;
}

function summarizeMap(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, entity]) => [id, entity])
  );
}

function priorityFor(kind: ContextSegmentKind): ContextPriority {
  switch (kind) {
    case 'SYSTEM':
    case 'RULE':
      return 'CRITICAL';
    case 'UNIVERSE':
    case 'CONTINUITY':
    case 'STORY':
    case 'PAGE':
      return 'HIGH';
    case 'USER':
      return 'CRITICAL';
    default:
      return 'NORMAL';
  }
}

function makeSegment(
  id: string,
  kind: ContextSegmentKind,
  content: string,
  priority: number,
  compression: ContextSegment['compression'] = 'NONE'
): ContextSegment {
  return Object.freeze({
    id,
    kind,
    priority,
    content,
    sourceFingerprint: hash32(stableSerialize(content)),
    compression
  });
}

export class ProductionContextCompiler {
  public readonly version = COMPILER_VERSION;

  private readonly budgetManager = new TokenBudgetManager(new CharacterRatioTokenEstimator());
  private readonly planner = new TokenContextPlanner();
  private readonly compressor = new DeterministicContextCompressor();

  public compile(request: ProductionContextRequest): CompiledProductionContext {
    this.validateRequest(request);

    const selectedDomains = new Set(request.includeDomains ?? defaultDomains);
    const segments: ContextSegment[] = [];

    const systemInstruction = request.systemInstruction ?? [
      'You are a non-authoritative production AI inside the Pocer Universe Engine.',
      'Use only the supplied authoritative context.',
      'Do not invent canonical facts that are not supported by the context.',
      'Do not create authoritative IDs, permissions, storage paths, transactions, or state mutations.',
      'Return a proposal that will be validated by the deterministic engine.'
    ].join(' ');

    segments.push(makeSegment('SYSTEM_PRODUCTION_RULES', 'SYSTEM', systemInstruction, 100));
    segments.push(makeSegment('RULE_AUTHORITY_BOUNDARY', 'RULE', [
      'Universe truth belongs to the deterministic owner systems.',
      'Temporal truth belongs to the Temporal System.',
      'Character, relationship, object, knowledge, state, location, continuity, story, and page truth remain owner-controlled.',
      'The AI output is proposal data only.'
    ].join('\n'), 95));

    const temporal = request.universe.temporalContext;
    segments.push(makeSegment(
      'UNIVERSE_IDENTITY',
      'UNIVERSE',
      compactJson({
        universeId: request.universe.universeId,
        universeScope: request.universeScope,
        currentUniverseDate: temporal.currentUniverseDate,
        currentUniverseTime: temporal.currentUniverseTime,
        currentPeriodRef: temporal.currentPeriodRef ?? null,
        activeTimezoneOrEra: temporal.activeTimezoneOrEra ?? null,
        purpose: request.purpose
      }),
      90
    ));

    const domainOrder: readonly ContextDomain[] = [
      'CHARACTERS', 'RELATIONSHIPS', 'OBJECTS', 'KNOWLEDGE', 'STATES', 'LOCATIONS',
      'EVENTS', 'PROCESSES', 'UNRESOLVED_CONDITIONS'
    ];

    for (const domain of domainOrder) {
      if (!selectedDomains.has(domain)) continue;
      const field = domainFieldMap[domain];
      if (!field) continue;
      const source = request.universe[field];
      const count = countMap(source);
      segments.push(makeSegment(
        `UNIVERSE_DOMAIN_${domain}`,
        'UNIVERSE',
        compactJson({ domain, count, entities: summarizeMap(source) }),
        domain === 'CHARACTERS' || domain === 'STATES' ? 86 : 72
      ));
    }

    if (selectedDomains.has('CONTINUITY')) {
      segments.push(makeSegment(
        'CONTINUITY_STATE',
        'CONTINUITY',
        compactJson({
          universe: request.universe.continuityContext,
          periodContinuity: request.dailyContext?.continuityItems ?? [],
          unresolvedConditions: request.dailyContext?.unresolvedConditions ?? []
        }),
        84
      ));
    }

    if (request.dailyContext) {
      segments.push(makeSegment(
        'DAILY_PERIOD_STATE',
        'UNIVERSE',
        compactJson({
          period: request.dailyContext.period,
          initializationMode: request.dailyContext.initializationMode,
          processes: request.dailyContext.processes,
          futureInfo: request.dailyContext.futureInfo,
          events: request.dailyContext.events,
          consequences: request.dailyContext.consequences
        }),
        82
      ));
    }

    if (selectedDomains.has('STORY') && request.storyPackage) {
      segments.push(makeSegment(
        'STORY_PRODUCTION_PACKAGE',
        'STORY',
        compactJson({
          storyId: request.storyPackage.storyId,
          storyDate: request.storyPackage.storyDate,
          trigger: request.storyPackage.trigger,
          scope: request.storyPackage.scope,
          handoff: request.storyPackage.handoff,
          lifecycleStatus: request.storyPackage.lifecycleStatus,
          validationReport: request.storyPackage.validationReport
        }),
        88
      ));
    }

    if (selectedDomains.has('PAGE') && request.pagePackage) {
      segments.push(makeSegment(
        'PAGE_PRODUCTION_PACKAGE',
        'PAGE',
        compactJson(request.pagePackage),
        88
      ));
    }

    segments.push(makeSegment('USER_INSTRUCTION', 'USER', request.userInstruction.trim(), 100));

    const compressionPolicy: ContextCompressionPolicy = {
      maxCharacters: request.maxCharacters ?? Math.max(4096, (request.budget.inputLimit - request.budget.outputReserve - request.budget.safetyReserve) * 4),
      preserveKinds: ['SYSTEM', 'RULE', 'USER'],
      allowDrop: true
    };

    const contextPack = this.compressor.compress(segments, compressionPolicy);
    const items: TokenContextItem[] = contextPack.segments.map(segment => ({
      id: segment.id,
      content: `${segment.kind}: ${segment.content}`,
      priority: priorityFor(segment.kind),
      reusable: segment.kind !== 'USER'
    }));

    const plan = this.planner.plan(
      items,
      request.budget,
      value => new CharacterRatioTokenEstimator().estimateInput(value).inputTokens
    );

    const accepted = [...plan.items].sort((a, b) => a.id.localeCompare(b.id));
    const finalBlocks = Object.freeze(accepted.map(item => item.content));
    const sourceFingerprint = hash32(stableSerialize({
      compilerVersion: COMPILER_VERSION,
      universe: request.universe.universeId,
      scope: request.universeScope,
      purpose: request.purpose,
      segments: segments.map(segment => [segment.id, segment.sourceFingerprint]),
      dropped: [...contextPack.droppedSegmentIds, ...plan.droppedIds].sort()
    }));
    const contextId = deterministicKey('PRODCTX', sourceFingerprint, request.userInstruction, request.budget, request.purpose);

    const authoritativeReferences: Record<string, string> = {
      universeId: request.universe.universeId,
      universeScope: request.universeScope,
      universeDate: temporal.currentUniverseDate,
      universeTime: temporal.currentUniverseTime,
      compilerVersion: COMPILER_VERSION,
      sourceFingerprint
    };

    if (temporal.currentPeriodRef) authoritativeReferences.periodRef = temporal.currentPeriodRef;
    if (request.storyPackage) authoritativeReferences.storyId = request.storyPackage.storyId;
    if (request.pagePackage) authoritativeReferences.pageId = String(request.pagePackage.pageId);

    const context: AIProductionContext = Object.freeze({
      contextId,
      universeId: request.universe.universeId,
      universeScope: request.universeScope,
      authoritativeReferences: Object.freeze(authoritativeReferences),
      systemInstruction,
      userInstruction: request.userInstruction.trim(),
      contextBlocks: finalBlocks
    });

    return Object.freeze({
      context,
      contextPack,
      tokenPlanId: plan.planId,
      sourceFingerprint,
      compilerVersion: COMPILER_VERSION,
      estimatedInputTokens: finalBlocks.reduce((sum, block) => sum + Math.ceil(block.length / 4), 0),
      droppedContextIds: Object.freeze([...new Set([...contextPack.droppedSegmentIds, ...plan.droppedIds])].sort())
    });
  }

  private validateRequest(request: ProductionContextRequest): void {
    if (!request.universe?.universeId) throw new Error('Production context requires a UniverseModel with universeId.');
    if (!request.universeScope) throw new Error('Production context requires universeScope.');
    if (!request.userInstruction?.trim()) throw new Error('Production context requires a user instruction.');
    if (request.budget.inputLimit <= 0) throw new Error('Production context inputLimit must be positive.');
    if (request.budget.outputReserve < 0 || request.budget.safetyReserve < 0) throw new Error('Production context reserves cannot be negative.');
    if (request.purpose === 'DAILY_STORY' && !request.storyPackage && !request.dailyContext) {
      throw new Error('DAILY_STORY context requires dailyContext or storyPackage.');
    }
    if (request.purpose === 'DAILY_PAGE' && !request.pagePackage && !request.dailyContext) {
      throw new Error('DAILY_PAGE context requires dailyContext or pagePackage.');
    }
  }
}
