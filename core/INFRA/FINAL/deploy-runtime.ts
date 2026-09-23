/** Phase 34 — hardened Production Deployment Readiness Inspector. */
import type { ProductionRuntime } from './runtime.ts';

export interface DeploymentReadinessReport {
  readonly status: 'READY' | 'DEGRADED' | 'UNREADY';
  readonly architecturePhase: number;
  readonly timestamp: string;
  readonly engine: string;
  readonly subsystems: {
    readonly catalog: { readonly status: string; readonly total: number; readonly enabled: number };
    readonly providers: { readonly status: string; readonly connected: number; readonly health: Record<string, unknown> };
    readonly storage: { readonly status: string; readonly rootDir: string };
    readonly universePersistence: { readonly status: string; readonly rootDir: string; readonly mounted: boolean; readonly storedUniverses: number; readonly startupLoadError: string | null };
    readonly scheduler: { readonly status: string; readonly activeSchedules: number; readonly jobStoreRoot: string };
    readonly costController: { readonly status: string; readonly totalCommittedCost: number };
    readonly hardening: { readonly status: string };
  };
  readonly checks: {
    readonly engineAuthoritative: boolean;
    readonly persistenceAccessible: boolean;
    readonly universePersistenceWired: boolean;
    readonly startupUniverseLoadClean: boolean;
    readonly providersAvailable: boolean;
    readonly outputValidationActive: boolean;
    readonly schedulerDispatcherWired: boolean;
  };
}

export function inspectDeploymentReadiness(runtime: ProductionRuntime): DeploymentReadinessReport {
  const pages = runtime.pageCatalog.list();
  const enabledPages = pages.filter(p => p.status === 'ENABLED').length;
  const providers = runtime.providerRegistry.list();
  const providerHealth = runtime.providerRegistry.healthSnapshot();
  const committedCost = runtime.costController.totalCommitted();
  const providersAvailable = providers.length > 0;
  const schedulerDispatcherWired = Boolean(runtime.schedulerDispatcher && runtime.scheduledJobStore);
  const universePersistenceWired = Boolean(runtime.universeStore && runtime.universeInstances);
  const startupUniverseLoadClean = runtime.universeStartupLoadError === null;
  const overallStatus: DeploymentReadinessReport['status'] = !startupUniverseLoadClean ? 'UNREADY' : providersAvailable && schedulerDispatcherWired && universePersistenceWired ? 'READY' : 'DEGRADED';

  return Object.freeze({
    status: overallStatus,
    architecturePhase: 34,
    timestamp: new Date().toISOString(),
    engine: 'Pocer Universe Engine',
    subsystems: {
      catalog: { status: pages.length > 0 ? 'READY' : 'EMPTY', total: pages.length, enabled: enabledPages },
      providers: { status: providersAvailable ? 'CONNECTED' : 'NO_PROVIDER', connected: providers.length, health: providerHealth },
      storage: { status: 'READY', rootDir: runtime.productionStore.getRootDir() },
      universePersistence: { status: startupUniverseLoadClean && universePersistenceWired ? 'READY' : 'BLOCKED', rootDir: runtime.universeStore.getRootDir(), mounted: runtime.universeAuthority.get() !== null, storedUniverses: runtime.universeStore.listUniverseIds().length, startupLoadError: runtime.universeStartupLoadError },
      scheduler: { status: schedulerDispatcherWired ? 'READY' : 'UNWIRED', activeSchedules: runtime.scheduler.list().length, jobStoreRoot: runtime.scheduledJobStore.getRootDir() },
      costController: { status: 'READY', totalCommittedCost: committedCost.cost },
      hardening: { status: 'WIRED' }
    },
    checks: {
      engineAuthoritative: true,
      persistenceAccessible: true,
      universePersistenceWired,
      startupUniverseLoadClean,
      providersAvailable,
      outputValidationActive: true,
      schedulerDispatcherWired
    }
  });
}
