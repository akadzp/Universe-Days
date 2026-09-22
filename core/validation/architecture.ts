/**
 * Phase 12: Architecture registry validation.
 */

import { DOMAIN_OWNERS } from '../architecture/ownership.ts';
import { ValidationFinding } from './types.ts';

export function validateOwnershipRegistry(): readonly ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const ownerIds = new Set<string>();
  const domainIds = new Set<string>();

  for (const [domainKey, owner] of Object.entries(DOMAIN_OWNERS)) {
    const domain = String(owner.domainId);
    const ownerId = String(owner.ownerId);

    if (domain !== domainKey) {
      findings.push({
        checkId: 'OWNERSHIP_REGISTRY',
        code: 'DOMAIN_KEY_MISMATCH',
        path: `DOMAIN_OWNERS.${domainKey}.domainId`,
        message: `Domain key ${domainKey} does not match registered domainId ${domain}.`,
        severity: 'ERROR'
      });
    }

    if (domainIds.has(domain)) {
      findings.push({
        checkId: 'OWNERSHIP_REGISTRY',
        code: 'DUPLICATE_DOMAIN_ID',
        path: `DOMAIN_OWNERS.${domainKey}`,
        message: `Duplicate domainId ${domain}.`,
        severity: 'ERROR'
      });
    }
    domainIds.add(domain);

    if (ownerIds.has(ownerId)) {
      findings.push({
        checkId: 'OWNERSHIP_REGISTRY',
        code: 'DUPLICATE_OWNER_ID',
        path: `DOMAIN_OWNERS.${domainKey}.ownerId`,
        message: `Owner ${ownerId} is assigned to more than one domain.`,
        severity: 'ERROR'
      });
    }
    ownerIds.add(ownerId);

    if (!Number.isInteger(owner.authorityLevel) || owner.authorityLevel < 1) {
      findings.push({
        checkId: 'OWNERSHIP_REGISTRY',
        code: 'INVALID_AUTHORITY_LEVEL',
        path: `DOMAIN_OWNERS.${domainKey}.authorityLevel`,
        message: `Authority level for ${domainKey} must be a positive integer.`,
        severity: 'ERROR'
      });
    }
  }

  return findings;
}
