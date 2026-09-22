import assert from 'node:assert/strict';
import { assessCharacterChange, ContinuityCheckStatus, ContinuityCheckType } from '../../../core/universe/model/continuity.ts';

const info = assessCharacterChange({
  previousKnown: false,
  currentKnown: true,
  hasNarrativeBasis: false,
  contradictsExistingData: false
});
assert.equal(info.classification, 'NEW_INFORMATION');

const change = assessCharacterChange({
  previousKnown: true,
  currentKnown: true,
  hasNarrativeBasis: true,
  contradictsExistingData: true
});
assert.equal(change.classification, 'VALID_CHANGE');

const conflict = assessCharacterChange({
  previousKnown: true,
  currentKnown: true,
  hasNarrativeBasis: false,
  contradictsExistingData: true
});
assert.equal(conflict.classification, 'CONFLICT');

assert.equal(ContinuityCheckType.IDENTITY, 'IDENTITY');
assert.equal(ContinuityCheckStatus.CONSISTENT, 'CONSISTENT');
