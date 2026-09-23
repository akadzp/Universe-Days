# Universe-Days — Character Indicator Mapping (Stage 2)

Stage 2 is an explicit ownership/mapping contract between existing Character domains and the additive Indicator layer.

## Scope
- Adds `core/CHARACTER/indicator/mapping.ts`.
- Corrects the indicator registry for keys already defined by the indicator interfaces but missing from the registry: `currentGoalReference`, `currentPriority`, `decisionSpeed`, `responseIntensity`.
- Keeps CharacterProfile, Behavior, CharacterStyle, CharacterState, Relationship, Level, and Group as their existing sources of truth.

## No duplicate source-of-truth
- Profile remains authoritative for identity/descriptive character data.
- Behavior remains authoritative for behavior evidence, context, and history.
- CharacterStyle remains authoritative for expression style.
- CharacterState remains authoritative for factual current state.
- Relationship remains authoritative for pairwise relationship facts.
- Level and Group remain classification authority.
- Indicators are rule-facing parameters/projections and may evolve through their own validated lifecycle.

## Important
This patch does not add lifecycle mutation, event effects, or rule execution. Those belong to Stage 3+.

## Compatibility
Additive only. No existing Character attributes are deleted or renamed.
