/**
 * Phase 8: Knowledge Domain Data Model
 *
 * Implements subjective character knowledge, strictly decoupled from objective Universe facts.
 */

import { EntityID } from '../../types/identifiers.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type EpistemicCertainty = 'FACT' | 'BELIEF' | 'SUSPICION' | 'RUMOR' | 'MISCONCEPTION' | 'FORGOTTEN';

export interface KnowledgeEntity {
  readonly knowledgeId: string;
  readonly knowerRef: EntityID;            // The actor who holds the knowledge
  readonly referencedSubject: string;      // What or whom the knowledge is about (entity ID or concept)
  readonly statement: string;              // What is believed/known
  readonly contentRef?: string;            // Reference to document, memory, or assertion
  readonly acquisitionSource: string;      // How it was acquired (e.g. 'OBSERVATION', 'HEARSAY', 'STUDY')
  readonly certainty: EpistemicCertainty;
  readonly isUniverseFactConfirmed?: boolean; // Whether it matches actual Universe ground truth
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
