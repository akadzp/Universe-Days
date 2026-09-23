import { deterministicKey, hash32, normalizeToken, stableSerialize } from '../../SHARED/platform.ts';
import { ContextPack, ContextSegment } from '../../INFRA/CONTEXT/segments.ts';

export interface ContextCompressionPolicy {
  readonly maxCharacters: number;
  readonly preserveKinds: readonly string[];
  readonly allowDrop: boolean;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export class DeterministicContextCompressor {
  public compress(segments: readonly ContextSegment[], policy: ContextCompressionPolicy): ContextPack {
    const normalized = segments.map(segment => ({
      ...segment,
      content: compactWhitespace(segment.content)
    }));

    const seen = new Set<string>();
    const deduped: ContextSegment[] = [];
    const dropped: string[] = [];
    for (const segment of [...normalized].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
      const key = normalizeToken(segment.content);
      if (seen.has(key)) {
        dropped.push(segment.id);
        continue;
      }
      seen.add(key);
      deduped.push(segment);
    }

    let remaining = Math.max(0, policy.maxCharacters);
    const kept: ContextSegment[] = [];
    for (const segment of deduped) {
      const forceKeep = policy.preserveKinds.includes(segment.kind);
      const length = segment.content.length;
      if (forceKeep || length <= remaining || !policy.allowDrop) {
        const content = forceKeep && length > remaining
          ? segment.content
          : segment.content;
        kept.push({ ...segment, content, compression: content === segment.content ? 'WHITESPACE' : 'TRUNCATE' });
        remaining = Math.max(0, remaining - Math.min(length, remaining));
      } else {
        dropped.push(segment.id);
      }
    }

    kept.sort((a, b) => a.id.localeCompare(b.id));
    const sourceTokenEstimate = segments.reduce((sum, s) => sum + Math.ceil(s.content.length / 4), 0);
    const finalTokenEstimate = kept.reduce((sum, s) => sum + Math.ceil(s.content.length / 4), 0);
    const fingerprint = hash32(stableSerialize(kept));

    return Object.freeze({
      packId: deterministicKey('CTXPACK', fingerprint, policy),
      segments: Object.freeze(kept),
      fingerprint,
      sourceTokenEstimate,
      finalTokenEstimate,
      droppedSegmentIds: Object.freeze([...new Set(dropped)].sort())
    });
  }
}
