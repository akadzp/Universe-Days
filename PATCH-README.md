# Character Aggregate + State/Event Integration

Patch ini menyelesaikan tiga tahap secara additive:

1. Character Aggregate sebagai composition/coordinator boundary.
2. State/Event integration yang tetap menghormati ownership domain.
3. Test/validation artifacts untuk memeriksa invariant Character, indicator, event participant, dan state transition.

## Ownership
- Character Aggregate: composition + coordination, bukan owner domain lain.
- Indicator: tetap melalui registry/lifecycle dan memiliki history sendiri.
- State: tetap authoritative di `core/DOMAIN/STATE`.
- Event: hanya menjadi pemicu/evidence; tidak melakukan direct mutation.
- AI proposal tetap tidak authoritative.
- Group/Level tetap mengikuti Actor rules.

## Important
Patch ini tidak menghapus atau mengganti field `CharacterEntity` yang sudah ada.

## Validation status

- New aggregate/integration TypeScript was type-checked in an isolated contract harness with TypeScript 5.8.3.
- Integration tests are included for aggregate validation, indicator mutation/history, AI-authority rejection, Event participant gating, and Level/Group policy.
- The current repository package manifest uses `npm run lint` for repository-wide TypeScript validation. A complete repository-wide execution could not be run in this environment because the repository could not be cloned and its dependency tree is not locally available. No claim of a full repository test-suite pass is made.
