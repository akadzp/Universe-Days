/**
 * Phase 8: Universe Data Model Serialization
 *
 * Provides safe, schema-compliant JSON serialization and deserialization
 * for runtime, tests, persistence, and downstream LLM context building.
 */

import { UniverseModel } from './universe.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { UniverseModelValidator } from './validation.ts';

export interface SerializedUniverseModel {
  readonly version: string;
  readonly payload: UniverseModel;
}

export class UniverseSerializer {
  public static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Serializes a UniverseModel into a JSON string with metadata header.
   */
  public static serialize(model: UniverseModel): string {
    const envelope: SerializedUniverseModel = {
      version: this.CURRENT_VERSION,
      payload: model
    };
    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Deserializes and validates a JSON string into an immutable UniverseModel.
   */
  public static deserialize(jsonString: string): Result<UniverseModel> {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return failure(EngineErrorCode.UNIVERSE_DESERIALIZATION_FAILED, 'Invalid empty JSON string');
      }

      const parsed = JSON.parse(jsonString) as SerializedUniverseModel | UniverseModel;
      const model: UniverseModel = 'payload' in parsed && parsed.payload ? parsed.payload : (parsed as UniverseModel);

      // Validate model integrity upon restoration
      const valReport = UniverseModelValidator.validate(model);
      if (!valReport.isValid) {
        const firstIssue = valReport.issues.find(i => i.severity === 'ERROR');
        return failure(
          EngineErrorCode.UNIVERSE_VALIDATION_FAILED,
          `Deserialized universe failed validation: ${firstIssue?.message}`
        );
      }

      return success(Object.freeze(model));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure(EngineErrorCode.UNIVERSE_DESERIALIZATION_FAILED, `JSON parse error: ${msg}`);
    }
  }
}
