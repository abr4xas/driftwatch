/**
 * Questions asked by more than one pass.
 *
 * A question that two passes ask has to be one object, not two that happen to
 * match today: the wording *is* the instrument, and the numbers a pass reports
 * are the numbers that wording produced. `claims` and `review` carried
 * byte-identical copies of the one below, with `review` documenting in prose
 * that it must not diverge — which is the argument for importing it.
 *
 * A question only one pass asks stays with that pass.
 */
import type { Experimental_EvaluationQuestion } from 'ai'

/**
 * Whether a sentence puts a bare word forward as a path in this repository.
 *
 * The `false` criterion carries it. `bare-word` throws away a word with no
 * slash and no extension, which is most of every document: a command, a
 * subcommand, a package, a variable, a label. Asked whether the word "could be
 * a file", nearly all of them could. What the rule is actually for is whether
 * the **sentence** puts it forward as one, so the criteria are about the
 * sentence and the alternatives are named.
 *
 * Phrased as a statement, per the Noul guidance, and deliberately silent about
 * whether the file is there: that is a fact the record already carries, and
 * mixing it in would let the model answer from the filesystem rather than the
 * prose.
 *
 * **Do not reword it.** `discovery claims` reported 92% over 800 candidates
 * with exactly these sentences; a version tidied up for a nicer command line
 * would be a different measurement quoted under the old one.
 */
export const CLAIMS_A_PATH: Experimental_EvaluationQuestion = {
  type: 'boolean',
  instructions:
    'The sentence puts `candidate` forward as a file or directory belonging to this ' +
    'repository — it names a place a reader of this document would expect to find, and go ' +
    'and look at.',
  criteria: {
    true:
      'The sentence is telling the reader about a path in this repository: pointing at it, ' +
      'saying what is in it, saying where to put something, or listing it among others. A ' +
      'reader following the document would look for it here and be surprised if it were ' +
      'missing.',
    false:
      'It is something else wearing the same clothes: a command or a subcommand, a package, ' +
      'module or dependency name, a variable, a flag value, a heading, a product or tool ' +
      'name, a word of ordinary prose, a placeholder, or a path in somebody else’s ' +
      'project. Nobody reading this expects a file of that name in this repository.',
  },
}
