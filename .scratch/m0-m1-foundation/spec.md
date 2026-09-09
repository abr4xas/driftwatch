# M0 + M1 — Foundation and the check that justifies the project

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch of tickets.

## Scope

- **M0** (`docs/spec/ROADMAP.md` § M0): executable skeleton. Tickets 01–03.
- **M1** (`docs/spec/ROADMAP.md` § M1): `path/missing` with real precision. Tickets 04–10.

## Out of scope in this batch

Everything from M2 onwards: `script/missing`, `skill/frontmatter`, `link/broken`, `frontmatter/invalid`, inline ignore directives, config file, `--fix`, the `json`/`github`/`sarif` formats, and the four tier 2 checks.

Reason: M1 is a gate, not a milestone. If the corpus false positive rate does not drop below 5%, planning M2 now would be planning on an unvalidated hypothesis.

## Decisions taken

- ADR-0001: the specification lives inside the repo.
- ADR-0002: the Node floor is 24.
