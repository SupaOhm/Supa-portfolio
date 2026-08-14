# Slice B3 — Remaining Accessibility Items

**Date:** 2026-08-14
**Branch:** `fix/a11y-polish`
**Merge base:** `c540558` (main, after B2 merged via PR #7)
**Predecessors:** Slice A (PR #5), Slice B1 (PR #6, reduced motion), Slice B2 (PR #7, keyboard access)

## Goal

Close the accessibility findings left open after B2: colour contrast, touch target
size, missing ARIA state, missing live regions, and markup semantics. This is the
last accessibility slice; after it, the audit's accessibility dimension has no
open Critical, High, or Medium findings.

## Verified premises

Every number below was recomputed from the source values on 2026-08-14 rather than
carried over from the audit report. The audit's figures were confirmed correct.
Method: WCAG 2.x relative luminance over sRGB, `(L_lighter + 0.05) / (L_darker + 0.05)`.

Palette values are Tailwind v3 defaults: `gray-300 #d1d5db`, `gray-400 #9ca3af`,
`gray-500 #6b7280`, `gray-600 #4b5563`, `gray-700 #374151`, `gray-800 #1f2937`,
`gray-900 #111827`, `gray-950 #030712`.

| Element | Computed | Threshold | Verdict |
| --- | --- | --- | --- |
| `text-gray-500` on `gray-950` | 4.16:1 | 4.5 (1.4.3 text) | FAIL |
| `text-gray-500` on `gray-900` | 3.67:1 | 4.5 (1.4.3 text) | FAIL |
| `text-gray-400` on `gray-950` | 7.93:1 | 4.5 | PASS |
| `text-gray-400` on `gray-900` | 6.99:1 | 4.5 | PASS |
| Dot `bg-gray-600` on `gray-950` | 2.66:1 | 3.0 (1.4.11 UI) | FAIL |
| Dot `bg-gray-500` on `gray-950` | 4.16:1 | 3.0 (1.4.11 UI) | PASS |
| Neighbour card body text (current) | 2.46:1 | 4.5 | FAIL |
| Neighbour card body text (proposed) | 4.52:1 | 4.5 | PASS |

**Two corrections to the audit's framing, both material to scope:**

1. `gray-500` at 4.16:1 **passes** the 3:1 non-text UI threshold. It fails only as
   *text*. Scope is therefore text sites, not every `gray-500` in the codebase —
   and it is precisely why `gray-500` is an acceptable new value for the dots.
2. The neighbour figure of 2.46:1 is **in-card** contrast — body text against that
   same card's background. `filter: brightness(0.7)` and `opacity: 0.7` stack and
   dim the card background along with its text, collapsing in-card contrast from
   7.01:1 to 2.46:1. It is not a text-versus-page-background measurement, and
   changing only the text colour therefore does not fix it: at the current dimming,
   `gray-300` body text still reads only 3.59:1.

Solved grid for in-card contrast of `gray-400` body text on a `gray-800/50` card:

```
opacity \ brightness    0.7    0.8    0.9    1.0
             0.70      2.46   2.90   3.41   3.97
             0.85      3.12   3.78   4.52   5.35
             1.00      3.92   4.83   5.86   7.01
```

`opacity 0.85` + `brightness(0.9)` is the chosen cell: the smallest movement from
today's values that clears 4.5:1.

**Target-size measurements** (WCAG 2.2 SC 2.5.8, Level AA, 24x24 CSS px):

| Control | Measured | Verdict |
| --- | --- | --- |
| Carousel dot (`w-3 h-3`) | 12x12 | FAIL |
| Carousel arrow, mobile (`px-1.5 py-8`, 14px icon) | 26x78 | PASS |
| Mobile nav row (`px-4 py-2`, `text-sm`) | ~36 tall | PASS |

Only the dots fail the AA bar. Arrows and nav rows fail only SC 2.5.5 (44x44,
Level AAA), which this slice does not target.

## Decisions

**Target level: WCAG 2.2 Level AA.** Not AAA. This scopes target size to the dots
alone and leaves arrows and mobile nav rows untouched.

**Carousel dimming is reduced, not removed.** Side cards keep `translateX`,
`scale`, and `rotateY`, so depth still reads; only the opacity and brightness
values move. The alternative of leaving 2.46:1 in place was rejected: the cards are
`inert` after B2 and so unreachable by keyboard, but their text is still visible,
and SC 1.4.3 applies to visible text regardless of interactivity.

## Group 1 — Contrast

**1.1** Replace `text-gray-500` with `text-gray-400` at all nine text sites:

- `src/components/Footer.tsx:14`
- `src/components/Hero.tsx:87`, `:109`, `:110`, `:111`, `:176`
- `src/components/ProjectCard.tsx:74`
- `src/components/Projects.tsx:192`, `:214`

`Hero.tsx:176` and `Projects.tsx:192`/`:214` sit on `gray-900` rather than
`gray-950`; `gray-400` clears 4.5:1 on both grounds, so one replacement value
serves every site.

**1.2** Carousel dots, `src/components/Projects.tsx:322`: inactive dot background
`bg-gray-600` -> `bg-gray-500`. The existing hover state is `hover:bg-gray-500`,
which would become a no-op, so it moves to `hover:bg-gray-400` to preserve a
visible hover delta. The active dot stays `bg-blue-500` (5.47:1, already passing).

**1.3** Carousel neighbours, `src/lib/carouselPositionStyles.ts`: for slots `1` and
`-1`, in **both** exported maps, `opacity: 0.7` -> `0.85` and
`filter: 'brightness(0.7)'` -> `'brightness(0.9)'`.

Slots `2` and `-2` are `opacity: 0` — invisible, so exempt from 1.4.3. They are
left unchanged.

B1 established that `REDUCED_POSITION_STYLES` differs from `POSITION_STYLES` only
in `transform` (no `rotateY`, no `scale`). That invariant must survive this slice:
opacity, zIndex, and filter stay identical between the two maps.

**1.4** Decorative brackets, `src/components/Projects.tsx:122` and `:124`: add
`aria-hidden="true"` to both `<span>`s. Their `text-gray-700` colour (1.95:1) is
kept — SC 1.4.3 exempts pure decoration. This also stops the `<h2>` computing an
accessible name of "[ Featured Projects ]".

## Group 2 — Touch target

`src/components/Projects.tsx:315-327`. The dot button currently carries both the
hit area and the visual appearance on one element, so padding it would change how
the dot looks. Split the two responsibilities: the `<button>` takes `p-1.5` and no
background; an inner `<span>` takes the size and colour classes.

12px visual + 6px padding on each side = exactly 24x24. The active dot becomes
44x24, which also passes.

The dot `<button>` is currently self-closing (`/>`) with no children, so this
change also converts it to an open/close pair wrapping the new `<span>`.

The container's `gap-2` becomes `gap-0` so adjacent 24px hit areas abut without
overlapping.

**Accepted visual change:** the gap between dots grows from 8px to 12px. This is
the deliberate cost of the fix and should not be reported as a regression.

**Rejected alternative:** expanding the hit area with a `::before` pseudo-element
would leave layout untouched, but at `gap-2` the expanded areas of adjacent dots
would overlap by 4px. Overlapping targets are their own defect, so the padding
approach wins.

## Group 3 — ARIA state and live regions

**3.1 View toggle**, `src/components/Projects.tsx:130-134`. Add
`aria-pressed={isCarouselView}`. Replace `aria-label="Toggle view"` with
`aria-label="Carousel view"`.

The label is **replaced, not supplemented**. A toggle button's accessible name must
describe what it controls and stay constant; the pressed state is what changes.
"Toggle view" plus `aria-pressed` would announce as "Toggle view, pressed", which
tells the user nothing about which view is active.

**3.2 Filter result count.** A `role="status"` element reporting how many projects
survive the current filters.

**3.3 Carousel position.** A `role="status"` element reporting the centred card as
`Project <n> of <m>: <title>`.

Both regions are:

- **`sr-only`** — no visible result-count UI is added, keeping the visual design
  untouched. Group 1 already changes visible colours; this slice adds no new
  visible chrome.
- **permanently mounted** — rendered unconditionally, with only their text content
  changing. A live region inserted into the DOM at the same moment its text appears
  is not reliably announced; the element must already exist for the change to
  register.

Both live inside the `<section>`, outside any conditional branch, so neither is
unmounted when the view toggles or when the filtered set is empty.

## Group 4 — Landmarks and semantics

**4.1 Section names.** Each of the five sections gains `aria-labelledby` referencing
its own heading, and that heading gains a matching `id`:

| Section | File | Heading | New id |
| --- | --- | --- | --- |
| `#home` | `Hero.tsx:66` / `:90` | `<h1>` | `hero-heading` |
| `#about` | `About.tsx:74` / `:82` | `<h2>` | `about-heading` |
| `#skills` | `Skills.tsx:17` / `:24` | `<h2>` | `skills-heading` |
| `#projects` | `Projects.tsx:108` / `:121` | `<h2>` | `projects-heading` |
| `#connect` | `Connect.tsx:134` / `:139` | `<h2>` | `connect-heading` |

Hero's `<h1>` is static text ("Supakorn Prayongyam / SIIT, Thammasat University");
the typewriter effect is on a different element, so the h1 is safe to use as a
label source.

**4.2 Navigation name.** `src/components/Navbar.tsx:59`: add `aria-label="Main"`.

**4.3 List semantics.** Two chip groups are visually lists but structurally
`<div>`-of-`<span>`:

- `src/components/Skills.tsx:39-49` — skill chips
- `src/components/ProjectCard.tsx:88-97` — project tags

Convert the wrapping `<div>` to `<ul>` and each chip `<span>` to `<li>`, moving
the existing classes across unchanged. Tailwind preflight already sets
`list-style: none` and zero padding on `ul`, so the rendered appearance does not
change. The flex classes move to the `<ul>`.

The Skills chips carry inline `revealStyle(...)` output. That style moves to the
`<li>` untouched. B1 established `revealStyle` returns only `opacity` and
`animation` and never a `transition` longhand, so it cannot clobber the chips'
`transition-all` hover behaviour.

**4.4 Heading nesting.** `src/components/About.tsx:128` and
`src/components/Connect.tsx:288` render the GitHub display name as `<h3>`. In
About it sits under the "GitHub Activity" `<h3>` at `:105`, making a heading its
own sibling's child. Both become `<p>` with the same classes: a card label is not
a document section.

No level *skips* exist in the document — the order is h1 (Hero), then h2 per
section, then h3s — so no other heading changes are needed.

**4.5 Alt text.** `src/components/ProjectCard.tsx:69`: `alt={project.title}` ->
`alt=""`. The title is already announced by the adjacent `<h3>` at `:80`; the
current alt makes screen readers say it twice. An empty alt marks the image
decorative, which is correct when the adjacent text conveys the same information.

The two GitHub avatar alts (`About.tsx:123`, `Connect.tsx:283`) are already
correct and are not touched.

## Testing

Test environment is established: Vitest with `environment: 'node'` globally and
per-file jsdom opt-in via a `// @vitest-environment jsdom` docblock (Slice B2).
jsdom test files require an explicit `afterEach(cleanup)` because
`test.globals` is not enabled.

**Covered by automated tests (Groups 3 and 4):**

- `aria-pressed` flips with the view toggle, and the accessible name stays constant
- filter live region updates its text when a filter changes
- carousel live region updates its text when position changes
- each section resolves an accessible name via `aria-labelledby`
- `nav` has an accessible name
- skill chips and project tags expose `list` / `listitem` roles
- project image has an empty alt (is not exposed as an image with a name)

**Covered by a Node unit test (Group 1.3):**

`POSITION_STYLES` and `REDUCED_POSITION_STYLES` carry the new opacity and filter
values, and remain identical to each other on every property except `transform`.

**NOT covered by any test — this is a real limit, not an oversight:**

- **Contrast (1.1, 1.2, 1.3).** jsdom does not compute colour. It does not resolve
  Tailwind class names to values, does not composite `opacity`, and does not apply
  `filter`. No test in this slice demonstrates that any contrast ratio improved.
  The unit test above proves the source values changed; it does not prove the
  rendered result passes.
- **Target size (Group 2).** jsdom has no layout engine. `getBoundingClientRect`
  returns zeros. Nothing asserts the dot hit area is 24x24.
- **The 8px -> 12px dot gap.** Visual only.

Both B1 and B2 shipped with unverified browser-behaviour premises, and in both
cases that is exactly what escaped per-task review. The mitigation here is that
the ratios above were computed from first principles *before* the values were
chosen, so the premises are checkable arithmetic rather than assertions. What
remains unverified is only that the browser renders those computed values, which
requires the manual pass below.

## Manual verification checklist

To be run against the Vercel preview deployment. Not automatable in this
environment — the Chrome extension is not connected.

1. DevTools colour picker on Hero's "Hola World" label: contrast >= 4.5:1.
2. DevTools on an inactive carousel dot: contrast >= 3:1 against the page.
3. DevTools on a side carousel card's description text against that card's own
   background: >= 4.5:1.
4. Inspect a carousel dot: rendered box is at least 24x24 CSS px, and adjacent
   dots' boxes do not overlap.
5. Screen reader (VoiceOver): the view toggle announces as
   "Carousel view, toggle button, pressed" / "not pressed".
6. Screen reader: changing a filter announces the new project count without
   moving focus.
7. Screen reader: pressing a carousel arrow announces "Project n of m: <title>".
8. Screen reader rotor: five landmarks are listed, each named by its own heading
   text -- "Supakorn Prayongyam SIIT, Thammasat University", "About Me",
   "Skills & Technologies", "Featured Projects", "Get In Touch" -- plus a "Main"
   navigation. Note that "Featured Projects" confirms 1.4 worked: without
   `aria-hidden` on the bracket spans it would read "[ Featured Projects ]".
9. Confirm the side cards still read as receding — the depth effect should be
   softened, not lost.

## Out of scope

- Arrow and mobile-nav target sizes (pass AA at 26px and ~36px; fail only AAA).
- Any visible result-count UI.
- Image payload, lazy loading, rAF loops, GitHub fetch caching (Slice C).
- `<head>` metadata and the OG image (Slice D).
