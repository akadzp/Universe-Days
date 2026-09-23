/**
 * Phase 7: Mock Knowledge Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing Knowledge domain integration.
 * Preserves strict epistemic distinctions (Knowledge, Belief, Memory, Report, Imagination, Hypothesis).
 * Authoritative Owner: KNOWLEDGE_SYSTEM
 * Domain ID: KNOWLEDGE
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../../SHARED/result.ts';
import {
  DomainPort,
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult,
  DomainResultType,
  DomainValidationResult,
  DomainConflictResolutionRequest,
  DomainConflictResolutionResult,
  DomainTraceRecord
} from '../contracts/common.ts';
import {
  KNOWLEDGE_DOMAIN_ID,
  KNOWLEDGE_OWNER_ID,
  KnowledgeOperation,
  EpistemicModality,
  EpistemicItemRef,
  KnowledgeAcquisitionMetadata,
  KnowledgeAvailabilityRef,
  KnowledgeUpdatePayload
} from '../contracts/knowledge.ts';

export class MockKnowledgeDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = KNOWLEDGE_DOMAIN_ID;
  public readonly ownerId: SystemID = KNOWLEDGE_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(KnowledgeOperation);

  private traces: DomainTraceRecord[] = [];
  private epistemicStore: Map<string, EpistemicItemRef> = new Map([
    [
      'KNOW_ABSTRACT_01',
      {
        knowledgeId: 'KNOW_ABSTRACT_01',
        modality: EpistemicModality.KNOWLEDGE,
        subjectReference: 'SUBJ_ANOMALY_01',
        contentHash: 'E3B0C44298FC1C14',
        certaintyLevel: 1.0,
        status: 'VERIFIED'
      }
    ],
    [
      'BELIEF_ABSTRACT_01',
      {
        knowledgeId: 'BELIEF_ABSTRACT_01',
        modality: EpistemicModality.BELIEF,
        subjectReference: 'SUBJ_FORECAST_01',
        contentHash: '7F83B1657FF1FC53',
        certaintyLevel: 0.7,
        status: 'UNVERIFIED'
      }
    ],
    [
      'HYPO_ABSTRACT_01',
      {
        knowledgeId: 'HYPO_ABSTRACT_01',
        modality: EpistemicModality.HYPOTHESIS,
        subjectReference: 'SUBJ_RESEARCH_01',
        contentHash: '5BAA61E4C9B93F3F',
        certaintyLevel: 0.4,
        status: 'UNVERIFIED'
      }
    ]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const kId = request.entityReference || (request.filter as { knowledgeId?: string })?.knowledgeId || 'KNOW_ABSTRACT_01';
    const item = this.epistemicStore.get(kId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_KNOW_QUERY`
    };

    switch (request.operation) {
      case KnowledgeOperation.QUERY_ACQUISITION_METADATA: {
        const meta: KnowledgeAcquisitionMetadata = {
          knowledgeId: kId,
          sourceEntityRef: 'CHAR_ABSTRACT_01',
          sourceEventRef: 'EV_DISCOVERY_01',
          acquisitionTime: '2024-01-01T08:00:00Z',
          provenanceType: 'DIRECT_OBSERVATION',
          confidence: item?.certaintyLevel ?? 0.8
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: meta,
          status: DomainResultType.ACCEPTED
        });
      }

      case KnowledgeOperation.QUERY_AVAILABILITY: {
        const avail: KnowledgeAvailabilityRef = {
          knowledgeId: kId,
          accessibleByEntities: ['CHAR_ABSTRACT_01'],
          isSecret: true,
          classificationLevel: 'CONFIDENTIAL'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: avail,
          status: DomainResultType.ACCEPTED
        });
      }

      default: {
        const defaultItem: EpistemicItemRef = item || {
          knowledgeId: kId,
          modality: (request.filter as { modality?: EpistemicModality })?.modality || EpistemicModality.KNOWLEDGE,
          subjectReference: 'SUBJ_GENERIC',
          contentHash: 'AABBCCDDEEFF0011',
          certaintyLevel: 1.0,
          status: 'VERIFIED'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: defaultItem,
          status: DomainResultType.ACCEPTED
        });
      }
    }
  }

  public validate(request: DomainChangeRequest | DomainQueryRequest): Result<DomainValidationResult> {
    const op = request.operation;
    if (!this.supportedOperations.includes(op)) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Operation "${op}" is not supported by Knowledge Domain.`]
      });
    }

    return success({
      valid: true,
      domain: this.domainId,
      owner: this.ownerId,
      status: 'VALID',
      reasons: []
    });
  }

  public requestChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as KnowledgeUpdatePayload;
    const kId = payload?.knowledgeId || request.entityReference || 'KNOW_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_KNOW_REQ`
    };

    if (payload?.newStatus === 'INVALID_EPISTEMIC_STATE') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.REJECTED,
        reason: 'Epistemic transition rejected by knowledge owner invariants.'
      });
    }

    const current = this.epistemicStore.get(kId);
    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        knowledgeId: kId,
        modality: payload?.modality || current?.modality || EpistemicModality.KNOWLEDGE,
        subjectReference: current?.subjectReference || 'SUBJ_ANOMALY_01',
        contentHash: current?.contentHash || 'E3B0C44298FC1C14',
        certaintyLevel: payload?.targetCertainty ?? current?.certaintyLevel ?? 1.0,
        status: (payload?.newStatus as any) || current?.status || 'VERIFIED'
      },
      reason: 'Knowledge update request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as KnowledgeUpdatePayload;
    const kId = payload?.knowledgeId || request.entityReference || 'KNOW_ABSTRACT_01';

    const current = this.epistemicStore.get(kId) || {
      knowledgeId: kId,
      modality: EpistemicModality.KNOWLEDGE,
      subjectReference: 'SUBJ_ANOMALY_01',
      contentHash: 'E3B0C44298FC1C14',
      certaintyLevel: 1.0,
      status: 'VERIFIED'
    };

    const updated: EpistemicItemRef = {
      ...current,
      modality: payload?.modality || current.modality,
      certaintyLevel: payload?.targetCertainty ?? current.certaintyLevel,
      status: (payload?.newStatus as any) || current.status
    };
    this.epistemicStore.set(kId, updated);

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: 3,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_KNOW_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: updated,
      reason: 'Knowledge mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `Knowledge Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
