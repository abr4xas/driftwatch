# driftwatch — guide

How to use the tool. For *why it is built the way it is*, read [`docs/spec/`](../spec/README.md); for the decisions that cost something, [`docs/adr/`](../adr/).

| Document | Read it when |
|---|---|
| [checks.md](./checks.md) | you want to know what each check reports, and when it stays quiet |
| [usage.md](./usage.md) | you are running it: flags, config, ignore directives, exit codes |
| [fixing.md](./fixing.md) | you are about to let it write to your files |
| [output.md](./output.md) | you are wiring it into CI or reading its output from a program |
| [precision.md](./precision.md) | you want to know whether to trust it |

If you read one of these, read `precision.md`. It is the only one that argues rather than instructs, and it is the argument the whole tool rests on.
