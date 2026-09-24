import { strict as assert } from 'node:assert';
import {
  CHARACTER_OWNER_CAPABILITY,
  KNOWLEDGE_OWNER_CAPABILITY,
  isValidDomainOwnerCapability,
  getOwner
} from '../GOVERNANCE/ownership.ts';

assert(isValidDomainOwnerCapability(CHARACTER_OWNER_CAPABILITY));
assert(isValidDomainOwnerCapability(KNOWLEDGE_OWNER_CAPABILITY));
assert.equal(CHARACTER_OWNER_CAPABILITY.ownerId, getOwner('CHARACTER')?.ownerId);
assert.equal(KNOWLEDGE_OWNER_CAPABILITY.ownerId, getOwner('KNOWLEDGE')?.ownerId);

// A structurally identical object is not a valid capability proof.
const forged = Object.freeze({
  ownerId: CHARACTER_OWNER_CAPABILITY.ownerId,
  domainId: CHARACTER_OWNER_CAPABILITY.domainId
});
assert.equal(isValidDomainOwnerCapability(forged), false);

// A capability for another domain cannot authorize Character mutation.
assert.equal(
  KNOWLEDGE_OWNER_CAPABILITY.ownerId === getOwner('CHARACTER')?.ownerId &&
  KNOWLEDGE_OWNER_CAPABILITY.domainId === getOwner('CHARACTER')?.domainId,
  false
);

console.log('Cross-domain owner authorization contract: PASS');
