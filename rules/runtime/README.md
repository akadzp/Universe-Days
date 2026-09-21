# Runtime Rules

This directory will contain compact, machine-readable rules compiled from specifications.

## Intended Architecture Flow

```
long specification
  → atomic rules
  → rule registry
  → runtime rules
  → rule router
  → execution
```

Runtime rules are deterministic data structures loaded by the Rule Router and evaluated by the Rule Engine during pipeline stages. In this initial architecture phase, no domain production rules are instantiated.
