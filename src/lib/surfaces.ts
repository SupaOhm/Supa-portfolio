/**
 * The shared surface vocabulary for the page's sections.
 *
 * These exist because the page had already drifted once. The hero was rebuilt
 * in one visual language and About, Skills, Projects and Connect stayed in
 * another, and nothing in the codebase made that visible -- every colour was an
 * inline literal, so two vocabularies could sit in the same scroll without any
 * file disagreeing with any other file.
 *
 * Tokens in index.css fix the colours. These fix the compounds: a chip is the
 * same object in About's course list and in Skills' technology list, and it
 * should not be possible for one to grow a border radius the other does not
 * have. Importing a name is what keeps that true.
 *
 * All of them are colour-and-border only. None of them scale, glow, or blur --
 * see the notes on each.
 */

/**
 * A non-interactive label: a technology, a course, a tag.
 *
 * Hover is a colour step and nothing more. The previous version put
 * `hover:scale-105` on every chip and there are 63 of them in Skills alone;
 * scaling lifts a chip off the baseline its neighbours share, so pointing
 * anywhere in the list made the whole row twitch. A label that is not a link
 * has nothing to promise on hover beyond "I see you".
 *
 * `transition-colors`, never `transition-all` -- the latter animates whatever
 * happens to change, including properties that must land instantly.
 */
export const CHIP =
  'rounded-md border border-rule/70 bg-paper-2 px-3 py-1.5 text-[13px] text-neutral ' +
  'transition-colors duration-200 hover:border-rule hover:bg-paper-3 hover:text-ink';

/**
 * A content block: hairline rule, flat surface, no blur.
 *
 * Elevation here is lightness (paper -> paper-2), which is how light actually
 * works on a dark ground. The old panels used a gradient fill plus
 * `backdrop-blur-xs` plus `hover:shadow-blue-500/10` -- a coloured halo around a
 * card on a dark background is a named generated-UI tell, and the blur was
 * decorating rather than communicating depth, since there was nothing behind it
 * to see through.
 */
export const PANEL = 'rounded-xl border border-rule/60 bg-paper-2 p-6';

/**
 * One number in a row of numbers.
 *
 * Every figure is `text-ink`; the label beneath is `text-muted`. The previous
 * rows gave each stat its own hue -- repos blue, stars purple, top language
 * pink, followers cyan, since green -- which reads as five different kinds of
 * thing when they are five instances of one kind. Difference in colour should
 * mean difference in meaning.
 *
 * `tabular-nums` so the digits sit on a common width and the row stays a column
 * of numbers rather than a ragged one.
 */
export const STAT_VALUE = 'text-xl font-semibold tabular-nums text-ink';
export const STAT_LABEL = 'mt-1 text-[11px] text-muted';

/**
 * A text link inside a section. Underline on hover rather than a colour change,
 * because the accent is already carrying the link's identity at rest.
 *
 * The focus ring is deliberately absent from the transition list. A ring that
 * fades in over 200ms leaves a keyboard user with no indicator for the first
 * 200ms of having focus, which is the moment they most need one.
 */
export const LINK =
  'text-accent underline-offset-4 transition-colors duration-200 hover:underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
