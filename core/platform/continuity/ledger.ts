/** Phase 20 — long-term continuity ledger; observability, not a test suite. */

import { deterministicKey, stableSerialize, hash32 } from '../shared.ts';

export interface ContinuityAnchor {
  readonly universeId: string;
  readonly periodId: string;
  readonly pageDefinitionId?: string;
  readonly predecessorFingerprint?: string;
  readonly invariantFingerprint: string;
  readonly stateFingerprint: string;
  readonly generation: number;
}

export interface ContinuityLedgerEntry extends ContinuityAnchor {
  readonly entryId: string;
  readonly recordedAtGeneration: number;
}

export interface ContinuityDrift {
  readonly invariantChanged: boolean;
  readonly stateChanged: boolean;
  readonly predecessorMismatch: boolean;
}

export class ContinuityLedger {
  private readonly entries = new Map<string, ContinuityLedgerEntry>();

  public record(anchor: ContinuityAnchor): ContinuityLedgerEntry {
    const entryId = deterministicKey('CONT', anchor.universeId, anchor.periodId, anchor.pageDefinitionId ?? '*');
    const entry: ContinuityLedgerEntry = Object.freeze({ ...anchor, entryId, recordedAtGeneration: anchor.generation });
    this.entries.set(entryId, entry);
    return entry;
  }

  public get(universeId: string, periodId: string, pageDefinitionId?: string): ContinuityLedgerEntry | null {
    return this.entries.get(deterministicKey('CONT', universeId, periodId, pageDefinitionId ?? '*')) ?? null;
  }

  public compare(previous: ContinuityLedgerEntry | null, current: ContinuityAnchor): ContinuityDrift {
    return Object.freeze({
      invariantChanged: !!previous && previous.invariantFingerprint !== current.invariantFingerprint,
      stateChanged: !!previous && previous.stateFingerprint !== current.stateFingerprint,
      predecessorMismatch: !!previous && previous.stateFingerprint !== (current.predecessorFingerprint ?? previous.stateFingerprint)
    });
  }

  public latestForUniverse(universeId: string): readonly ContinuityLedgerEntry[] {
    return Object.freeze([...this.entries.values()].filter(x => x.universeId === universeId).sort((a, b) => a.generation - b.generation));
  }

  public fingerprint(): string {
    return hash32(stableSerialize([...this.entries.values()].sort((a, b) => a.entryId.localeCompare(b.entryId))));
  }
}
