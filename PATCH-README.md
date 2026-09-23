# Universe-Days — Character Indicator Stage 5 Patch

## Scope

Stage 5 introduces the Story/Event -> Character Indicator effect boundary.

This patch is additive. It does not modify CharacterProfile, Behavior,
CharacterStyle, CharacterState, Level, Group, Relationship, or Event ownership.

## Flow

```text
EVENT / STORY
    -> RULE / EFFECT PROPOSAL
    -> EFFECT RESOLUTION
    -> VALIDATION
    -> INDICATOR LIFECYCLE
    -> CHARACTER INDICATOR HISTORY
```

AI may propose an effect, but an AI proposal cannot become authoritative through
this layer. The layer is pure and never mutates Character directly.

## Modulation

A numeric INCREASE/DECREASE may carry:
- baseValue
- dispositionFactor
- conditionFactor

Resolved value is `baseValue * dispositionFactor * conditionFactor`.
Missing/invalid factors default to 1. Non-numeric operations are preserved for
explicit domain rules and are not silently coerced.

## Intentionally not included

- direct EventEntity mutation
- direct CharacterState mutation
- automatic indicator mutation
- Level/Group evaluation
- relationship-specific trust values
- inference from co-occurrence
