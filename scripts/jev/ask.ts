/**
 * The one place this repository talks to Jev.
 *
 * Seven passes asked the model something, and each of them carried its own
 * copy of the same four decisions: which model, which credential, when to load
 * the SDK, and what to do with an answer that came back the wrong shape. The
 * copies had already drifted — one pass never checked the credential at all
 * and failed on the first request, after parsing and printing; another turned a
 * missing key into an exit code where the rest threw. One implementation, so
 * the drift has nowhere to happen.
 *
 * What stays outside: the questions, the state, and every threshold. Those are
 * the pass's argument, and the pass is the thing a person reads.
 *
 * `PRODUCT.md` and `.scratch/corpus-adjudication-at-scale/spec.md` both draw the
 * line this module sits on: **the model is a research instrument for the
 * corpus, never a component of the tool.** Nothing under `src/` imports this,
 * and nothing that ships does either. The directory is the reminder.
 */
import type { Experimental_EvaluationQuestion } from 'ai'

/**
 * `DISCOVERY_MODEL` overrides the model for a comparison run. It is read here
 * and nowhere else, so a run cannot half-change models.
 */
export const MODEL = process.env['DISCOVERY_MODEL'] ?? 'typesafe-ai/jev'

/**
 * The credential, checked before the work rather than at the first request.
 * `pass` names the caller so the message says which command needs it.
 */
export function requireKey(pass: string): void {
  if ((process.env['AI_GATEWAY_API_KEY'] ?? '') !== '') return
  throw new Error(
    `the ${pass} pass needs a Vercel AI Gateway key: set AI_GATEWAY_API_KEY in .env.local ` +
      '(the pnpm script loads it) or in the environment.',
  )
}

/** A choice answer: what was picked, and how much of the mass it carries. */
export type Chosen = { choice: string; confidence: number }

/**
 * One request's answers, read by name. Reading is where the shape is checked:
 * a question declared `boolean` that comes back as something else is a bug in
 * the question, and it is louder as a throw than as a number nobody can place.
 */
export type Answered = {
  /** The probability of a `boolean` question's statement being true. */
  probability(key: string): number
  /** The choice a `choice` question settled on, with its confidence. */
  chosen(key: string): Chosen
}

/** Asks one question map over one shared state, in a single request. */
export type Ask = (
  state: Readonly<Record<string, unknown>>,
  questions: Readonly<Record<string, Experimental_EvaluationQuestion>>,
) => Promise<Answered>

type RawAnswer =
  | { type: 'boolean'; probability: number }
  | { type: 'choice'; choice: string; probabilities?: Record<string, number> }
  | { type: string }

/**
 * The reading half, separated from the request so it can be tested without a
 * key. Every `answer.type !== 'boolean'` check in the old copies is this.
 */
export function answersOf(raw: Readonly<Record<string, RawAnswer | undefined>>): Answered {
  return {
    probability(key) {
      const answer = raw[key]
      if (answer?.type !== 'boolean') {
        throw new Error(`${key} did not come back as a boolean, got ${answer?.type ?? 'nothing'}`)
      }
      return (answer as { probability: number }).probability
    },
    chosen(key) {
      const answer = raw[key]
      if (answer?.type !== 'choice') {
        throw new Error(`${key} did not come back as a choice, got ${answer?.type ?? 'nothing'}`)
      }
      const { choice, probabilities } = answer as {
        choice: string
        probabilities?: Record<string, number>
      }
      // A choice model spreads its mass over the labels; the confidence is the
      // winning label's share. A model that returned no spread is certain.
      const spread = Object.values(probabilities ?? { [choice]: 1 })
      return { choice, confidence: Math.max(...spread) }
    },
  }
}

/**
 * Opens the seam. The SDK is imported on demand for two reasons the old copies
 * each re-explained: Jev is an `evaluation` model, so `generateText` refuses
 * it, and the subcommands that call no model must not pay the import.
 */
export async function openJev(): Promise<Ask> {
  const { experimental_evaluate: evaluate } = await import('ai')
  return async (state, questions) => {
    const { answers } = await evaluate({
      model: MODEL,
      state: state as Parameters<typeof evaluate>[0]['state'],
      questions: questions as Parameters<typeof evaluate>[0]['questions'],
    })
    return answersOf(answers as Readonly<Record<string, RawAnswer | undefined>>)
  }
}
