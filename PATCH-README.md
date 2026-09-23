# Knowledge -> Event -> Character Integration Patch

Base: current/default branch of `akadzp/Universe-Days` at the time of inspection.

## Scope

- Knowledge remains authoritative in `core/DOMAIN/KNOWLEDGE`.
- Character keeps only `knowledgeReferences`; no `KnowledgeEntity` copy is stored inside Character.
- A resolved Event must list the Character in `participantRefs` before it can cause Knowledge acquisition/change.
- Story-derived acquisition always uses `KnowledgeLifecycle.deriveFromStory()` and `ActorDataSource.STORY_DERIVED`.
- AI proposals and UNKNOWN sources cannot become authoritative Knowledge.
- Knowledge ownership is validated against `knowerRef`.
- Acquisition time is tied to Event effective time; it is not silently replaced with engine recorded time.
- Knowledge changes use the existing `KnowledgeLifecycle.changeKnowledge()` predecessor check.
- Character revision history records the new knowledge reference.

## Existing attributes

No existing `CharacterEntity` attributes are removed or renamed.
