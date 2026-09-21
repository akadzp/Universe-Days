import { TaskID, DomainID, RuleID, makeTaskID } from '../types/identifiers.ts';
import { RuleRegistryEngine } from './rule-engine.ts';
import { RuntimeRule } from '../types/rules.ts';
import { DependencyGraph } from './dependency-graph.ts';

export interface TaskRouteDefinition {
  taskId: TaskID | string;
  taskType?: string;
  requiredDomains: (DomainID | string)[];
  requiredRuleIds?: (RuleID | string)[];
  includeDependencies?: boolean;
}

export interface RuleRoutingResult {
  taskId: TaskID | string;
  taskType?: string;
  selectedRules: RuntimeRule[];
  resolvedDomains: string[];
  resolvedRuleIds: string[];
  missingRuleIds?: string[];
  disabledRuleIds?: string[];
}

export class RuleRouter {
  constructor(private registry: RuleRegistryEngine) {}

  /**
   * Deterministically resolves executable rules required for a specific task definition.
   *
   * Flow:
   * 1. Task -> required domains & specific rule IDs
   * 2. Transitively expand dependencies so dependent rules are included
   * 3. Filter for executable (enabled) rules
   * 4. Topologically order by dependency graph
   */
  public resolveRulesForTask(taskDef: TaskRouteDefinition): RuleRoutingResult {
    const allRegisteredRules = this.registry.getAllRules();
    const domains = (taskDef.requiredDomains || []).map(String);
    const specificIds = (taskDef.requiredRuleIds || []).map(String);
    const includeDeps = taskDef.includeDependencies !== false; // Default true

    const rulesMap = new Map<string, RuntimeRule>();
    for (const r of allRegisteredRules) {
      rulesMap.set(String(r.ruleId), r);
    }

    const selectedIds = new Set<string>();
    const missingRuleIds = new Set<string>();
    const disabledRuleIds = new Set<string>();

    // Add matching by domain
    for (const r of allRegisteredRules) {
      if (domains.includes(String(r.domain))) {
        selectedIds.add(String(r.ruleId));
      }
    }

    // Add explicitly requested IDs
    for (const id of specificIds) {
      if (!rulesMap.has(id)) {
        missingRuleIds.add(id);
      } else {
        selectedIds.add(id);
      }
    }

    // Transitively resolve dependencies if enabled
    if (includeDeps) {
      const toExplore = Array.from(selectedIds);
      while (toExplore.length > 0) {
        const currentId = toExplore.pop()!;
        const rule = rulesMap.get(currentId);
        if (!rule) continue;

        for (const dep of rule.dependencies || []) {
          const depId = String(dep);
          if (!rulesMap.has(depId)) {
            missingRuleIds.add(depId);
          } else if (!selectedIds.has(depId)) {
            selectedIds.add(depId);
            toExplore.push(depId);
          }
        }
      }
    }

    // Filter enabled rules
    const executableRules: RuntimeRule[] = [];
    for (const id of selectedIds) {
      const rule = rulesMap.get(id);
      if (rule) {
        if (rule.enabled) {
          executableRules.push(rule);
        } else {
          disabledRuleIds.add(id);
        }
      }
    }

    // Order rules topologically if possible, or deterministically by ruleId
    const orderRes = DependencyGraph.getEvaluationOrder(executableRules);
    let finalOrderedRules: RuntimeRule[] = [];

    if (orderRes.status === 'SUCCESS' && orderRes.data) {
      const orderedIdMap = new Map(executableRules.map(r => [String(r.ruleId), r]));
      finalOrderedRules = orderRes.data.map(id => orderedIdMap.get(id)!).filter(Boolean);
    } else {
      // Fallback deterministic sort by ruleId
      finalOrderedRules = [...executableRules].sort((a, b) =>
        String(a.ruleId).localeCompare(String(b.ruleId))
      );
    }

    return {
      taskId: taskDef.taskId,
      taskType: taskDef.taskType,
      selectedRules: finalOrderedRules,
      resolvedDomains: Array.from(new Set(finalOrderedRules.map(r => String(r.domain)))),
      resolvedRuleIds: finalOrderedRules.map(r => String(r.ruleId)),
      missingRuleIds: Array.from(missingRuleIds),
      disabledRuleIds: Array.from(disabledRuleIds)
    };
  }
}
