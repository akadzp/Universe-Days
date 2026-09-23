/** Shared deterministic primitives for Phases 15-25. */

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { readonly [key: string]: JSONValue };

export interface PlatformError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PlatformResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: PlatformError;
}

export const ok = <T>(value: T): PlatformResult<T> => Object.freeze({ ok: true, value });
export const err = (code: string, message: string, details?: Record<string, unknown>): PlatformResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ code, message, ...(details ? { details: Object.freeze({ ...details }) } : {}) }) });

export function normalizeToken(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

export function hash32(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function deterministicKey(prefix: string, ...parts: readonly unknown[]): string {
  return `${prefix}_${hash32(stableSerialize(parts))}`;
}

export function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeDeep(child);
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
