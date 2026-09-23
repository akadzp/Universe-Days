/** Phase 28 — Production Output Validator.
 * Enforces structured schema contracts and guarantees that AI proposals
 * cannot cross authority boundaries or mutate canon.
 */

import type { AIProposal } from '../../INFRA/AI/types.ts';
import type { OutputValidationContract, ValidationResult, ValidationViolation } from '../../INFRA/VALIDATION/types.ts';

const DEFAULT_FORBIDDEN_KEYS = new Set([
  'mutateCanon',
  'mutation',
  'storagePath',
  'filesystemPath',
  'permissionGrant',
  'ownerOverride',
  'authorizationOverride',
  'directPersistence',
  'applyTransition',
  'deterministicId',
  'transactionId',
  'canonMutation',
  'commitState',
  'assignIdentity',
  'writeStorage',
  'systemOverride',
  'createLocation',
  'createCharacter',
  'rewriteTimeline',
  'setPeriodPredecessor',
  'overrideAuthority',
  'canonState'
]);

function inspectForbiddenKeys(value: unknown, forbidden: Set<string>, path = '$'): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      violations.push(...inspectForbiddenKeys(value[i], forbidden, `${path}[${i}]`));
    }
    return violations;
  }
  if (!value || typeof value !== 'object') return violations;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbidden.has(key)) {
      violations.push({
        path: `${path}.${key}`,
        rule: 'AUTHORITY_BOUNDARY',
        message: `Attempted to inject forbidden authoritative property '${key}'.`
      });
    }
    violations.push(...inspectForbiddenKeys(child, forbidden, `${path}.${key}`));
  }
  return violations;
}

export class ProductionOutputValidator {
  private readonly forbiddenKeys: Set<string>;

  public constructor(customForbiddenKeys?: readonly string[]) {
    this.forbiddenKeys = new Set([
      ...DEFAULT_FORBIDDEN_KEYS,
      ...(customForbiddenKeys ?? [])
    ]);
  }

  public validateProposal<T>(proposal: AIProposal<T>, contract?: OutputValidationContract): ValidationResult<T> {
    const violations: ValidationViolation[] = [];

    if (!proposal.proposalId) {
      violations.push({
        path: '$.proposalId',
        rule: 'IDENTITY_REQUIRED',
        message: 'Proposal is missing unique deterministic identifier.'
      });
    }

    if (proposal.status !== 'PROPOSED') {
      violations.push({
        path: '$.status',
        rule: 'STATUS_INVALID',
        message: `Expected status PROPOSED, but found '${proposal.status}'.`
      });
    }

    if (!proposal.response) {
      violations.push({
        path: '$.response',
        rule: 'RESPONSE_REQUIRED',
        message: 'AI generation response payload is missing.'
      });
    } else {
      const parsed = proposal.response.parsed;
      const rawText = proposal.response.rawText;

      // Check forbidden keys in parsed output
      if (parsed && typeof parsed === 'object') {
        const forbiddenFound = inspectForbiddenKeys(parsed, this.forbiddenKeys);
        violations.push(...forbiddenFound);
      }

      // Check required properties if contract specifies them
      if (contract?.requiredProperties && parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        for (const reqProp of contract.requiredProperties) {
          if (record[reqProp] === undefined) {
            violations.push({
              path: `$.${reqProp}`,
              rule: 'REQUIRED_PROPERTY',
              message: `Missing required property '${reqProp}'.`
            });
          }
        }
      }

      // Check max length if contract specifies
      if (contract?.maxCharacters && rawText && rawText.length > contract.maxCharacters) {
        violations.push({
          path: '$.response.rawText',
          rule: 'MAX_CHARACTERS_EXCEEDED',
          message: `Raw text length ${rawText.length} exceeds maximum ${contract.maxCharacters}.`
        });
      }
    }

    const valid = violations.length === 0;
    return Object.freeze({
      valid,
      ...(valid ? {} : { reason: violations.map(v => `${v.rule}: ${v.message} (${v.path})`).join('; ') }),
      violations: Object.freeze(violations),
      sanitized: valid ? (proposal.response?.parsed as T) : undefined
    });
  }

  public validate<T>(candidate: T, contract?: OutputValidationContract): ValidationResult<T> {
    const violations: ValidationViolation[] = [];

    if (candidate && typeof candidate === 'object') {
      violations.push(...inspectForbiddenKeys(candidate, this.forbiddenKeys));
    }

    if (contract?.requiredProperties && candidate && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      for (const reqProp of contract.requiredProperties) {
        if (record[reqProp] === undefined) {
          violations.push({
            path: `$.${reqProp}`,
            rule: 'REQUIRED_PROPERTY',
            message: `Missing required property '${reqProp}'.`
          });
        }
      }
    }

    const valid = violations.length === 0;
    return Object.freeze({
      valid,
      ...(valid ? {} : { reason: violations.map(v => `${v.rule}: ${v.message}`).join('; ') }),
      violations: Object.freeze(violations),
      sanitized: valid ? candidate : undefined
    });
  }
}
