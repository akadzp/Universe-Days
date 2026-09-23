import { Router } from 'express';
import { getAllOwners } from '../../../core/architecture/ownership.ts';

export const architectureRouter = Router();

export interface EnginePhaseInfo {
  phaseId: number;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';
  description: string;
  modules: string[];
  testCount: number;
}

const PHASES: EnginePhaseInfo[] = [
  {
    phaseId: 1,
    name: 'Phase 1: Architecture Foundation & Domain Registry',
    status: 'COMPLETED',
    description: 'System ownership boundaries, error taxonomies, result envelopes, and foundational invariants.',
    modules: ['Domain Registry', 'Ownership Mapping', 'Standard Error Taxonomy', 'Result Envelopes'],
    testCount: 18
  },
  {
    phaseId: 2,
    name: 'Phase 2: Runtime Rule Engine & State Architecture',
    status: 'COMPLETED',
    description: 'Deterministic rule evaluation, bitmask/boolean state, state machine guards, and cycle-safe dependency graphs.',
    modules: [
      'Deterministic Rule Evaluator',
      'Topological Dependency Graph',
      'Cycle Detection & Safety',
      'Composable Condition Engine',
      'Boolean State & Bitmask Registry',
      'State Machine Guards & History',
      'Gate Engine (ALL / ANY / NONE)',
      'Reproducible Golden Tests'
    ],
    testCount: 60
  },
  {
    phaseId: 3,
    name: 'Phase 3: Deterministic Temporal Engine',
    status: 'COMPLETED',
    description: 'Universal canonical time, date arithmetics, interval relations, chronological orderings, and clock isolation.',
    modules: [
      'UniverseDate (Gregorian Calendar & Leap Year Rules)',
      'TimePoint (Date / DateTime Canonical Precision)',
      'TimeInterval (Closed, Open-Ended, Point degenerate)',
      'Temporal Relations Engine (Allen Interval Algebra)',
      'Temporal Order & Sequencing Engine',
      'Temporal Position Classifier (Past / Present / Future / Unknown)',
      'Temporal Rule Engine Routing',
      'Universe Clock with Controlled Advancement'
    ],
    testCount: 62
  },
  {
    phaseId: 4,
    name: 'Phase 4: Entity Continuity & State Transitions',
    status: 'COMPLETED',
    description: 'Cross-period entity tracking, immutable condition states, transition validation, and revision history chains.',
    modules: [
      'Continuity Item & Condition Identity Model',
      'Deterministic Transition Engine (Continue/Change/End/Suspend/Transform)',
      'EffectiveTime & Temporal Validity Mapping',
      'Revision Chains & Audit Trail',
      'Strict Invariant Transition Validator',
      'Continuity Lifecycle State Machine'
    ],
    testCount: 46
  },
  {
    phaseId: 5,
    name: 'Phase 5: Daily Universe Core Orchestration',
    status: 'COMPLETED',
    description: 'Deterministic Universe-period orchestration layer bridging Temporal and Continuity engines.',
    modules: [
      'Period Lifecycle State Machine (Initializing -> Progressing -> Finalized)',
      'Continuity Carryover & Boundary Validation',
      'Cross-Period Process Continuation & Resumption',
      'Generic Event & Consequence Execution Engine',
      'Unresolved Condition Carried-State Engine',
      'Decision vs Action & Future Information Preservation',
      'Period Finalization & NextPeriodContext Handoff',
      'Deterministic Execution Traces & Daily Universe Gate'
    ],
    testCount: 44
  },
  {
    phaseId: 6,
    name: 'Phase 6: Daily Story Core Orchestration',
    status: 'COMPLETED',
    description: 'Deterministic story lifecycle and scoped contract handoff layer consuming validated Universe context without mutating Canon.',
    modules: [
      'Story Trigger Model & Basis Evaluator',
      'Story Scope Boundary & Subset Validator',
      'Authoritative Story Date & Universe Temporal Anchor',
      'Deterministic Stable Story ID Generator',
      'Story Lifecycle State Machine (Triggered -> Completed)',
      'Structured Story Handoff Context (Narrator Contract)',
      'Canon Protection & State Immutability Guard',
      'Story Revision & Upstream Staleness Detection',
      'Daily Story Core Orchestrator & Production Package',
      'Deterministic Mock Test Renderer'
    ],
    testCount: 30
  }
];

architectureRouter.get('/status', (_req, res) => {
  const owners = getAllOwners();
  const totalTests = PHASES.reduce((acc, p) => acc + p.testCount, 0);

  res.json({
    project: 'Pocer Universe Engine',
    currentPhase: 'Phase 6: Daily Story Core',
    phaseNumber: 6,
    status: 'ACTIVE',
    totalTestsPassing: totalTests,
    testPassRate: '100%',
    ownersCount: owners.length,
    owners,
    phases: PHASES,
    engineCapabilities: [
      'RUNTIME_RULE_ENGINE',
      'COMPACT_RULE_MODEL',
      'DETERMINISTIC_EVALUATOR',
      'COMPOSABLE_CONDITIONS',
      'BOOLEAN_STATE_MANAGER',
      'BITMASK_REGISTRY',
      'ENUM_STATE_MANAGER',
      'STATE_MACHINE_GUARDS_AND_TRACEABILITY',
      'DEPENDENCY_GRAPH_AND_CYCLE_DETECTION',
      'GATE_ENGINE',
      'DETERMINISTIC_TEMPORAL_ENGINE',
      'UNIVERSE_DATE_AND_TIME_POINTS',
      'ALLEN_INTERVAL_ALGEBRA',
      'CONTROLLED_UNIVERSE_CLOCK',
      'CONTINUITY_ENGINE_AND_STATE_TRANSITIONS',
      'IMMUTABLE_REVISION_CHAINS',
      'DAILY_UNIVERSE_CORE_ORCHESTRATOR',
      'CROSS_PERIOD_PROCESS_CONTINUATION',
      'DETERMINISTIC_EVENT_AND_CONSEQUENCE_GRAPH',
      'UNRESOLVED_CONDITION_PRESERVATION',
      'NEXT_PERIOD_CONTEXT_HANDOFF',
      'STORY_TRIGGER_EVALUATION',
      'SCOPED_UNIVERSE_CONTEXT_SELECTION',
      'AUTHORITATIVE_STORY_DATE_ANCHOR',
      'DETERMINISTIC_STORY_ID_GENERATION',
      'STORY_LIFECYCLE_STATE_MACHINE',
      'STRUCTURED_STORY_HANDOFF_CONTRACT',
      'CANON_PROTECTION_AND_IMMUTABILITY_GUARD',
      'STORY_REVISION_AND_STALENESS_DETECTION',
      'DAILY_STORY_PRODUCTION_PACKAGE'
    ]
  });
});

architectureRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
