# Character Indicator Lifecycle — Stage 3

Additive patch for explicit Character Indicator lifecycle.

## Changes
- Adds `core/CHARACTER/indicator/lifecycle.ts`.
- Separates current-value mutation from baseline evolution.
- Allows baseline evolution only for `CONTINUOUS + EVOLVING` indicators.
- Keeps `PERSISTENT` and `DERIVED` indicators immutable through lifecycle mutation.
- Requires callers to provide effective/recorded timestamps; no `Date.now()` is introduced.
- Appends immutable change records through `appendIndicatorChange()`.
- Corrects registry persistence: evolving continuous indicators (empathy, resilience, emotionalSensitivity, capabilities) are `EVOLVING`; motivation/condition continuous indicators remain `DYNAMIC`.

## Ownership
Profile, Behavior, CharacterStyle, CharacterState, Level, and Group remain their existing sources of truth. This patch does not replace or delete their attributes.

## Not included yet
- Binary/rule evaluation engine (Stage 4).
- Event/story effect integration (Stage 5).
- Level/Group evaluator (Stage 6).
