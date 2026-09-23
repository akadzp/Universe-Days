import { Result, success, failure } from '../../../SHARED/result.ts';
import { EngineErrorCode } from '../../../SHARED/errors.ts';

export class BooleanStateManager {
  private flags: Map<string, boolean> = new Map();
  private knownFlags: Set<string> = new Set();
  private mutuallyExclusiveGroups: Set<string>[] = [];

  constructor(initialKnownFlags?: string[]) {
    if (initialKnownFlags) {
      for (const flag of initialKnownFlags) {
        this.knownFlags.add(flag);
      }
    }
  }

  /**
   * Registers a known flag identifier.
   */
  public declareFlag(name: string): this {
    if (!name || typeof name !== 'string') {
      throw new Error('Flag name must be a non-empty string');
    }
    this.knownFlags.add(name);
    return this;
  }

  /**
   * Defines a group of flags where only one can be true at any time.
   * e.g., ['ACTIVE', 'INACTIVE'], ['READY', 'BLOCKED']
   */
  public defineMutuallyExclusiveGroup(flags: string[]): this {
    for (const f of flags) {
      this.declareFlag(f);
    }
    this.mutuallyExclusiveGroups.push(new Set(flags));
    return this;
  }

  /**
   * Sets an explicit boolean value for a flag.
   * Strictly enforces boolean type (no truthy/falsy coercion).
   */
  public setFlag(name: string, value: boolean): Result<boolean> {
    if (typeof value !== 'boolean') {
      return failure(EngineErrorCode.INVALID_STATE, `Flag value must be an explicit boolean, got ${typeof value}`);
    }
    if (!name || typeof name !== 'string') {
      return failure(EngineErrorCode.INVALID_STATE, 'Flag name must be a valid string');
    }

    // If knownFlags is populated, ensure flag is recognized
    if (this.knownFlags.size > 0 && !this.knownFlags.has(name)) {
      return failure(EngineErrorCode.UNKNOWN_FLAG, `Unknown flag "${name}". Flag must be declared before use.`);
    }

    // If setting to true, check mutually exclusive groups
    if (value === true) {
      for (const group of this.mutuallyExclusiveGroups) {
        if (group.has(name)) {
          for (const sibling of group) {
            if (sibling !== name && this.flags.get(sibling) === true) {
              return failure(
                EngineErrorCode.INVALID_STATE,
                `Conflicting flag update: Flag "${name}" cannot be set to true while mutually exclusive flag "${sibling}" is true.`
              );
            }
          }
        }
      }
    }

    this.flags.set(name, value);
    return success(value);
  }

  /**
   * Clears a flag (sets to false or removes).
   */
  public clearFlag(name: string): Result<boolean> {
    return this.setFlag(name, false);
  }

  /**
   * Retrieves a flag's boolean value.
   * Returns undefined if the flag is unset.
   */
  public getFlag(name: string): boolean | undefined {
    return this.flags.get(name);
  }

  /**
   * Asserts that a flag exists and has a defined boolean value.
   * Returns failure if flag is unknown or unset.
   */
  public requireFlag(name: string): Result<boolean> {
    if (this.knownFlags.size > 0 && !this.knownFlags.has(name)) {
      return failure(EngineErrorCode.UNKNOWN_FLAG, `Required flag "${name}" is not a recognized declared flag.`);
    }
    const val = this.flags.get(name);
    if (val === undefined) {
      return failure(EngineErrorCode.INVALID_STATE, `Required flag "${name}" has not been set.`);
    }
    return success(val);
  }

  /**
   * Evaluates whether a flag is strictly true.
   * Throws or returns failure if the flag is unknown.
   */
  public evaluateFlag(name: string): Result<boolean> {
    const req = this.requireFlag(name);
    if (req.status !== 'SUCCESS') {
      return req;
    }
    return success(req.data === true);
  }

  /**
   * Derives a new boolean value from explicit inputs.
   * Derived state is reproducible and does not mutate permanent state unless explicitly assigned.
   */
  public derive(name: string, computeFn: (manager: BooleanStateManager) => boolean): Result<boolean> {
    try {
      const derivedValue = computeFn(this);
      if (typeof derivedValue !== 'boolean') {
        return failure(EngineErrorCode.INVALID_STATE, 'Derivation function must return an explicit boolean');
      }
      return success(derivedValue);
    } catch (err: unknown) {
      return failure(EngineErrorCode.EVALUATION_ERROR, `Error computing derived flag "${name}": ${String(err)}`);
    }
  }

  /**
   * Returns a snapshot of all active boolean flags.
   */
  public toRecord(): Record<string, boolean> {
    const record: Record<string, boolean> = {};
    for (const [k, v] of this.flags.entries()) {
      record[k] = v;
    }
    return record;
  }

  /**
   * Clears all flag state.
   */
  public reset(): void {
    this.flags.clear();
  }
}
