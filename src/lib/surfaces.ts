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
 * have.
 *
 * ## How the per-section hue works
 *
 * Every compound below reaches for `var(--section-accent)` and
 * `var(--section-tint)` rather than a fixed colour. Each section sets that pair
 * once, on its own <section>, from the ramp in index.css -- and because custom
 * properties inherit, every chip, link, rule and active state inside that
 * section picks it up without being told.
 *
 * That is the whole mechanism, and it is why adding colour back did not mean
 * re-scattering colours through the markup. One declaration per section; the
 * compounds are hue-agnostic. Changing About from azure to something else is a
 * one-line edit in About, and nothing here has to know.
 *
 * The var() is written as a Tailwind arbitrary value (`text-[var(--x)]`) rather
 * than a generated utility on purpose: a @theme token resolves its own value at
 * :root, so a token defined as `var(--section-accent)` would substitute once,
 * up there, where no section has set anything -- and every section would come
 * out the same colour. Referencing the property at the use site is what makes
 * the inheritance actually happen.
 */

/** Applied by each section to choose its hue. Pair them; never set one alone. */
export const SECTION_HUES = {
  azure: '[--section-accent:var(--color-azure)] [--section-tint:var(--color-azure-soft)]',
  teal: '[--section-accent:var(--color-teal)] [--section-tint:var(--color-teal-soft)]',
  amber: '[--section-accent:var(--color-amber)] [--section-tint:var(--color-amber-soft)]',
  violet: '[--section-accent:var(--color-violet)] [--section-tint:var(--color-violet-soft)]',
} as const;

/**
 * The short rule under a section heading.
 *
 * This is where the section's hue announces itself, and it is deliberately the
 * smallest possible gesture -- a 40px bar, not a tinted heading. Colouring the
 * heading text itself was the obvious move and the wrong one: it drops the
 * heading's contrast against paper for no gain, and a page of four differently
 * coloured headings reads as four different websites rather than four rooms in
 * one.
 */
export const SECTION_RULE = 'mt-5 h-0.5 w-10 rounded-full bg-[var(--section-accent)]';

/**
 * A non-interactive label: a technology, a course, a tag.
 *
 * Neutral at rest, section-hued on hover. The hue arrives only on the element
 * the pointer is actually on, which is what keeps 63 chips from turning the
 * section into a colour field -- the accent stays a highlighter even when there
 * are dozens of candidates for it.
 *
 * Hover is a colour step and nothing more. The previous version put
 * `hover:scale-105` on every chip; scaling lifts a chip off the baseline its
 * neighbours share, so pointing anywhere in the list made the whole row twitch.
 * A label that is not a link has nothing to promise on hover beyond "I see you".
 *
 * `transition-colors`, never `transition-all` -- the latter animates whatever
 * happens to change, including properties that must land instantly.
 */
export const CHIP =
  'rounded-md border border-rule/70 bg-paper-2 px-3 py-1.5 text-[13px] text-neutral ' +
  'transition-colors duration-200 hover:border-[var(--section-accent)]/50 ' +
  'hover:bg-[var(--section-tint)] hover:text-ink';

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
export const PANEL =
  'rounded-xl border border-[var(--section-accent)]/15 p-6 ' +
  'bg-[color-mix(in_oklab,var(--section-accent)_5%,var(--color-paper-2))]';

/**
 * The section's ground, tinted toward its hue.
 *
 * 5% of the accent mixed into paper -- small enough that it never competes with
 * text and never reads as a coloured block, large enough that the four sections
 * are distinguishable at a glance while scrolling rather than only on close
 * inspection of their details.
 *
 * `color-mix(in oklab, ...)` rather than a stack of alpha layers, so the tint
 * is computed in a perceptual space and the result stays at the lightness the
 * palette intends. Mixing in sRGB darkens as it saturates, which is exactly the
 * muddiness that makes hand-tinted dark themes look grimy.
 */
export const SECTION_GROUND =
  'bg-[color-mix(in_oklab,var(--section-accent)_5%,var(--color-paper))]';

/**
 * One number in a row of numbers.
 *
 * Every figure is `text-ink`; the label beneath is `text-muted`. The previous
 * rows gave each stat its own hue -- repos blue, stars purple, top language
 * pink, followers cyan, since green -- which reads as five different kinds of
 * thing when they are five instances of one kind. Difference in colour has to
 * mean difference in kind, which is exactly why the hue varies by SECTION and
 * never within one.
 *
 * `tabular-nums` so the digits sit on a common width and the row stays a column
 * of numbers rather than a ragged one.
 */
export const STAT_VALUE = 'text-xl font-semibold tabular-nums text-ink';
export const STAT_LABEL = 'mt-1 text-[11px] text-muted';

/**
 * A text link inside a section. Carries the section's hue, and underlines on
 * hover rather than changing colour, because the hue is already doing the work
 * of saying "link" at rest.
 *
 * The focus ring is deliberately absent from the transition list. A ring that
 * fades in over 200ms leaves a keyboard user with no indicator for the first
 * 200ms of having focus, which is the moment they most need one.
 */
export const LINK =
  'text-[var(--section-accent)] underline-offset-4 transition-colors duration-200 hover:underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]';

/**
 * A bordered control that carries the section's hue: "Open GitHub", and the
 * like. Bordered and tinted, never filled -- an accent-filled button is how a
 * one-hue-per-section palette quietly becomes a coloured page.
 */
export const ACCENT_BUTTON =
  'rounded-lg border border-[var(--section-accent)]/50 px-4 py-2 text-center text-[13px] font-semibold ' +
  'text-[var(--section-accent)] transition-colors duration-200 hover:border-[var(--section-accent)] ' +
  'hover:bg-[var(--section-tint)] focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[var(--section-accent)]';

/** A neutral control: view toggles, filter triggers, disclosure buttons. */
export const QUIET_BUTTON =
  'rounded-lg border border-rule/60 bg-paper-2 px-3.5 py-2 text-[13px] font-medium text-neutral ' +
  'transition-colors duration-200 hover:border-rule hover:bg-paper-3 hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]';
