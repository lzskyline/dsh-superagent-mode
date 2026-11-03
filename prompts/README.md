# superagent mode: prompt stack

Five system-prompt sections that give a DSH session the operating discipline of dsh-superagent without its deployment machinery. They are fed to a model, not read by a person: keep edits imperative, specific and short.

## Files and assembly

| File | Fed to | Covers |
| --- | --- | --- |
| `orchestrator.md` | main session | Reading a request, deciding to act or ask or stop, scope, dispatch, verification, the report, honesty, blockers |
| `dispatch.md` | main session | What a worker brief contains, what it must not contain, how slices stay independent, when to split |
| `work.md` | worker subagent | Starting from a brief, acting instead of asking, verifying, escalating, reporting |
| `delivery.md` | both | The five conditions for done, and the fixed report shape |
| `replies.md` | main session | When to write to the operator, how, confirmations, questions, blockers, results |

Suggested order for the main session: `orchestrator.md`, `dispatch.md`, `delivery.md`, `replies.md`.
Suggested order for a worker: `work.md`, `delivery.md`.

Each file stands alone enough to be used as its own section; `delivery.md` is shared, so it must not assume either role.

## Derivation

| File | Derived from |
| --- | --- |
| `orchestrator.md` | `prompts/orchestrator.md`, the routing half of `prompts/dispatch.md`, `prompts/shared.md`, and "Principles of the built-in text" in `docs/004-prompts.md` |
| `dispatch.md` | the briefing side of `prompts/dispatch.md`, plus the "routing note never substitutes for the original context" rule in `prompts/work.md` |
| `work.md` | `prompts/worker.md`, `prompts/work.md`, `prompts/team/scope.md` |
| `delivery.md` | `prompts/team/delivery.md` (the evidence and readiness rules), the report paragraphs of `prompts/work.md`, and "How a Ticket ends" in `docs/003-execution.md` |
| `replies.md` | `prompts/replies.md`, `prompts/team/communication.md`, `prompts/handoff*.md`, and "What follows for the agent" in `docs/000-philosophy.md` |

The philosophy is the constraint on all five: take as little operator attention as possible and give as much value as possible; speak only when a person must act or can use a result; stop by impact, not by effort; report honestly.

## Deliberately dropped

| Dropped | Why |
| --- | --- |
| Sources, external accounts, CLIs, skills, execution-environment variables, blocked commands | There is no external identity in this product: one operator, one machine, one chat. Keeping the vocabulary would invite references to machinery that does not exist. |
| Tickets, mandates, policy versions, allowed lists, admission tables, proactive assessment | No authorization store and no proactive path: every request is a direct operator request. **This is a real weakening**: scope is no longer capped by an object the host can check, so the stop conditions in `orchestrator.md` and `work.md` are prompt-level discipline only. |
| Pull requests, branches, commits, CI, review rounds, auto-merge, co-author credit | There is no hosted review surface. "Done" had to be redefined from "a reviewed pull request exists" to "the change is on disk, the check ran, its output is quoted". |
| The six report states (`progress`, `waiting`, `ready`, `blocked`, `failed`, `dropped`) | Collapsed to `done`, `partial`, `blocked`. `waiting` and `dropped` presuppose a ticket that outlives one turn; a worker that cannot finish now reports `blocked` and names the prerequisite. |
| Cards, notices, thread subscriptions, follow-up ownership, hand-back | Subagents are one-shot and do not see the chat. New context means the orchestrator re-briefs; there is no subscription that delivers a later message to a worker. |
| The 100-word message cap and link-based delivery | The operator message now carries the evidence itself, since no other surface holds it. It is bounded by field budget and a line target instead of a word cap. |
| Assessment and admission instructions (`prompts/admission.md`, `subscriptions.md`, `handoff*.md`) | They exist only to judge and route unsolicited work, which this product does not accept. |
| Health entries, polling, retries, recovery, model-budget notices | Host concerns. They belong to the plugin's code, not to a model's instructions. |
| The automated-agent disclaimer line on posted messages | It exists to mark text published under a shared account. There is one operator in one chat; the session already identifies itself. |

## Known gaps

- No enforcement accompanies these texts. Where the original relied on a gate, a tool check or a host precondition, this stack relies on the model following instructions. The plugin should enforce what it can outside the prompt: tool restrictions for workers, a read-only main session where possible, and refusing worker reports that omit evidence.
- `delivery.md` assumes a check exists or that its absence can be named honestly. Repositories with no test or build command will lean on "run it and show the output"; that is the intended fallback, not a substitute for tests.
- The stack says nothing about persistence across turns: the orchestrator must re-derive state by reading the directory, because no ticket record survives a chat turn.