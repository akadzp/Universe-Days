/** Phase 28 — Output Contract & Validator Types. */

export interface ValidationViolation {
  readonly path: string;
  readonly rule: string;
  readonly message: string;
}

export interface ValidationResult<T = unknown> {
  readonly valid: boolean;
  readonly reason?: string;
  readonly violations: readonly ValidationViolation[];
  readonly sanitized?: T;
}

export interface OutputValidationContract {
  readonly schemaId?: string;
  readonly requiredProperties?: readonly string[];
  readonly forbiddenKeys?: readonly string[];
  readonly maxCharacters?: number;
  readonly disallowHtml?: boolean;
}
