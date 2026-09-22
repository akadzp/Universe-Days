import { deterministicId } from '../../engine/determinism.ts';
import { makePageID } from '../../types/identifiers.ts';
import { PageID } from '../../types/identifiers.ts';

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
