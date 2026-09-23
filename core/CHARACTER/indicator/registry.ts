/** Initial, deliberately small Character Indicator Registry. */
import { CharacterIndicatorDefinition } from './indicator.ts';

const continuous = (key: string, description: string): CharacterIndicatorDefinition => Object.freeze({
  key, type: 'CONTINUOUS', persistence: 'DYNAMIC', mutable: true,
  range: Object.freeze({ min: 0, max: 100 }), description
});
const evolvingContinuous = (key: string, description: string): CharacterIndicatorDefinition => Object.freeze({
  key, type: 'CONTINUOUS', persistence: 'EVOLVING', mutable: true,
  range: Object.freeze({ min: 0, max: 100 }), description
});
const evolvingOrdinal = (key: string, description: string): CharacterIndicatorDefinition => Object.freeze({
  key, type: 'ORDINAL', persistence: 'EVOLVING', mutable: true, description
});
const reference = (key: string, description: string): CharacterIndicatorDefinition => Object.freeze({
  key, type: 'REFERENCE', persistence: 'DYNAMIC', mutable: true, description
});
const evolvingBoolean = (key: string, description: string): CharacterIndicatorDefinition => Object.freeze({
  key, type: 'BOOLEAN', persistence: 'EVOLVING', mutable: true, description
});

export const CHARACTER_INDICATOR_DEFINITIONS: readonly CharacterIndicatorDefinition[] = Object.freeze([
  evolvingOrdinal('patience', 'Tendency to tolerate delay, frustration, or repetition.'),
  evolvingOrdinal('assertiveness', 'Tendency to express needs, positions, or decisions directly.'),
  evolvingContinuous('empathy', 'Modeled degree of empathic disposition.'),
  evolvingOrdinal('discipline', 'Tendency to maintain self-control and planned behavior.'),
  evolvingOrdinal('curiosity', 'Tendency to seek information, novelty, or explanation.'),
  evolvingContinuous('resilience', 'Modeled capacity to recover from pressure or adverse experience.'),
  evolvingContinuous('emotionalSensitivity', 'Modeled sensitivity to emotionally significant stimuli.'),
  evolvingOrdinal('independence', 'Tendency to act without relying on others.'),
  evolvingOrdinal('sociability', 'Tendency to seek or sustain social interaction.'),
  evolvingOrdinal('riskTolerance', 'Tendency to accept uncertain or risky actions.'),
  evolvingBoolean('canConfrontConflict', 'Whether confrontation is an established behavior disposition.'),
  evolvingBoolean('tendsToWithdraw', 'Whether withdrawal is an established response disposition.'),
  evolvingBoolean('tendsToHelpOthers', 'Whether helping others is an established response disposition.'),
  evolvingBoolean('actsImpulsively', 'Whether impulsive action is an established response disposition.'),
  evolvingBoolean('seeksApproval', 'Whether seeking approval is an established response disposition.'),
  evolvingBoolean('avoidsAttention', 'Whether avoiding attention is an established response disposition.'),
  evolvingContinuous('physicalCapability', 'Modeled physical capability.'),
  evolvingContinuous('cognitiveCapability', 'Modeled cognitive capability.'),
  evolvingContinuous('communicationCapability', 'Modeled communication capability.'),
  evolvingContinuous('socialCapability', 'Modeled social capability.'),
  evolvingContinuous('technicalCapability', 'Modeled technical capability.'),
  evolvingContinuous('creativeCapability', 'Modeled creative capability.'),
  continuous('urgency', 'Current urgency associated with active motivation.'),
  continuous('desireIntensity', 'Current intensity of active desire.'),
  continuous('fearIntensity', 'Current intensity of active fear.'),
  reference('currentGoalReference', 'Reference to the currently active character goal.'),
  continuous('currentPriority', 'Current priority value for the active goal.'),
  evolvingOrdinal('decisionSpeed', 'Typical speed of decision making.'),
  evolvingOrdinal('responseIntensity', 'Typical intensity of behavioral response.'),
  evolvingOrdinal('trustTendency', 'General tendency to trust other actors.'),
  evolvingOrdinal('cooperationTendency', 'General tendency to cooperate with others.'),
  evolvingOrdinal('leadershipTendency', 'General tendency to lead or assume responsibility.'),
  evolvingOrdinal('attachmentTendency', 'General tendency to form attachments.'),
  evolvingOrdinal('socialDependency', 'General tendency to depend on social support.'),
  continuous('mood', 'Current emotional mood.'),
  continuous('energy', 'Current available energy.'),
  continuous('stress', 'Current stress condition.'),
  continuous('confidence', 'Current confidence; baseline may evolve over time.'),
  continuous('focus', 'Current concentration/focus.'),
  continuous('alertness', 'Current alertness.'),
  continuous('physicalCondition', 'Current physical condition.'),
  continuous('emotionalStability', 'Current emotional stability.'),
  continuous('motivationLevel', 'Current motivation level.')
]);
