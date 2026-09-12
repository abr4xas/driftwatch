# 03: `--format github`

**What to build:** native GitHub Actions annotations, so a driftwatch run annotates the diff in the PR instead of printing into a collapsed log.

**Blocked by:** 01.

**Status:** done

## What has to change

- [ ] `src/report/github.ts`, emitting one workflow command per finding:
      `::error file=F,line=L,col=C,endColumn=E,title=T::MESSAGE`
      with `::warning` for a warning-severity finding.
- [ ] **Escaping, which is the only way this format can be wrong.** The runner parses these lines out of the log, so a message containing a newline, a `%`, a `\r`, a `:` or a `,` in the wrong half breaks the annotation or swallows the next line. Property values escape `%` `\r` `\n` `:` `,`; the message body escapes `%` `\r` `\n`. Truncating the message instead is not an answer: the suggestion is the useful half and it comes last.
- [ ] The suggestion goes in the message (`path does not exist → src/auth/index.ts?`), not in a separate annotation. One finding, one annotation.
- [ ] **Nothing else on stdout.** No summary, no file headers, no fix diff. The log is the transport, and a line that is not a workflow command is a line that shows up as noise in the job output.
- [ ] `SPEC.md` § 5's `github` paragraph gains `col`, `endColumn` and `title`, which it does not currently mention.

## What to decide

- [ ] What `title` carries. The check id (`path/missing`) is the only stable thing; it is what someone would search for, and it is what groups annotations visually.
- [ ] Whether `--fix` output appears at all. It should not: there is no workflow command for "I changed this file", and a fix run in CI is already a strange thing to do.

## Tests

- [ ] One annotation per finding, in run order, and no other line on stdout.
- [ ] A message containing a newline and a `%` round-trips to a single annotation line.
- [ ] A warning-severity finding emits `::warning`.
- [ ] Zero findings emits nothing at all — an empty stdout, not a blank line.

## Out of scope

- The Action itself (`driftwatch/action@v1`). Next batch. This ticket is what makes it worth writing.

## Comments

Closed. 4 tests.

`title` carries the check id, as the ticket recommended. `--fix` output is suppressed entirely: there is no workflow command for "I changed this file", and a line that is not one is noise in the job log.

Escaping is two functions rather than one, because the property half also has to escape `:` and `,` — a check id contains neither, but a file path can contain a comma.
