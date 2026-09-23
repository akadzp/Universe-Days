/**
 * Character Indicator Foundation
 *
 * Additive parameter layer for Character. It does not replace Profile,
 * Behavior, Style, State, Knowledge, Relationship, Level, or Group.
 */
import { ActorDataSource } from '../actor.ts';
import { SourceAuthorityMetadata } from '../../SHARED/provenance.ts';

export type CharacterIndicatorType = 'BOOLEAN' | 'ORDINAL' | 'CONTINUOUS' | 'CATEGORICAL' | 'REFERENCE';
export type CharacterIndicatorPersistence = 'PERSISTENT' | 'DYNAMIC' | 'EVOLVING' | 'DERIVED';

export interface CharacterIndicatorBase {
  readonly indicatorId: string;
  readonly key: string;
  readonly type: CharacterIndicatorType;
  readonly persistence: CharacterIndicatorPersistence;
  readonly mutable: boolean;
  readonly source: ActorDataSource;
  readonly fieldSources?: Readonly<Record<string, ActorDataSource>>;
  readonly temporalValidity: { readonly effectiveFrom: string; readonly effectiveTo?: string };
  readonly provenance: SourceAuthorityMetadata;
}

export interface BooleanIndicator extends CharacterIndicatorBase {
  readonly type: 'BOOLEAN';
  readonly current: boolean;
}

export interface OrdinalIndicator extends CharacterIndicatorBase {
  readonly type: 'ORDINAL';
  readonly scale: readonly string[];
  readonly current: string;
}

export interface ContinuousIndicator extends CharacterIndicatorBase {
  readonly type: 'CONTINUOUS';
  readonly range: { readonly min: number; readonly max: number };
  readonly baseline?: number;
  readonly current: number;
}

export interface CategoricalIndicator extends CharacterIndicatorBase {
  readonly type: 'CATEGORICAL';
  readonly current: string;
  readonly allowedValues?: readonly string[];
}

export interface ReferenceIndicator extends CharacterIndicatorBase {
  readonly type: 'REFERENCE';
  readonly current?: string;
}

export type CharacterIndicator =
  | BooleanIndicator
  | OrdinalIndicator
  | ContinuousIndicator
  | CategoricalIndicator
  | ReferenceIndicator;

export interface CharacterIndicatorChange<T = unknown> {
  readonly changeId: string;
  readonly indicatorId: string;
  readonly previousValue?: T;
  readonly nextValue: T;
  readonly triggerType: string;
  readonly triggerReference?: string;
  readonly reason?: string;
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly source: ActorDataSource;
  readonly provenance: SourceAuthorityMetadata;
}

export interface CharacterPersonalityIndicators {
  readonly patience?: OrdinalIndicator;
  readonly assertiveness?: OrdinalIndicator;
  readonly empathy?: ContinuousIndicator;
  readonly discipline?: OrdinalIndicator;
  readonly curiosity?: OrdinalIndicator;
  readonly resilience?: ContinuousIndicator;
  readonly emotionalSensitivity?: ContinuousIndicator;
  readonly independence?: OrdinalIndicator;
  readonly sociability?: OrdinalIndicator;
  readonly riskTolerance?: OrdinalIndicator;
}

export interface CharacterBehaviorIndicators {
  readonly canConfrontConflict?: BooleanIndicator;
  readonly tendsToWithdraw?: BooleanIndicator;
  readonly tendsToHelpOthers?: BooleanIndicator;
  readonly actsImpulsively?: BooleanIndicator;
  readonly seeksApproval?: BooleanIndicator;
  readonly avoidsAttention?: BooleanIndicator;
  readonly decisionSpeed?: OrdinalIndicator;
  readonly responseIntensity?: OrdinalIndicator;
}

export interface CharacterCapabilityIndicators {
  readonly physicalCapability?: ContinuousIndicator;
  readonly cognitiveCapability?: ContinuousIndicator;
  readonly communicationCapability?: ContinuousIndicator;
  readonly socialCapability?: ContinuousIndicator;
  readonly technicalCapability?: ContinuousIndicator;
  readonly creativeCapability?: ContinuousIndicator;
}

export interface CharacterMotivationIndicators {
  readonly urgency?: ContinuousIndicator;
  readonly desireIntensity?: ContinuousIndicator;
  readonly fearIntensity?: ContinuousIndicator;
  readonly currentGoalReference?: ReferenceIndicator;
  readonly currentPriority?: OrdinalIndicator;
}

export interface CharacterSocialIndicators {
  readonly trustTendency?: OrdinalIndicator;
  readonly cooperationTendency?: OrdinalIndicator;
  readonly leadershipTendency?: OrdinalIndicator;
  readonly attachmentTendency?: OrdinalIndicator;
  readonly socialDependency?: OrdinalIndicator;
}

export interface CharacterConditionIndicators {
  readonly mood?: ContinuousIndicator;
  readonly energy?: ContinuousIndicator;
  readonly stress?: ContinuousIndicator;
  readonly confidence?: ContinuousIndicator;
  readonly focus?: ContinuousIndicator;
  readonly alertness?: ContinuousIndicator;
  readonly physicalCondition?: ContinuousIndicator;
  readonly emotionalStability?: ContinuousIndicator;
  readonly motivationLevel?: ContinuousIndicator;
}

export interface CharacterIndicators {
  readonly personality: CharacterPersonalityIndicators;
  readonly behavior: CharacterBehaviorIndicators;
  readonly capability: CharacterCapabilityIndicators;
  readonly motivation: CharacterMotivationIndicators;
  readonly social: CharacterSocialIndicators;
  readonly condition: CharacterConditionIndicators;
  readonly history: readonly CharacterIndicatorChange[];
}

export interface CharacterIndicatorDefinition {
  readonly key: string;
  readonly type: CharacterIndicatorType;
  readonly persistence: CharacterIndicatorPersistence;
  readonly mutable: boolean;
  readonly range?: { readonly min: number; readonly max: number };
  readonly allowedValues?: readonly string[];
  readonly description: string;
  readonly affects?: readonly string[];
  readonly affectedBy?: readonly string[];
}

export interface CharacterIndicatorEffect {
  readonly effectId: string;
  readonly characterId: string;
  readonly indicatorKey: string;
  readonly triggerType: string;
  readonly triggerReference?: string;
  readonly operation: 'SET' | 'INCREASE' | 'DECREASE' | 'TOGGLE';
  readonly value: boolean | number | string;
  readonly ruleReference: string;
  readonly source: ActorDataSource;
}
