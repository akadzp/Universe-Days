# Universe-Days Character Indicator — Final Integration Patch

This patch consolidates Stages 1–6 into one additive Character Indicator layer and provides the Stage 7 integration contract.

## Ownership

- CharacterProfile remains authoritative for profile/identity/descriptive data.
- Behavior remains authoritative for behavioral evidence, context, and history.
- CharacterStyle remains authoritative for expression/communication style.
- CharacterState remains authoritative for factual current state.
- Relationship remains authoritative for pairwise relationships.
- ActorClassification / ActorGroupMembership remain authoritative for Level and Group.
- Indicators are rule-facing parameters and dynamic/evolving values; they are not a replacement store for those domains.

## Mutation flow

AI may propose effects but never mutates Character directly:

AI proposal -> Event/Story -> effect resolution -> validation -> Indicator Lifecycle -> history/state integration

## Binary rules

BOOLEAN rules use TRUE/FALSE/UNKNOWN. Missing indicators are UNKNOWN, never FALSE.

## Level / Group

Level is evaluated from story-impact evidence, not frequency, personality, gender, or group. Group rules remain CORE required/fixed, MAJOR required/mutable, IMPACT forbidden, PERIPHERAL forbidden, ENTITY required/mutable.

## Backward compatibility

No existing CharacterProfile, Behavior, CharacterStyle, CharacterState, ActorClassification, or ActorGroupMembership attributes are removed by this patch. The CharacterEntity indicator field is additive.

## Stage 7 scope

The integration contract is intentionally conservative: it consolidates the layers without inventing direct EventEntity -> Character mutation or changing existing domain gateway ownership. Those connections should be wired through the existing validation/domain-gateway architecture in a later implementation pass if needed.
