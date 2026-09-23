/**
 * Stage 2 — Character → Indicator ownership map.
 *
 * This is an explicit mapping contract, not a second Character data store.
 * Existing Profile, Behavior, Style, State, Relationship, Level, and Group
 * remain authoritative for their respective domains.
 */

export type CharacterSourceDomain =
  | 'PROFILE'
  | 'BEHAVIOR'
  | 'STYLE'
  | 'STATE'
  | 'RELATIONSHIP'
  | 'CLASSIFICATION'
  | 'DERIVED';

export type CharacterIndicatorMappingKind =
  | 'DIRECT_PARAMETER'
  | 'BEHAVIOR_DISPOSITION'
  | 'CAPABILITY_PARAMETER'
  | 'MOTIVATION_PARAMETER'
  | 'SOCIAL_DISPOSITION'
  | 'DYNAMIC_CONDITION'
  | 'NO_INDICATOR';

export interface CharacterIndicatorMapping {
  readonly sourceDomain: CharacterSourceDomain;
  readonly sourceField: string;
  readonly indicatorKey?: string;
  readonly kind: CharacterIndicatorMappingKind;
  readonly sourceOfTruth: true;
  readonly notes: string;
}

/** Fields that remain authoritative in CharacterProfile and have no duplicate indicator. */
export const CHARACTER_PROFILE_AUTHORITATIVE_FIELDS: readonly string[] = Object.freeze([
  'fullName', 'nickname', 'age', 'birthDate', 'zodiac', 'shio',
  'distinctiveFeatures', 'appearanceStyle', 'personalityType', 'mainTraits',
  'flaws', 'habits', 'fears', 'values', 'occupation', 'hobbies', 'interests',
  'skills', 'dailyPattern', 'socialTendency', 'openWounds', 'personalGoal',
  'longTermAspiration', 'secrets', 'backstorySummary', 'notes'
]);

/** Behavior remains authoritative for behavioral evidence, context and history. */
export const CHARACTER_BEHAVIOR_AUTHORITATIVE_FIELDS: readonly string[] = Object.freeze([
  'behaviorPattern', 'behaviorContext', 'behaviorFrequency', 'triggers',
  'triggerContext', 'typicalResponse', 'alternativeResponse',
  'responseIntensity', 'changes', 'temporalValidity', 'history', 'provenance'
]);

/** CharacterStyle remains authoritative for expression and communication style. */
export const CHARACTER_STYLE_AUTHORITATIVE_FIELDS: readonly string[] = Object.freeze([
  'languageStyle', 'wordChoice', 'formalityLevel', 'sentencePattern',
  'speechRhythm', 'emotionalExpression', 'humorStyle', 'reactionStyle',
  'emphasisStyle', 'verbalSignature', 'commonExpressions', 'dialogueTendency',
  'communicationHabits', 'casualStyle', 'seriousStyle', 'conflictStyle',
  'emotionalStyle'
]);

/** CharacterState remains authoritative for factual current state. */
export const CHARACTER_STATE_AUTHORITATIVE_FIELDS: readonly string[] = Object.freeze([
  'currentLocationReference', 'currentActivity', 'currentMood',
  'currentCondition', 'currentGoal', 'currentStatus'
]);

export const CHARACTER_INDICATOR_MAPPINGS: readonly CharacterIndicatorMapping[] = Object.freeze([
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'patience', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter; Profile remains authoritative.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'assertiveness', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'empathy', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Indicator is a modeled parameter, not a replacement trait list.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'discipline', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'curiosity', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'resilience', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Modeled parameter; later experience may evolve it.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'emotionalSensitivity', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Modeled parameter; not a duplicate trait list.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'independence', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter.' },
  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'sociability', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General disposition, not a relationship value.' },
  { sourceDomain: 'PROFILE', sourceField: 'mainTraits', indicatorKey: 'riskTolerance', kind: 'DIRECT_PARAMETER', sourceOfTruth: true, notes: 'Trait evidence can inform the parameter.' },

  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'canConfrontConflict', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'tendsToWithdraw', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'tendsToHelpOthers', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'actsImpulsively', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'seeksApproval', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'behaviorPattern', indicatorKey: 'avoidsAttention', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Rule-facing disposition; BehaviorEntity remains authoritative.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'typicalResponse', indicatorKey: 'decisionSpeed', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Parameter only; detailed response remains in Behavior.' },
  { sourceDomain: 'BEHAVIOR', sourceField: 'responseIntensity', indicatorKey: 'responseIntensity', kind: 'BEHAVIOR_DISPOSITION', sourceOfTruth: true, notes: 'Parameter only; detailed response remains in Behavior.' },

  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'physicalCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability is modeled from profile evidence and later evidence.' },
  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'cognitiveCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability parameter; skills remain profile source data.' },
  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'communicationCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability parameter; style remains authoritative for expression.' },
  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'socialCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability parameter; relationships remain authoritative for pairwise facts.' },
  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'technicalCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability parameter; skills remain profile source data.' },
  { sourceDomain: 'PROFILE', sourceField: 'skills', indicatorKey: 'creativeCapability', kind: 'CAPABILITY_PARAMETER', sourceOfTruth: true, notes: 'Capability parameter; skills remain profile source data.' },

  { sourceDomain: 'PROFILE', sourceField: 'personalGoal', indicatorKey: 'currentGoalReference', kind: 'MOTIVATION_PARAMETER', sourceOfTruth: true, notes: 'Reference parameter; goal data remains Profile/goal authority.' },
  { sourceDomain: 'PROFILE', sourceField: 'personalGoal', indicatorKey: 'currentPriority', kind: 'MOTIVATION_PARAMETER', sourceOfTruth: true, notes: 'Priority is a rule-facing parameter, not a replacement goal record.' },
  { sourceDomain: 'PROFILE', sourceField: 'fears', indicatorKey: 'fearIntensity', kind: 'MOTIVATION_PARAMETER', sourceOfTruth: true, notes: 'Intensity is dynamic; fear descriptions remain Profile source data.' },
  { sourceDomain: 'PROFILE', sourceField: 'values', indicatorKey: 'desireIntensity', kind: 'MOTIVATION_PARAMETER', sourceOfTruth: true, notes: 'Intensity parameter; values remain Profile source data.' },
  { sourceDomain: 'PROFILE', sourceField: 'personalGoal', indicatorKey: 'urgency', kind: 'MOTIVATION_PARAMETER', sourceOfTruth: true, notes: 'Current urgency is dynamic and does not replace goal data.' },

  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'trustTendency', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General tendency only; Relationship remains authoritative for A→B trust facts.' },
  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'cooperationTendency', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General disposition only.' },
  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'leadershipTendency', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General disposition only.' },
  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'attachmentTendency', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General disposition only.' },
  { sourceDomain: 'PROFILE', sourceField: 'socialTendency', indicatorKey: 'socialDependency', kind: 'SOCIAL_DISPOSITION', sourceOfTruth: true, notes: 'General disposition only.' },

  { sourceDomain: 'STATE', sourceField: 'currentMood', indicatorKey: 'mood', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'CurrentMood remains factual state authority; indicator is numeric/rule-facing.' },
  { sourceDomain: 'STATE', sourceField: 'currentCondition', indicatorKey: 'energy', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Energy is a parameter of current condition, not a replacement state field.' },
  { sourceDomain: 'STATE', sourceField: 'currentCondition', indicatorKey: 'stress', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Stress is a parameter of current condition.' },
  { sourceDomain: 'STATE', sourceField: 'currentCondition', indicatorKey: 'confidence', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Current confidence is dynamic; evolving baseline is indicator history.' },
  { sourceDomain: 'STATE', sourceField: 'currentActivity', indicatorKey: 'focus', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Focus is rule-facing condition parameter.' },
  { sourceDomain: 'STATE', sourceField: 'currentStatus', indicatorKey: 'alertness', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Alertness is a parameter of current status/condition.' },
  { sourceDomain: 'STATE', sourceField: 'currentCondition', indicatorKey: 'physicalCondition', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Numeric condition parameter; State remains authoritative.' },
  { sourceDomain: 'STATE', sourceField: 'currentCondition', indicatorKey: 'emotionalStability', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Numeric condition parameter; State remains authoritative.' },
  { sourceDomain: 'STATE', sourceField: 'currentGoal', indicatorKey: 'motivationLevel', kind: 'DYNAMIC_CONDITION', sourceOfTruth: true, notes: 'Current motivational condition; goal identity remains State/Profile authority.' },

  { sourceDomain: 'STYLE', sourceField: '*', kind: 'NO_INDICATOR', sourceOfTruth: true, notes: 'CharacterStyle remains the sole source of expression style; no duplicate style indicators.' },
  { sourceDomain: 'STATE', sourceField: 'currentLocationReference', kind: 'NO_INDICATOR', sourceOfTruth: true, notes: 'Location remains State/Location authority; no location indicator duplicate.' },
  { sourceDomain: 'RELATIONSHIP', sourceField: '*', kind: 'NO_INDICATOR', sourceOfTruth: true, notes: 'Pairwise relationship facts remain Relationship authority; social indicators are only general dispositions.' },
  { sourceDomain: 'CLASSIFICATION', sourceField: 'level', kind: 'NO_INDICATOR', sourceOfTruth: true, notes: 'Level is story-impact classification, not an indicator.' },
  { sourceDomain: 'CLASSIFICATION', sourceField: 'groupMembership', kind: 'NO_INDICATOR', sourceOfTruth: true, notes: 'Group membership is classification authority, not an indicator.' }
]);
