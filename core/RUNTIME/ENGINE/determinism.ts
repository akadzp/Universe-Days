/**
 * Deterministic identity utilities for Phase 9.
 */

function normalize(value: unknown, seen: Set<object>): unknown {
  if (value === null) return null;

  const type = typeof value;

  if (type === 'string' || type === 'number' || type === 'boolean') {
    return value;
  }

  if (type === 'undefined') {
    return '__UNDEFINED__';
  }

  if (type === 'bigint') {
    return `${String(value)}n`;
  }

  if (type === 'function' || type === 'symbol') {
    return `[${type}]`;
  }

  if (typeof value === 'object') {
    const objectValue = value as object;

    if (seen.has(objectValue)) {
      return '__CIRCULAR__';
    }

    seen.add(objectValue);

    if (Array.isArray(value)) {
      const result = value.map(item => normalize(item, seen));
      seen.delete(objectValue);
      return result;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      result[key] = normalize(
        (value as Record<string, unknown>)[key],
        seen
      );
    }

    seen.delete(objectValue);
    return result;
  }

  return String(value);
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalize(value, new Set<object>()));
}

export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export function deterministicId(prefix: string, ...parts: unknown[]): string {
  const payload = parts.map(stableSerialize).join('::');
  return `${prefix}_${fnv1a32(payload)}`;
}
