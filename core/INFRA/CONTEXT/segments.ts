/** Phase 18 — explicit context segments. */

export type ContextSegmentKind = 'SYSTEM' | 'RULE' | 'UNIVERSE' | 'CONTINUITY' | 'PAGE' | 'STORY' | 'USER' | 'AUXILIARY';
export type ContextCompressionMode = 'NONE' | 'WHITESPACE' | 'DEDUPLICATE' | 'TRUNCATE' | 'SUMMARIZE';

export interface ContextSegment {
  readonly id: string;
  readonly kind: ContextSegmentKind;
  readonly priority: number;
  readonly content: string;
  readonly sourceFingerprint: string;
  readonly compression: ContextCompressionMode;
}

export interface ContextPack {
  readonly packId: string;
  readonly segments: readonly ContextSegment[];
  readonly fingerprint: string;
  readonly sourceTokenEstimate: number;
  readonly finalTokenEstimate: number;
  readonly droppedSegmentIds: readonly string[];
}
