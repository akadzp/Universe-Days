/** Phase 29 — Real Production Runner Types. */
import type { UniverseModel } from '../../../UNIVERSE/CANON/universe.ts';
import type { UniversePeriodContext } from '../../../UNIVERSE/DAILY-CYCLE/initialization.ts';
import type { StoryProductionPackage } from '../../../DAILY-STORY/orchestrator.ts';
import type { DailyPageProductionPackage } from '../../../DAILY-PAGE/types.ts';
import type { ModelRoutingPolicy } from '../../MODEL/types.ts';
import type { ProductionContextPurpose } from '../../CONTEXT/compiler.ts';
export interface ProductionRunInput {
  readonly universeId?: string; readonly universeScope?: string; readonly purpose?: ProductionContextPurpose; readonly userInstruction?: string; readonly universe?: UniverseModel; readonly dailyContext?: UniversePeriodContext; readonly storyPackage?: StoryProductionPackage; readonly pagePackage?: DailyPageProductionPackage; readonly pageDefinitionIds?: readonly string[]; readonly bypassCache?: boolean; readonly routing?: ModelRoutingPolicy; readonly maxOutputTokens?: number; readonly temperature?: number;
}
export interface ProductionRunResult {
  readonly runId: string; readonly status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CACHED'; readonly universeId?: string; readonly universeScope?: string; readonly purpose: string; readonly timestamp: string; readonly inputTokens: number; readonly outputTokens: number; readonly cost: number; readonly providerId?: string; readonly modelId?: string; readonly output?: unknown; readonly reason?: string; readonly cached?: boolean; readonly contextFingerprint?: string;
}
