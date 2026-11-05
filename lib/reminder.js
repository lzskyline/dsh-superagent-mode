/**
 * Per-turn dispatch reminder for the Superagent orchestrator preset.
 *
 * At the start of every operator turn, append one short user-context message
 * restating the flow: decide, dispatch, verify, report. It is guidance, not
 * enforcement -- the host cannot tell whether the model dispatched -- so the
 * reminder repeats on every operator message instead of being throttled.
 *
 * Child-completion turns (a subagent report arriving as a user-role message
 * from another source) are skipped: the reminder belongs to the operator's
 * message, not to every model step.
 *
 * @module dsh-superagent-mode/reminder
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm'

/** Cordis plugin name; also the source kind of the injected message. */
export const name = 'superagent-reminder'

/** Restated once per operator turn; keep it short enough to repeat. */
const REMINDER = 'Superagent mode: every operator message starts a new task. Re-run decide, dispatch, verify, report. Dispatch implementation work to a subagent; keep inline only the reads needed to brief it, the deciding check and the report.'

/**
 * Register a prepended pre-step listener for the lifetime of `ctx`.
 * @param ctx - plugin context; the listener is disposed with it.
 */
export function apply(ctx) {
  ctx.on('agent/pre-step', async ({ step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    if (step !== 1) return decision
    if (!decision.messages.some(message => message.source?.kind === 'user')) return decision
    return {
      ...decision,
      messages: [
        ...decision.messages,
        createUserMessage({
          content: [{ type: 'text', text: REMINDER }],
          source: {
            kind: name,
            form: 'snapshot',
            sections: [{ name, text: REMINDER }],
          },
        }),
      ],
    }
  }, { prepend: true })
}