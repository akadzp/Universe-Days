# Character domain integration patch

Base: `akadzp/Universe-Days` `main` at `0eb9a198af07aac16f6b3ff97bf084c16deb6a87`.

## Scope

This patch adds the next integration boundary after Character Aggregate + State/Event:

- Character ↔ Knowledge
- Character ↔ Relationship
- Character ↔ Location

The existing `CharacterEntity.knowledgeReferences`, `relationshipReferences`, and `locationReference` fields are preserved. Supporting domains remain authoritative; Character stores only stable references.

## Invariants

- Knowledge is not copied into Character.
- A Knowledge entity must explicitly name the Character as `knowerRef`.
- Relationship is not inferred from Group or co-occurrence.
- A Relationship must explicitly involve the Character.
- Location is not inferred from co-presence; `locationReference` is explicitly bound.
- Existing domain validators remain authoritative.
- No AI proposal is promoted by this integration layer.
- No existing Character attributes are removed.

## Validation performed against current repo

Current `main` was inspected at the commit above. Character Aggregate and State/Event integration are present. Existing Continuity Engine, Decision/Action layer, Daily Story orchestrator, and Daily Story validator were also inspected and are already present as separate domain/runtime components.

A full repository `npm run lint` could not be executed in this environment because network access is unavailable for cloning/installing the repository dependency tree. Therefore this patch does not claim a full repository-wide compile/test pass.

The added contract test is framework-neutral and is included so the project's eventual test runner can execute the Character domain integration checks without adding a test dependency.
