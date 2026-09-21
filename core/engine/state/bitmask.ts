import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export interface BitDefinition {
  name: string;
  bitPosition: number; // 0 to 30 (safe 32-bit bitwise integers in JS)
  mask: number;
  description?: string;
}

export class BitmaskRegistry {
  private nameToBit: Map<string, BitDefinition> = new Map();
  private positionToName: Map<number, string> = new Map();

  /**
   * Registers a named bit at an explicit bit position (0 - 30).
   * Rejects duplicate bit positions or duplicate names.
   */
  public declareBit(name: string, bitPosition: number, description?: string): Result<BitDefinition> {
    if (!name || typeof name !== 'string') {
      return failure(EngineErrorCode.INVALID_STATE, 'Bit name must be a non-empty string');
    }
    if (typeof bitPosition !== 'number' || bitPosition < 0 || bitPosition > 30 || !Number.isInteger(bitPosition)) {
      return failure(EngineErrorCode.INVALID_STATE, 'Bit position must be an integer between 0 and 30');
    }

    if (this.nameToBit.has(name)) {
      return failure(EngineErrorCode.COLLISION_BIT, `Bit named "${name}" is already registered`);
    }

    if (this.positionToName.has(bitPosition)) {
      const existing = this.positionToName.get(bitPosition);
      return failure(
        EngineErrorCode.COLLISION_BIT,
        `Bit position ${bitPosition} collides with existing bit "${existing}"`
      );
    }

    const definition: BitDefinition = {
      name,
      bitPosition,
      mask: 1 << bitPosition,
      description
    };

    this.nameToBit.set(name, definition);
    this.positionToName.set(bitPosition, name);

    return success(definition);
  }

  /**
   * Looks up a registered bit definition by name.
   */
  public getBit(name: string): BitDefinition | undefined {
    return this.nameToBit.get(name);
  }

  /**
   * Returns all registered bit definitions.
   */
  public getAllBits(): BitDefinition[] {
    return Array.from(this.nameToBit.values());
  }

  /**
   * Validates whether a numeric mask contains any undeclared bits.
   */
  public validateMask(mask: number): Result<boolean> {
    let allValidBits = 0;
    for (const def of this.nameToBit.values()) {
      allValidBits |= def.mask;
    }

    const unknownBits = mask & ~allValidBits;
    if (unknownBits !== 0) {
      return failure(
        EngineErrorCode.UNKNOWN_BIT,
        `Mask contains undeclared/unknown bits: 0b${unknownBits.toString(2)} (${unknownBits})`
      );
    }

    return success(true);
  }

  /**
   * Sets a bit on a target mask using a named flag.
   */
  public setBit(currentMask: number, name: string): Result<number> {
    const bit = this.nameToBit.get(name);
    if (!bit) {
      return failure(EngineErrorCode.UNKNOWN_BIT, `Unknown bit flag "${name}"`);
    }
    return success(currentMask | bit.mask);
  }

  /**
   * Clears a bit from a target mask using a named flag.
   */
  public clearBit(currentMask: number, name: string): Result<number> {
    const bit = this.nameToBit.get(name);
    if (!bit) {
      return failure(EngineErrorCode.UNKNOWN_BIT, `Unknown bit flag "${name}"`);
    }
    return success(currentMask & ~bit.mask);
  }

  /**
   * Checks if a target mask contains the specified named bit.
   */
  public hasBit(currentMask: number, name: string): Result<boolean> {
    const bit = this.nameToBit.get(name);
    if (!bit) {
      return failure(EngineErrorCode.UNKNOWN_BIT, `Unknown bit flag "${name}"`);
    }
    return success((currentMask & bit.mask) === bit.mask);
  }

  /**
   * Combines multiple named flags into a single composite bitmask.
   */
  public combineFlags(names: string[]): Result<number> {
    let composite = 0;
    for (const name of names) {
      const bit = this.nameToBit.get(name);
      if (!bit) {
        return failure(EngineErrorCode.UNKNOWN_BIT, `Unknown bit flag "${name}" during combine`);
      }
      composite |= bit.mask;
    }
    return success(composite);
  }

  /**
   * Removes a set of named flags from an existing bitmask.
   */
  public removeFlags(currentMask: number, names: string[]): Result<number> {
    let resultMask = currentMask;
    for (const name of names) {
      const bit = this.nameToBit.get(name);
      if (!bit) {
        return failure(EngineErrorCode.UNKNOWN_BIT, `Unknown bit flag "${name}" during remove`);
      }
      resultMask &= ~bit.mask;
    }
    return success(resultMask);
  }
}

export class BitmaskSet {
  private mask: number = 0;

  constructor(private registry: BitmaskRegistry, initialMask: number = 0) {
    this.mask = initialMask;
  }

  public getMask(): number {
    return this.mask;
  }

  public has(name: string): boolean {
    const res = this.registry.hasBit(this.mask, name);
    return res.status === 'SUCCESS' && res.data === true;
  }

  public set(name: string): Result<number> {
    const res = this.registry.setBit(this.mask, name);
    if (res.status === 'SUCCESS' && res.data !== undefined) {
      this.mask = res.data;
    }
    return res;
  }

  public clear(name: string): Result<number> {
    const res = this.registry.clearBit(this.mask, name);
    if (res.status === 'SUCCESS' && res.data !== undefined) {
      this.mask = res.data;
    }
    return res;
  }
}

