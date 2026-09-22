import { deterministicKey, err, freezeDeep, hash32, ok, stableSerialize } from '../shared.ts';
import { PageCatalogSnapshot, PageDefinition, PageDefinitionInput } from './types.ts';

export class PageCatalog {
  private readonly pages = new Map<string, PageDefinition>();
  private catalogVersion = 1;

  public register(input: PageDefinitionInput): PageDefinition {
    this.validateInput(input);
    const pageDefinitionId = deterministicKey(
      'PAGEDEF', input.universeId, input.universeScope, input.pageKey, input.pageScope
    );
    const next: PageDefinition = Object.freeze({
      pageDefinitionId,
      universeId: input.universeId,
      universeScope: input.universeScope,
      pageKey: input.pageKey,
      pageScope: input.pageScope,
      status: input.status ?? 'ENABLED',
      revision: input.revision ?? 1,
      priority: input.priority ?? 0,
      ...(input.shardKey ? { shardKey: input.shardKey } : {}),
      ...(input.concurrencyClass ? { concurrencyClass: input.concurrencyClass } : {}),
      tags: Object.freeze([...(input.tags ?? [])].map(v => v.trim()).filter(Boolean).sort()),
      configFingerprint: hash32(stableSerialize(input.config ?? {}))
    });
    this.pages.set(pageDefinitionId, next);
    this.catalogVersion += 1;
    return next;
  }

  public update(pageDefinitionId: string, patch: Partial<Omit<PageDefinition, 'pageDefinitionId' | 'configFingerprint'>> & { readonly config?: Record<string, unknown> }): PageDefinition {
    const current = this.pages.get(pageDefinitionId);
    if (!current) throw new Error(`Unknown page definition: ${pageDefinitionId}`);
    const next = Object.freeze({
      ...current,
      ...patch,
      ...(patch.tags ? { tags: Object.freeze([...patch.tags].map(v => v.trim()).filter(Boolean).sort()) } : {}),
      ...(patch.config ? { configFingerprint: hash32(stableSerialize(patch.config)) } : {})
    });
    this.pages.set(pageDefinitionId, next as PageDefinition);
    this.catalogVersion += 1;
    return next as PageDefinition;
  }

  public disable(pageDefinitionId: string): PageDefinition {
    return this.update(pageDefinitionId, { status: 'DISABLED' });
  }

  public enable(pageDefinitionId: string): PageDefinition {
    return this.update(pageDefinitionId, { status: 'ENABLED' });
  }

  public get(pageDefinitionId: string) {
    return this.pages.get(pageDefinitionId) ?? null;
  }

  public list(options?: { readonly universeId?: string; readonly enabledOnly?: boolean }): readonly PageDefinition[] {
    return [...this.pages.values()]
      .filter(page => !options?.universeId || page.universeId === options.universeId)
      .filter(page => !options?.enabledOnly || page.status === 'ENABLED')
      .sort((a, b) => b.priority - a.priority || a.pageDefinitionId.localeCompare(b.pageDefinitionId));
  }

  public snapshot(): PageCatalogSnapshot {
    const definitions = this.list();
    return freezeDeep({
      catalogVersion: this.catalogVersion,
      catalogFingerprint: hash32(stableSerialize(definitions)),
      definitions: Object.freeze(definitions)
    });
  }

  public selectShard(shardIndex: number, shardCount: number): readonly PageDefinition[] {
    if (!Number.isInteger(shardIndex) || !Number.isInteger(shardCount) || shardCount <= 0 || shardIndex < 0 || shardIndex >= shardCount) {
      throw new Error('Invalid shard parameters.');
    }
    return this.list({ enabledOnly: true }).filter(page => {
      const value = Number.parseInt(hash32(page.pageDefinitionId), 16);
      return value % shardCount === shardIndex;
    });
  }

  public inspect(pageDefinitionId: string) {
    const page = this.get(pageDefinitionId);
    return page ? ok(page) : err('PAGE_DEFINITION_NOT_FOUND', `Page definition ${pageDefinitionId} not found.`);
  }

  private validateInput(input: PageDefinitionInput): void {
    for (const [key, value] of Object.entries(input)) {
      if (['revision', 'priority', 'config'].includes(key)) continue;
      if (value === undefined || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(`PageDefinitionInput.${key} is required.`);
      }
    }
  }
}
