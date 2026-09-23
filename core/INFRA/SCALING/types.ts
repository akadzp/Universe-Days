/** Phase 15 — scalable page catalog contracts. */

export type PageDefinitionStatus = 'ENABLED' | 'DISABLED';

export interface PageDefinition {
  readonly pageDefinitionId: string;
  readonly universeId: string;
  readonly universeScope: string;
  readonly pageKey: string;
  readonly pageScope: string;
  readonly status: PageDefinitionStatus;
  readonly revision: number;
  readonly priority: number;
  readonly shardKey?: string;
  readonly concurrencyClass?: string;
  readonly tags: readonly string[];
  readonly configFingerprint: string;
}

export interface PageDefinitionInput {
  readonly universeId: string;
  readonly universeScope: string;
  readonly pageKey: string;
  readonly pageScope: string;
  readonly revision?: number;
  readonly priority?: number;
  readonly shardKey?: string;
  readonly concurrencyClass?: string;
  readonly tags?: readonly string[];
  readonly status?: PageDefinitionStatus;
  readonly config?: Record<string, unknown>;
}

export interface PageCatalogSnapshot {
  readonly catalogVersion: number;
  readonly catalogFingerprint: string;
  readonly definitions: readonly PageDefinition[];
}
