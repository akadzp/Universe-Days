# Universe-Days Character Indicator Foundation Patch

Base reference: `0644d63b911a231e8a5e7b4693b4e1ae0d5be61f`

## Purpose
Add the first Character Indicator layer as an additive foundation.

## Safety constraints
- Existing CharacterProfile attributes are preserved.
- Existing Behavior, Style, State, Knowledge, Relationship, Level, and Group models are not replaced.
- `CharacterEntity.indicators` is optional and additive.
- Binary rules remain first-class.
- Continuous values use an explicit range (initially 0..100 for registered continuous indicators).
- UNKNOWN/absence is not converted to zero or false.
- AI proposals cannot become authoritative indicator effects.

## Added
- `core/CHARACTER/indicator/indicator.ts`
- `core/CHARACTER/indicator/registry.ts`
- `core/CHARACTER/indicator/validation.ts`
- `core/CHARACTER/indicator/effects.ts`
- additive `indicators?: CharacterIndicators` in `core/CHARACTER/character.ts`

## Deliberately not included
- Automatic Level calculation.
- Automatic Group calculation.
- Event mutation integration.
- Replacement of existing Behavior/Style/State systems.
- Deletion or renaming of existing Character attributes.
