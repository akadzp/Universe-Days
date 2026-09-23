# Universe-Days Character Indicator — Stage 4: Binary Rule System

Additive patch for the Character Indicator layer.

## Scope
- Adds a binary rule evaluator in `core/CHARACTER/indicator/rules.ts`.
- Adds rule validation in `core/CHARACTER/indicator/rule-validation.ts`.
- Rules read Boolean indicators; they do not mutate Character, State, Behavior, Style, Level, or Group.
- Evaluation uses `TRUE | FALSE | UNKNOWN` so absence/unknown is never silently treated as `FALSE`.
- Supports `ALL`, `ANY`, and `NOT` logical composition.

## Important ownership rule
The rule layer only decides whether a condition matches. It does not apply effects.
The intended flow is:

AI/Event proposal -> Rule evaluation -> Effect proposal -> domain validation -> Indicator lifecycle mutation -> history

No direct AI mutation is introduced by this patch.

## Backward compatibility
No existing CharacterProfile, Behavior, CharacterStyle, CharacterState, Level, Group, or indicator attributes are removed.
