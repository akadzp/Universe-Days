/**
 * Phase 7: Knowledge Domain Integration Contract
 *
 * Authoritative Owner: KNOWLEDGE_SYSTEM
 * Domain ID: KNOWLEDGE
 *
 * Defines abstract integration contracts for epistemic claims, knowledge queries,
 * acquisition provenance, availability, and knowledge updates.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../../SHARED/identifiers.ts';
import {
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult
} from './common.ts';

export const KNOWLEDGE_DOMAIN_ID: DomainID = makeDomainID('KNOWLEDGE');
export const KNOWLEDGE_OWNER_ID: SystemID = makeSystemID('KNOWLEDGE_SYSTEM');

/**
 * Epistemic Modalities:
 * Preserves strict distinction between different forms of cognitive/epistemic holding.
 */
export enum EpistemicModality {
  KNOWLEDGE = 'KNOWLEDGE',
  BELIEF = 'BELIEF',
  MEMORY = 'MEMORY',
  REPORT = 'REPORT',
  IMAGINATION = 'IMAGINATION',
  HYPOTHESIS = 'HYPOTHESIS'
}

export enum KnowledgeOperation {
  IDENTIFY = 'IDENTIFY',
  QUERY_KNOWLEDGE = 'QUERY_KNOWLEDGE',
  QUERY_ACQUISITION_METADATA = 'QUERY_ACQUISITION_METADATA',
  QUERY_AVAILABILITY = 'QUERY_AVAILABILITY',
  REQUEST_UPDATE = 'REQUEST_UPDATE'
}

export interface EpistemicItemRef {
  knowledgeId: string;
  modality: EpistemicModality;
  subjectReference: string;
  contentHash: string;
  certaintyLevel?: number; // 0.0 - 1.0
  status: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED' | 'REFUTED' | 'ARCHIVED';
}

export interface KnowledgeAcquisitionMetadata {
  knowledgeId: string;
  sourceEntityRef?: string;
  sourceEventRef?: string;
  acquisitionTime: string;
  provenanceType: 'DIRECT_OBSERVATION' | 'TESTIMONY' | 'INFERENCE' | 'INTUITION' | 'RUMOR';
  confidence: number;
}

export interface KnowledgeAvailabilityRef {
  knowledgeId: string;
  accessibleByEntities: string[];
  isSecret: boolean;
  classificationLevel?: string;
}

export interface KnowledgeUpdatePayload {
  knowledgeId: string;
  modality?: EpistemicModality;
  targetCertainty?: number;
  newStatus?: string;
  addEntityAccess?: string[];
  revokeEntityAccess?: string[];
  updateReason: string;
  metadata?: Record<string, unknown>;
}

export type KnowledgeQueryRequest = DomainQueryRequest<{
  knowledgeId?: string;
  modality?: EpistemicModality;
  entityId?: string;
  subjectReference?: string;
}>;

export type KnowledgeQueryResult = DomainQueryResult<
  EpistemicItemRef | KnowledgeAcquisitionMetadata | KnowledgeAvailabilityRef | EpistemicItemRef[]
>;

export type KnowledgeChangeRequest = DomainChangeRequest<KnowledgeUpdatePayload>;
export type KnowledgeChangeResult = DomainChangeResult<EpistemicItemRef>;
