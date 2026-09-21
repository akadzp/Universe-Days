import { RuleID } from '../types/identifiers.ts';
import { RuntimeRule } from '../types/rules.ts';
import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';

export interface DependencyValidationResult {
  valid: boolean;
  orderedRuleIds: string[];
  cycles: string[][];
  missingDependencies: Record<string, string[]>;
  disabledDependencies: Record<string, string[]>;
}

export class DependencyGraph {
  /**
   * Builds an adjacency list representation from an array of runtime rules.
   * Node -> list of rules that it depends on.
   */
  public static buildAdjacencyList(rules: RuntimeRule[]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const rule of rules) {
      const id = String(rule.ruleId);
      const deps = (rule.dependencies || []).map(String);
      adj.set(id, deps);
    }
    return adj;
  }

  /**
   * Detects if there are circular dependencies among the specified rules using depth-first search.
   * Returns failure with CIRCULAR_DEPENDENCY and cycle path if any cycle is detected.
   */
  public static detectCycles(rules: RuntimeRule[]): Result<null, string> {
    const adj = DependencyGraph.buildAdjacencyList(rules);
    const visited = new Map<string, 'UNVISITED' | 'VISITING' | 'VISITED'>();

    for (const node of adj.keys()) {
      visited.set(node, 'UNVISITED');
    }

    const currentPath: string[] = [];

    const dfs = (node: string): string[] | null => {
      visited.set(node, 'VISITING');
      currentPath.push(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        // If neighbor is part of rules set
        if (!adj.has(neighbor)) continue;

        const status = visited.get(neighbor);
        if (status === 'VISITING') {
          // Cycle found!
          const cycleStartIdx = currentPath.indexOf(neighbor);
          return [...currentPath.slice(cycleStartIdx), neighbor];
        }
        if (status === 'UNVISITED') {
          const cycle = dfs(neighbor);
          if (cycle) return cycle;
        }
      }

      visited.set(node, 'VISITED');
      currentPath.pop();
      return null;
    };

    for (const node of adj.keys()) {
      if (visited.get(node) === 'UNVISITED') {
        const cycle = dfs(node);
        if (cycle) {
          return failure(
            EngineErrorCode.CIRCULAR_DEPENDENCY,
            `Circular dependency detected: ${cycle.join(' -> ')}`
          );
        }
      }
    }

    return success(null);
  }

  /**
   * Produces a topologically sorted list of rule IDs such that any dependency appears
   * before the rules that depend on it.
   */
  public static getEvaluationOrder(rules: RuntimeRule[]): Result<string[], string> {
    const cycleCheck = DependencyGraph.detectCycles(rules);
    if (cycleCheck.status !== 'SUCCESS') {
      return failure(cycleCheck.error as string, cycleCheck.message);
    }

    const adj = DependencyGraph.buildAdjacencyList(rules);
    const inDegree = new Map<string, number>();
    // Graph of: Dependency -> rules that depend on it
    const dependentsGraph = new Map<string, string[]>();

    for (const id of adj.keys()) {
      inDegree.set(id, 0);
      dependentsGraph.set(id, []);
    }

    for (const [id, deps] of adj.entries()) {
      for (const dep of deps) {
        if (dependentsGraph.has(dep)) {
          dependentsGraph.get(dep)!.push(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    // Sort queue initially for determinism
    queue.sort();

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      const dependents = dependentsGraph.get(current) || [];
      // Sort dependents for determinism
      dependents.sort();

      for (const dep of dependents) {
        const newDeg = (inDegree.get(dep) || 1) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) {
          queue.push(dep);
          queue.sort();
        }
      }
    }

    if (order.length !== rules.length) {
      return failure(EngineErrorCode.CIRCULAR_DEPENDENCY, 'Cycle or resolution failure during topological sort');
    }

    return success(order);
  }

  /**
   * Validates dependencies across a rule registry:
   * Checks for missing dependencies, disabled dependencies, and cycles.
   */
  public static validateRuleSet(
    rules: RuntimeRule[],
    allKnownRules: Map<string, RuntimeRule>
  ): Result<DependencyValidationResult, string> {
    const missingDependencies: Record<string, string[]> = {};
    const disabledDependencies: Record<string, string[]> = {};

    for (const rule of rules) {
      const id = String(rule.ruleId);
      const deps = rule.dependencies || [];

      for (const dep of deps) {
        const depId = String(dep);
        const target = allKnownRules.get(depId);

        if (!target) {
          if (!missingDependencies[id]) missingDependencies[id] = [];
          missingDependencies[id].push(depId);
        } else if (!target.enabled) {
          if (!disabledDependencies[id]) disabledDependencies[id] = [];
          disabledDependencies[id].push(depId);
        }
      }
    }

    if (Object.keys(missingDependencies).length > 0) {
      const firstRule = Object.keys(missingDependencies)[0];
      const missing = missingDependencies[firstRule].join(', ');
      return failure(
        EngineErrorCode.MISSING_DEPENDENCY,
        `Rule "${firstRule}" references missing dependencies: [${missing}]`
      );
    }

    if (Object.keys(disabledDependencies).length > 0) {
      const firstRule = Object.keys(disabledDependencies)[0];
      const disabled = disabledDependencies[firstRule].join(', ');
      return failure(
        EngineErrorCode.DISABLED_DEPENDENCY,
        `Rule "${firstRule}" references disabled dependencies: [${disabled}]`
      );
    }

    const orderRes = DependencyGraph.getEvaluationOrder(rules);
    if (orderRes.status !== 'SUCCESS') {
      return failure(orderRes.error as string, orderRes.message);
    }

    return success({
      valid: true,
      orderedRuleIds: orderRes.data || [],
      cycles: [],
      missingDependencies,
      disabledDependencies
    });
  }
}
