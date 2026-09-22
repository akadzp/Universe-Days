/** Phase 22 — versioned runtime artifacts and compatibility. */

export interface VersionId {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface VersionedEnvelope<T> {
  readonly schema: string;
  readonly version: VersionId;
  readonly payload: T;
  readonly fingerprint: string;
}

export interface Migration<TFrom, TTo> {
  readonly id: string;
  readonly from: VersionId;
  readonly to: VersionId;
  migrate(value: TFrom): TTo;
}
