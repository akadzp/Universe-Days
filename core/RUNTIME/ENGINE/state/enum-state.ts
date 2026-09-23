import { Result, success, failure } from '../../../SHARED/result.ts';
import { EngineErrorCode } from '../../../SHARED/errors.ts';

export interface EnumDefinition {
  name: string;
  allowedValues: string[];
  defaultValue?: string;
  allowedTransitions?: Record<string, string[]>;
  description?: string;
}

export class EnumStateManager {
  private definitions: Map<string, EnumDefinition> = new Map();
  private currentValues: Map<string, string> = new Map();

  /**
   * Registers a new enum definition with allowed finite values.
   */
  public registerEnum(def: EnumDefinition): Result<EnumDefinition> {
    if (!def || !def.name || typeof def.name !== 'string') {
      return failure(EngineErrorCode.INVALID_STATE, 'Enum name must be a non-empty string');
    }
    if (!Array.isArray(def.allowedValues) || def.allowedValues.length === 0) {
      return failure(EngineErrorCode.INVALID_STATE, 'Enum must have at least one allowed value');
    }

    // Check unique allowed values
    const uniqueValues = new Set(def.allowedValues);
    if (uniqueValues.size !== def.allowedValues.length) {
      return failure(EngineErrorCode.INVALID_STATE, `Duplicate values detected in enum "${def.name}" definition`);
    }

    if (def.defaultValue && !uniqueValues.has(def.defaultValue)) {
      return failure(
        EngineErrorCode.UNKNOWN_ENUM_VALUE,
        `Default value "${def.defaultValue}" is not in allowed values for enum "${def.name}"`
      );
    }

    this.definitions.set(def.name, {
      ...def,
      allowedValues: [...def.allowedValues]
    });

    if (def.defaultValue) {
      this.currentValues.set(def.name, def.defaultValue);
    }

    return success(def);
  }

  /**
   * Sets the current value of an enum state. Rejects invalid enum values.
   */
  public setEnum(enumName: string, value: string): Result<string> {
    const def = this.definitions.get(enumName);
    if (!def) {
      return failure(EngineErrorCode.INVALID_STATE, `Enum "${enumName}" is not registered`);
    }

    if (!def.allowedValues.includes(value)) {
      return failure(
        EngineErrorCode.UNKNOWN_ENUM_VALUE,
        `Invalid enum value "${value}" for enum "${enumName}". Allowed values: [${def.allowedValues.join(', ')}]`
      );
    }

    this.currentValues.set(enumName, value);
    return success(value);
  }

  /**
   * Transitions an enum state to a new value, checking defined allowed transitions if configured.
   */
  public transitionEnum(enumName: string, toValue: string): Result<string> {
    const def = this.definitions.get(enumName);
    if (!def) {
      return failure(EngineErrorCode.INVALID_STATE, `Enum "${enumName}" is not registered`);
    }

    if (!def.allowedValues.includes(toValue)) {
      return failure(
        EngineErrorCode.UNKNOWN_ENUM_VALUE,
        `Invalid enum value "${toValue}" for enum "${enumName}". Allowed values: [${def.allowedValues.join(', ')}]`
      );
    }

    const current = this.currentValues.get(enumName) || def.defaultValue;

    if (def.allowedTransitions && current) {
      const allowedNext = def.allowedTransitions[current] || [];
      if (!allowedNext.includes(toValue)) {
        return failure(
          EngineErrorCode.INVALID_TRANSITION,
          `Invalid transition for enum "${enumName}": Cannot transition from "${current}" to "${toValue}". Allowed: [${allowedNext.join(', ')}]`
        );
      }
    }

    this.currentValues.set(enumName, toValue);
    return success(toValue);
  }

  /**
   * Gets the current value of an enum state.
   */
  public getEnum(enumName: string): string | undefined {
    return this.currentValues.get(enumName);
  }

  /**
   * Asserts and retrieves the enum value, failing if not set or unregistered.
   */
  public requireEnum(enumName: string): Result<string> {
    const def = this.definitions.get(enumName);
    if (!def) {
      return failure(EngineErrorCode.INVALID_STATE, `Enum "${enumName}" is not registered`);
    }
    const val = this.currentValues.get(enumName);
    if (!val) {
      return failure(EngineErrorCode.INVALID_STATE, `Enum "${enumName}" has not been initialized`);
    }
    return success(val);
  }

  /**
   * Exports all current enum values as a record.
   */
  public toRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [k, v] of this.currentValues.entries()) {
      record[k] = v;
    }
    return record;
  }
}
