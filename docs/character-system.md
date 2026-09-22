# Character Core / Sims System

This layer implements the Character Profile portion of the Pocer semantic model.
It is intentionally separate from Actor classification, State, Behavior,
Knowledge, Style, Relationship, and Location ownership.

## Profile groups

- Identity: name, nickname, age, birth date, zodiac, shio.
- Appearance: distinctive features and appearance/clothing style.
- Personality: personality type, main traits, flaws, habits, fears, values.
- Life: occupation, hobbies, interests, skills, daily pattern.
- Social: social tendency.
- Narrative profile: open wounds, goals, aspirations, secrets, backstory, notes.

## Ownership boundaries

- Current location is not stored as authoritative profile data; Location/State remain owners.
- Current mood and current condition are State data.
- Speech style and communication behavior belong to Style System.
- Relationship facts belong to Relationship System.
- Knowledge facts belong to Knowledge System.
- Actor Level, Group, Gender, Entity Type, and Actor lifecycle belong to Actor System.

## Source principle

Profile information may be `USER_DEFINED` or `STORY_DERIVED` when authoritative.
`AI_PROPOSAL` and `UNKNOWN` cannot become authoritative through this lifecycle.
Unknown fields stay unknown rather than being inferred.

## Compatibility

`CharacterEntity.profile` is optional to preserve compatibility with existing
legacy/generic Universe seeds while new authoritative characters can populate the
full profile.
