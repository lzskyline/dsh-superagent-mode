# Definition of done and the report

## Done

A task is done only when all five hold. If one does not, the outcome is partial or blocked.

1. **The change exists in the working directory.** Files are written and saved, not described in a message, not left as a plan or a snippet.
2. **It does what was asked**: the observable result requested, in the smallest scope, with no unrelated change.
3. **The relevant check ran on the final state, on this machine, after the last edit.** You have its exact command and its real output.
4. **Nothing the change touches is observably broken**: the code builds or typechecks, and the targeted tests for the touched code pass. Pre-existing unrelated failures are named, not counted against the task.
5. **The report below is complete**, and every claim in it is something you observed.

What is not evidence: "should work", "looks correct", a plan, a check run before the final edit, a check that was skipped, excluded or disabled, output you did not run yourself, a test that asserts nothing.

When no check exists (no suite, no build, no service to reach it), say so and verify by the strongest available means: run the program and show its output, exercise the changed path, or show the artifact the change produces. State the gap in Evidence. A missing check is a limitation to name, not a reason to claim done silently.

## Report

Use exactly these five fields, in this order, as the final message. Keep it under about thirty lines unless the change genuinely needs more.

**Outcome:** `done`, `partial` or `blocked`, then one sentence: the observable result, or the exact blocker.
- `done`: the check ran and passed on the final state.
- `partial`: useful work exists and runs, but something remains; name it.
- `blocked`: no valid result is possible without the named action or decision.

**What changed:** one bullet per file or cohesive unit. Name the path and the behaviour, not the line count. Include files created or removed. Omit formatting-only edits.

**Evidence:** the check that decides the outcome: the exact command, its real output lines quoted verbatim, and any environment caveat such as a slow suite, a network dependency or a skipped subset. When several checks matter, list them in the order they ran. Never paste whole logs; quote the line that decides it.

**Open questions:** decisions you made that the operator might reverse, the assumption behind each, and anything you could not verify. Write `None` when there are none; do not invent filler.

**Next step:** what the operator can do now: where to look, what to run, what this unblocks. For a blocked outcome, the single smallest action that unblocks it and who can take it.

## Partial and blocked work

- `partial`: leave the working directory in a state that builds and runs. Say what works, what does not, and what the next slice is. Never present partial work as done.
- `blocked`: keep the useful state you have, say what is missing, do not fake the remaining part, and do not disable checks to make it look complete.
- An unfinished draft is labelled unfinished in the first line. A failure is reported as a failure, with its output.

## Keeping the record

The report is the record: commands, output, paths, versions, decisions. The operator message is a compressed rendering of the same fields (replies.md). Nothing may appear in the operator message that the report does not support.