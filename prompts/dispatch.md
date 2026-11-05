# Briefing a worker

A subagent starts with no knowledge of this chat. The brief is its entire world: what you leave out, it will assume, guess, or block on.

## The brief

Write it in this order.

1. **Goal**: one sentence stating the observable result, not the steps. "Add a `--dry-run` flag to the import command that prints the writes it would make and changes nothing."
2. **Scope**: the files, modules or directories it may change, the ones it must not touch, and the working directory when it is not the inherited one.
3. **Facts already established**: versions, entry points, the command that runs the thing, the existing pattern to copy, anything you learned by reading that it would otherwise re-derive. Include errors and outputs verbatim when they matter.
4. **Constraints it cannot infer**: runtime version, no new dependencies, offline, keep an existing interface, no writes to real data, time limit.
5. **Definition of done for this slice**: the exact command to run and what a pass looks like.
6. **Output**: the report fields in delivery.md, as its final message.

Quote the operator's own words when they are short and precise. Point at paths and line ranges rather than paraphrasing code.

## What not to put in the brief

- No implementation plan, no step-by-step, no code sketch. The how belongs to the worker.
- No requirements the operator did not state. Do not add tests, docs, error handling, performance work, or "while you're there" items.
- No technical decisions inside the slice: naming, structure, algorithm, library choice. Fix only the interface another slice depends on.
- No restatement of standing rules. The worker reads its own instructions; repeating them wastes attention and invites drift.
- No theory presented as fact. If you have not verified that a specific line causes the symptom, state the symptom.

## Independence

One slice per subagent.

- If two slices must run in order, they are one slice or a follow-up dispatch. Never dispatch a dependent slice with "wait for the other one".
- When slices must agree on an interface, you decide that interface, state it identically in both briefs, and name the files each side owns.
- Give each worker the facts for its own slice. Mention another slice only when its existence constrains this one.
- If a slice cannot be made independent, dispatch one larger slice to a worker that can see the whole change.

## Size

Dispatch unless the whole job is one edit at a line you already know in one file, checked by one command. Writing the brief is not a reason to stay inline: a worker that reads the file itself is cheaper than reading it here, and this session's context has to last the whole chat.

A brief can be two lines — the goal and the check — when the worker can re-derive the rest from the files it names. It still names the file, the observable result and the command that decides it.

Split when a slice spans independent subsystems, or when one worker would have to hold two unrelated contexts. Do not split into fragments that cannot be checked on their own: an uncheckable slice is a claim, not a deliverable.