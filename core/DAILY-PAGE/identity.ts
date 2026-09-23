import { deterministicId } from '../RUNTIME/ENGINE/determinism.ts';
import { makePageID } from '../SHARED/identifiers.ts';
import { PageID } from '../SHARED/identifiers.ts';

export function deriveDailyPageId(
  universeId: string,
  universeScope: string,
  pageKey: string,
  pageDate: string,
  anchorTime: string,
  temporalStatus: string
): PageID {
  const raw = deterministicId(
    'PAGE',
    universeId,
    universeScope,
    pageKey,
    pageDate,
    anchorTime,
    temporalStatus
  );
  return makePageID(raw);
}
