# LLM Integration Layer

## Architectural Boundary

In the Pocer Universe Engine, the LLM will eventually function strictly as an adapter around the deterministic core engine.

### Planned LLM Responsibilities:
- Semantic interpretation of unformatted inputs
- Story design suggestions
- Prose drafting and stylistic writing
- Creative narrative generation
- Semantic plausibility validation

### Strict Non-Responsibilities (Must NEVER be delegated to LLM):
- Entity, Story, Page, or Transaction IDs
- File system placement and paths
- System domain ownership
- Deterministic state transitions
- Storage hierarchy and structure
- Temporal arithmetic and cycle counting
- Permission checks and mutation authorization

*Note: In this initial architecture phase, no live Gemini API connection, production prompts, or API keys are configured.*
