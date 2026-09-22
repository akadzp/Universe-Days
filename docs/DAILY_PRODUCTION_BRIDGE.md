# Daily Production Bridge

The bridge is the production handoff between the deterministic engine owners and the AI production worker.

```text
Authoritative Universe
        |
        v
Daily Universe Period Context
        |
        +----> Daily Story Package ----> Production Runner ----> AI Proposal -> Validation -> Persistence
        |
        +----> Daily Page Packages ---\
                                      +--> Production Runner ----> AI Proposal -> Validation -> Persistence
```

Rules:

- `UniverseModel` is validated before the bridge starts.
- An externally supplied `UniversePeriodContext` is treated as owner-produced truth and is not progressed by the bridge.
- Without an owner-produced context, the bridge may initialize a first Daily period from the authoritative Universe temporal context. It does not invent carryover, events, processes, or future information.
- Story triggers default to an explicit production request with a deterministic trigger ID.
- Page production uses the bounded Phase 16 executor.
- AI receives packages through `ProductionContextCompiler`; it never receives authority to mutate Canon.
- The bridge does not finalize or persist Daily Universe state. Those transitions remain the responsibility of their owner system.
- Production run persistence remains under `FileProductionStore`.
