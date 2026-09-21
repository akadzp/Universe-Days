# Pocer Universe Engine

## PROJECT
**Pocer Universe Engine**

## CURRENT PHASE
**Phase 2: Runtime Rule Engine + Compact Rule Model + Binary/Enum/State Evaluation**

The objective of this phase is to make the engine capable of representing, organizing, and evaluating rules with mathematical determinism, compact representation, and zero external side effects before any Universe modules are implemented.

---

## CORE ARCHITECTURAL PRINCIPLES

1. **Four Architectural Distinctions**:
   - **SPECIFICATION**: Canonical definitions of rules, constraints, and state domains (`rules/registry/index.json`, `core/types/rules.ts`).
   - **RUNTIME RULE**: Compact, versioned, executable representation of a rule with precondition guards, condition trees, and declarative action outputs (`RuntimeRule`).
   - **EXECUTION STATE**: Explicit runtime context snapshot containing only boolean flags, finite enum values, numeric state values, and verified constraints (`ExecutionContextData`, `CompactRuntimeContext`).
   - **DECISION RESULT**: Deterministic outcome detailing rule statuses (`PASSED`, `FAILED`, `BLOCKED`, `NOT_APPLICABLE`), condition traces, failure reasons, and emitted state actions (`RuleResult`, `GateResult`).

2. **No LLM in Rule Evaluation**:
   - Condition and gate evaluation is purely mathematical and algorithmic.
   - LLMs are never invoked during rule evaluation, state mutation, or transition gating.
   - The LLM receives only the minimal, task-scoped subset of rules routed by the engine.

3. **Strict Determinism & Reproducibility**:
   - Given identical input context and rules, execution order and results are 100% identical across all platforms and runs.
   - Zero reliance on wall-clock timestamps, pseudo-random generators, hidden memory, environment state, or remote services.

---

## ARCHITECTURE MODULES & CAPABILITIES

### 1. Compact Runtime Rule Model (`core/types/rules.ts`)
- **`RuntimeRule`**: Lightweight, versioned rule schema featuring:
  - `ruleId`, `version`, `domain`, `owner`, `severity`, `enabled`
  - `dependencies`: Explicit list of required prerequisite rules
  - `preconditions`: Prerequisite conditions that must pass for the rule to apply
  - `conditions`: Logical condition tree (AND, OR, NOT, EQ, NEQ, GT, GTE, LT, LTE, IN, CONTAINS)
  - `forbiddenConditions`: Invariant violations that immediately block the rule
  - `actions`: Declarative state mutations (`SET_FLAG`, `CLEAR_FLAG`, `SET_ENUM`, `EMIT_EVENT`)

### 2. Composable Condition Evaluator (`core/engine/conditions.ts`)
- Evaluates scalar comparisons and recursive logical expressions (`AND`, `OR`, `NOT`) against execution context paths.
- Returns detailed structured trace trees documenting exact matched and failed operands.

### 3. Binary & State Architecture (`core/engine/state/`)
- **`BooleanStateManager`**: Strict boolean type enforcement with declared flags, mutual exclusivity group checks, and safe derivation functions.
- **`BitmaskRegistry`**: Fast, compact 32-bit bitmask representation for up to 31 named binary flags with collision prevention and validation.
- **`EnumStateManager`**: Strict finite state value enforcement with default states, registered transition graphs, and state locking.

### 4. Guarded State Machine (`core/engine/state-machine.ts`)
- Extended `GenericStateMachine` featuring:
  - Transition guards (`StateTransitionGuard`) that inspect payloads before state changes.
  - Audit history tracking with timestamps, trigger events, and transition metadata.
  - Safe rollback and reset mechanisms.

### 5. Dependency Analysis & Cycle Detection (`core/engine/dependency-graph.ts`)
- Built-in Kahn's topological sort algorithm to determine strictly deterministic evaluation order.
- Depth-First Search cycle detection to identify circular and indirect dependencies.
- Validation checks for missing or disabled dependency prerequisites.

### 6. Deterministic Rule Evaluator (`core/engine/rule-evaluator.ts`)
- Evaluates rules in topological sequence.
- Enforces prerequisite dependency passing before evaluating conditions.
- Enforces preconditions and validates forbidden conditions.
- Produces atomic actions only when all conditions strictly PASS.

### 7. Logical Gate Engine (`core/engine/gate-engine.ts`)
- Evaluates multi-rule composite gates under `ALL`, `ANY`, or `NONE` reduction modes.
- Distinguishes between failed and blocked constituent rules.

### 8. Context Builder & Rule Router (`core/engine/context-builder.ts`, `core/engine/rule-router.ts`)
- **`RuleRouter`**: Resolves minimal rule sets by requested task domains and explicitly declared rule IDs with transitive dependency inclusion.
- **`ContextBuilder`**: Compiles compact runtime execution contexts omitting unnecessary document bloat.

---

## VERIFICATION & TEST HARNESS

The project includes an end-to-end deterministic test suite with **78 passing tests across 20 suites**:

```bash
# Run all unit tests, integration tests, and golden tests
npm test

# Run TypeScript linter
npm run lint

# Build full-stack application
npm run build
```

### Test Coverage Highlights:
- **Unit Tests (`tests/unit/engine/`)**:
  - `conditions.test.ts`: Evaluation of all comparison and logical operators.
  - `boolean-state.test.ts`: Mutual exclusivity, flag declarations, and derived state.
  - `bitmask.test.ts`: Bit position allocations, mask validations, and combining flags.
  - `enum-state.test.ts`: Allowed transitions, default values, and unknown value rejection.
  - `state-machine-p2.test.ts`: Transition guards, state stability on failure, and audit trail.
  - `dependency-graph.test.ts`: Direct/indirect cycle detection, topological sorting, and missing dependencies.
  - `rule-evaluator.test.ts`: Preconditions, forbidden conditions, actions, and dependency gating.
  - `gate-engine.test.ts`: `ALL`, `ANY`, and `NONE` gate reductions.
  - `rule-router.test.ts`: Domain routing, transitive dependency resolution, and disabled rule exclusion.
  - `context-builder.test.ts`: Compact context generation.
- **Integration Tests (`tests/integration/engine/`)**:
  - `runtime-pipeline.test.ts`: Complete pipeline execution from Task &rarr; Router &rarr; Context &rarr; Evaluator &rarr; Gate &rarr; State Transition.
- **Golden Tests (`tests/golden/`)**:
  - `runtime-rule.golden.test.ts`: Verifies frozen deterministic evaluation fixtures against fixed expected outputs.

---

## NOT YET IMPLEMENTED (STRICT PHASE BOUNDARY)

In strict accordance with Phase 2 scope boundaries, the following modules are intentionally excluded:
- Daily Universe
- Daily Page
- Daily Story
- Narrator
- Character engine
- Relationship engine
- Object engine
- Knowledge engine
- Location engine
- Production database
- Gemini production integration
- Persistent storage
- Actual Universe data
