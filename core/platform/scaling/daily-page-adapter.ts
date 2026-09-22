import type { DailyPageProductionInput, DailyPageRun } from '../../page/daily/types.ts';
import { DailyPagePipeline } from '../../page/daily/pipeline.ts';
import { PageDefinition } from './types.ts';

export interface DailyPageInputFactory<TContext> {
  create(page: PageDefinition, sharedContext: TContext): DailyPageProductionInput;
}

export class DailyPageAdapter<TContext> {
  public constructor(private readonly pipeline: DailyPagePipeline) {}

  public run(page: PageDefinition, sharedContext: TContext, factory: DailyPageInputFactory<TContext>) {
    const input = factory.create(page, sharedContext);
    return this.pipeline.run(input) as ReturnType<DailyPagePipeline['run']>;
  }

  public static extractData(result: ReturnType<DailyPagePipeline['run']>): DailyPageRun | null {
    return result.success && result.data ? result.data : null;
  }
}
