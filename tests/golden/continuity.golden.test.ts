import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityValidator,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem
} from '../../core/universe/continuity/index.ts';

interface GoldenScenario {
  name: string;
  item: ContinuityItem;
  transitionType: TransitionType;
  effectiveTime: string;
  previousConditionId?: string;
  currentConditionId?: string;
  expectedStatus: string;
  expectedResultingStatus: ContinuityStatus;
  expectedAllowed: boolean;
}

const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    name: '1. CONTINUE',
    item: {
      identity: { continuityId: 'GOLD-01', entityRef: 'ENT_1', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_1', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.CONTINUE,
    effectiveTime: '2024-01-02',
    previousConditionId: 'C1',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ACTIVE,
    expectedAllowed: true
  },
  {
    name: '2. CHANGE',
    item: {
      identity: { continuityId: 'GOLD-02', entityRef: 'ENT_2', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_2', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.CHANGE,
    effectiveTime: '2024-01-02',
    previousConditionId: 'C1',
    currentConditionId: 'C2',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ACTIVE,
    expectedAllowed: true
  },
  {
    name: '3. END',
    item: {
      identity: { continuityId: 'GOLD-03', entityRef: 'ENT_3', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_3', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.END,
    effectiveTime: '2024-01-05',
    previousConditionId: 'C1',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ENDED,
    expectedAllowed: true
  },
  {
    name: '4. SUSPEND',
    item: {
      identity: { continuityId: 'GOLD-04', entityRef: 'ENT_4', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_4', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.SUSPEND,
    effectiveTime: '2024-01-03',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.SUSPENDED,
    expectedAllowed: true
  },
  {
    name: '5. RESUME',
    item: {
      identity: { continuityId: 'GOLD-05', entityRef: 'ENT_5', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.SUSPENDED,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_5', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.RESUME,
    effectiveTime: '2024-01-04',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ACTIVE,
    expectedAllowed: true
  },
  {
    name: '6. REPLACE',
    item: {
      identity: { continuityId: 'GOLD-06', entityRef: 'ENT_6', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_6', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.REPLACE,
    effectiveTime: '2024-01-05',
    previousConditionId: 'C1',
    currentConditionId: 'C_REPLACEMENT',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ACTIVE,
    expectedAllowed: true
  },
  {
    name: '7. UNKNOWN',
    item: {
      identity: { continuityId: 'GOLD-07', entityRef: 'ENT_7', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.UNKNOWN,
      currentConditionRef: null
    },
    transitionType: TransitionType.UNKNOWN,
    effectiveTime: '2024-01-01',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.UNKNOWN,
    expectedAllowed: true
  },
  {
    name: '8. UNRESOLVED',
    item: {
      identity: { continuityId: 'GOLD-08', entityRef: 'ENT_8', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C1', entityRef: 'ENT_8', domain: 'DOM_1', temporalValidity: '2024-01-01' }
    },
    transitionType: TransitionType.UNRESOLVED,
    effectiveTime: '2024-01-02',
    previousConditionId: 'C1',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.UNRESOLVED,
    expectedAllowed: true
  },
  {
    name: '9. Cross-Period Continuity (Dec 31 -> Jan 1)',
    item: {
      identity: { continuityId: 'GOLD-09', entityRef: 'ENT_9', domainRef: 'DOM_1', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C_DEC_31', entityRef: 'ENT_9', domain: 'DOM_1', temporalValidity: '2023-12-31' }
    },
    transitionType: TransitionType.CONTINUE,
    effectiveTime: '2024-01-01',
    previousConditionId: 'C_DEC_31',
    expectedStatus: 'VALID',
    expectedResultingStatus: ContinuityStatus.ACTIVE,
    expectedAllowed: true
  }
];

describe('Phase 4 - Continuity Golden Scenarios', () => {
  for (const scenario of GOLDEN_SCENARIOS) {
    it(`Golden: ${scenario.name}`, () => {
      const res = ContinuityValidator.validateTransition({
        item: scenario.item,
        transition: {
          type: scenario.transitionType,
          continuityId: scenario.item.identity.continuityId,
          previousConditionRef: scenario.previousConditionId
            ? {
                conditionId: scenario.previousConditionId,
                entityRef: scenario.item.identity.entityRef,
                domain: scenario.item.identity.domainRef,
                temporalValidity: scenario.item.currentConditionRef?.temporalValidity
              }
            : undefined,
          currentConditionRef: scenario.currentConditionId
            ? {
                conditionId: scenario.currentConditionId,
                entityRef: scenario.item.identity.entityRef,
                domain: scenario.item.identity.domainRef,
                temporalValidity: scenario.effectiveTime
              }
            : undefined,
          effectiveTime: EffectiveTime.create(scenario.effectiveTime)!
        }
      });

      assert.strictEqual(res.status, scenario.expectedStatus, `Status mismatch for ${scenario.name}`);
      assert.strictEqual(res.resultingStatus, scenario.expectedResultingStatus, `Resulting status mismatch for ${scenario.name}`);
      assert.strictEqual(res.allowed, scenario.expectedAllowed, `Allowed mismatch for ${scenario.name}`);
    });
  }
});
