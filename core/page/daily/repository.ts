import { Result, success, failure } from '../../types/result.ts';
import { DailyPageProductionPackage } from './types.ts';

export interface DailyPageRepository {
  get(pageId: string): Result<DailyPageProductionPackage | null>;
  save(pkg: DailyPageProductionPackage): Result<boolean>;
  list(universeId?: string): Result<DailyPageProductionPackage[]>;
  clear(): void;
}

export class InMemoryDailyPageRepository implements DailyPageRepository {
  private readonly pages = new Map<string, DailyPageProductionPackage>();

  public get(pageId: string): Result<DailyPageProductionPackage | null> {
    return success(this.pages.get(pageId) ?? null);
  }

  public save(pkg: DailyPageProductionPackage): Result<boolean> {
    if (!pkg?.pageId) {
      return failure('INVALID_PAGE_PACKAGE', 'Daily Page package must have a pageId.');
    }

    if (this.pages.has(String(pkg.pageId))) {
      return failure(
        'DUPLICATE_PAGE_PACKAGE',
        `Daily Page package "${String(pkg.pageId)}" already exists.`
      );
    }

    this.pages.set(String(pkg.pageId), structuredClone(pkg));
    return success(true);
  }

  public list(universeId?: string): Result<DailyPageProductionPackage[]> {
    const values = Array.from(this.pages.values());
    const filtered = universeId
      ? values.filter(item => item.universeId === universeId)
      : values;
    return success(structuredClone(filtered));
  }

  public clear(): void {
    this.pages.clear();
  }
}
