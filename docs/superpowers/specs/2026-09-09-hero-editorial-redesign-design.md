# Hero: editorial masthead redesign

**Date:** 2026-09-09
**Status:** Approved, not yet implemented

## Problem

The landing section reads as machine-generated. This is not a vibe — it is a
checklist of defaults, and `src/components/Hero.tsx` currently hits almost all
of them:

| Tell | Where |
| --- | --- |
| Typewriter cycling job titles | `WORDS` + `useTypewriter` |
| Fake `const developer = {...}` code block | right column |
| Fake macOS traffic-light dots | red/yellow/green circles |
| Gradient-clipped name (blue → cyan → blue) | `bg-clip-text` on "Supakorn" |
| `// Initializing_Profile`, `SYS_ACTV`, floating `+` crosshairs | sci-fi dressing |
| Cursor-following blur glow | `useCursorGlow` + `cursor-glow` div |
| Blueprint grid and dot backgrounds | `bg-grid-pattern`, `bg-dot-pattern` |
| Blue/purple on `gray-950` | the default generated palette |
| "View Projects →" / "Get in Touch" button pair | CTA row |
| No typeface choice at all | zero `@font-face`, bare system stack |

Underneath the costume the content is strong and badly placed. Best Paper at
IEEE IMC 2026 is buried in a mono block below the fold of attention, while a
fake JavaScript object occupies the entire right half of the screen. Every
pixel that is decoration is a pixel not spent on the two facts that get an
interview: the award, and the fact that he is available.

## Direction

Four options were considered: editorial/typographic, evidence-first, an
"earned" terminal with the fakery removed, and a light/inverted theme.
**Editorial/typographic** was chosen — it is the one direction a language model
does not reach for by default, and restraint reads as confidence in a way that
decoration cannot.

Within that, three layouts were mocked and **masthead** was chosen: the name set
edge to edge as a nameplate, with a three-column band beneath answering the
three questions a recruiter actually has. The alternatives were a single quiet
left column (most beautiful, gives a five-second skim the least to grab) and a
main column with a right-hand fact rail (lowest risk, least distinctive).

Copy voice is **measured engineer** — noun-led, no first person, the register
the paper itself would use.

Palette is **demoted blue**: the existing `#030712` ground kept, with blue
surviving only as a link colour. A hueless "ink" palette and a warm
amber-accented palette were both rejected on the same ground — About, Skills
and Connect are not being restyled in this pass, and either would put a visible
seam one scroll below the fold.

## Scope

In scope:

- Rewrite `src/components/Hero.tsx` and its test.
- Introduce a real typeface, self-hosted.
- Delete the blueprint costume wherever it survives, including the leftovers in
  `Projects.tsx`.
- Consolidate the award strings into `src/data/profile.ts`.

Explicitly **not** in scope: restructuring the Projects carousel, and restyling
About, Skills or Connect. Those keep their current look — `About.tsx` is edited
only to read the award from the new constants, with no visual change. The seam
between the new landing screen and the untouched sections below is a known,
accepted cost of this pass.

## Files touched

| File | Change |
| --- | --- |
| `src/components/Hero.tsx` | Full rewrite |
| `src/components/Hero.test.tsx` | Rewrite — current assertions no longer describe the page |
| `src/index.css` | `@font-face`; new `@utility` rules; delete dead utilities |
| `index.html` | Font preload |
| `public/fonts/` | New — self-hosted variable `.woff2` |
| `src/data/profile.ts` | Add `PAPER_TITLE`, `AWARD`, `VENUE` |
| `src/components/About.tsx` | Adopt the new award constants at the one non-prose site (line 43) |
| `src/components/Projects.tsx` | Strip `bg-grid-pattern`, `marker-cross*`, the `font-mono` kicker |
| `src/hooks/useTypewriter.ts` | Delete — Hero was the only consumer |
| `src/hooks/useTypewriter.test.ts` | Delete with it |
| `scripts/font-preload.test.ts` | New guard (see Testing) |

### What must NOT be deleted

`useCursorGlow` is **not** dead. `Connect.tsx` and `ProjectCard.tsx` both call
it, and it accounts for six `cursor-glow` divs between them. The hook, the
`cursor-glow` utility in `index.css`, and both of its test files stay untouched.
Only Hero's own glow div is removed.

### Utilities safe to delete

Verified by grep across `src/`; each is consumed only by Hero, or by Hero and
Projects:

`shadow-tactile`, `shadow-tactile-dark`, `bg-dot-pattern`, `animate-blink`,
`@keyframes blink` (all Hero-only) and `bg-grid-pattern`, `marker-cross`,
`marker-cross-tl/tr/bl/br` (Hero and Projects, both being edited).

`animate-fade-in` is kept — the new motion plan uses it.

When `animate-blink` goes, its reference in the `prefers-reduced-motion` block
at the foot of `index.css` must go with it, or that rule targets a class that no
longer exists.

## Typography

One typeface: **Bricolage Grotesque**, variable, self-hosted as a latin-subset
`.woff2` under `public/fonts/`. Self-hosted rather than the Google CDN so there
is no third-party request and no flash of unstyled text on a cold load.
`font-display: swap`, preloaded from `index.html`.

Tailwind has no utility for `font-variation-settings`, so the three roles are
declared as `@utility` rules in `index.css`, matching the v4 convention already
used in that file:

- **Nameplate** — `wdth 82, wght 700, opsz 96`; uppercase. Size and tracking are
  both breakpoint-dependent and container-relative; see **Responsive
  behaviour**.
- **Band label** — same family at 11px, uppercase, tracking `0.1em`, weight 500.
- **Body** — `opsz 14, wght 400`, 15–16px, max ~34ch per column.

JetBrains Mono, which the mockups used for the band labels, is **not** adopted.
Mono micro-labels are the last surviving piece of terminal costume, and dropping
them means one font file instead of two.

## Layout

```
┌────────────────────────────────────────────────────────┐
│  SUPAKORN PRAYONGYAM                                   │  nameplate, full bleed
│  ──────────────────────────────────────────────────    │  hairline
│                                                        │
│  WHAT I DO         RECOGNITION       AVAILABILITY      │  band labels
│                                                        │
│  Security and      → ESNIDSaaS       Open to SWE       │  1.4fr 1fr 1fr
│  retrieval         Best Paper        internships.      │
│  systems —         Award,            → Get in touch    │
│  intrusion         IEEE IMC 2026                       │
│  detection, RAG                      Computer Eng      │
│  pipelines — and                     4th Year          │
│  the measurements                    SIIT, Thammasat   │
│  that show                           Graduating        │
│  whether they                        June 2027         │
│  work.                                                 │
│  ──────────────────────────────────────────────────    │  hairline, mt-auto
│  See the work ↓                    Pathum Thani, TH    │  footer row
└────────────────────────────────────────────────────────┘
```

That is the `lg` layout. See **Responsive behaviour** below for the rest — the
nameplate and the band each change shape twice on the way down.

The two uppercase tactile buttons are gone. Navigation is inline text links with
arrows, but they remain `<button>` elements calling `handleSectionClick` — the
same section-scroll pattern `Navbar.tsx` and the current Hero already use, since
there is no href to navigate to. Focus rings are preserved on every one.

`aria-labelledby="hero-heading"` on the section and exactly one `<h1>` on the
page are both preserved; `landmarks.test.tsx` and `integration.a11y.test.tsx`
depend on this.

### Copy

Nameplate renders `FULL_NAME`, uppercased in CSS rather than in the string.

- **What I do** — "Security and retrieval systems — intrusion detection, RAG
  pipelines — and the measurements that show whether they work."
- **Recognition** — `PAPER_TITLE` as a link to `#projects`, then
  `AWARD`, `VENUE`.
- **Availability** — "Open to SWE internships." then a "Get in touch" link to
  `#connect`, then a stacked fact block: `PROGRAM`, `ACADEMIC_YEAR`,
  `INSTITUTION`, "Graduating `EXPECTED_GRADUATION`".
- **Footer** — "See the work ↓" (scrolls to `#projects`) and `LOCATION`.

Every academic and contact fact comes from `src/data/profile.ts`. No literals —
`scripts/profile-drift.test.ts` scans for a bare `\d(?:st|nd|rd|th) Year` and a
GPA shape in every component and fails the build on either.

The Availability facts are stacked on separate lines rather than run into a
sentence, because `INSTITUTION` is itself `'SIIT, Thammasat'` and inlining it
produces a comma pileup.

**The GPA does not appear on the landing screen.** It has no room in the band
and 3.24 is not a number that wins an interview; it remains stated in
`About.tsx`. The GPA assertion in the current `Hero.test.tsx` is dropped rather
than migrated — `About.test.tsx` and `profile-drift.test.ts` already cover it.

**The project count does not appear either.** The projects date to roughly
mid-2025 and a content refresh is planned; a masthead that advertises a count
points hard at content that is about to change.

## Responsive behaviour

A full-bleed nameplate is the one layout that cannot be made responsive by
stacking alone. The type has to be sized so the *longest line* reaches both
edges, and the longest line changes when the break point changes — so the
sizing rule changes with it. Everything below follows from that.

### Breakpoints

| Width | Nameplate | Band | Section padding |
| --- | --- | --- | --- |
| base, `< 640` | Two lines | One column, stacked | `pt-16` (clears the `h-14` bar) |
| `sm`, `640–767` | Two lines | One column, stacked | `pt-24` (clears `top-6` + `h-16`) |
| `md`, `768–1023` | Two lines | Two columns — "What I do" spans row 1, Recognition and Availability share row 2 | `pt-24` |
| `lg`, `≥ 1024` | One line | Three columns, `1.4fr 1fr 1fr` | `pt-24` |

The band's `md` shape is not an arbitrary halfway house: "What I do" is the only
column holding a paragraph, and at 768px three columns leave it roughly 210px —
about 14 characters a line. Letting it span the full row keeps it at a readable
measure while the two short fact columns, which are naturally narrow, sit
beneath it.

Stack order below `md` is What I do → Recognition → Availability, matching both
the DOM order and the `lg` reading order, so nothing depends on CSS reordering.

### Sizing the nameplate

The nameplate is sized against the **content box, not the viewport**, using a
container query (`@container` on the `max-w-7xl` wrapper, `cqi` units). This
matters because the container caps at `80rem`: past ~1376px of viewport the
content box stops growing, and a `vw`-based size would keep growing and overflow
the container. `cqi` tracks the box that actually constrains the text.

Two rules, switched at `lg`, because the longest line differs:

- **Two-line setting** (below `lg`) — longest line is `PRAYONGYAM`, ~10 glyphs.
  Starting value `font-size: clamp(2.75rem, 19cqi, 9rem)`.
- **One-line setting** (`lg` and up) — `SUPAKORN PRAYONGYAM`, 19 glyphs plus a
  space. Starting value `font-size: clamp(4rem, 9.9cqi, 8.5rem)`.

**Both coefficients are starting values, not derived facts.** They assume an
average uppercase advance of roughly `0.52em` at `wdth 82, wght 700`, which is
an estimate — they must be calibrated by eye against the real font file, and
re-calibrated if the `wdth` axis is ever changed. Getting this wrong is not
subtle: it shows as an obvious gap at the right edge, or as overflow.

Consequence worth accepting up front: in the two-line setting, `SUPAKORN` is
eight glyphs against `PRAYONGYAM`'s ten, so the first line will always fall
short of the right edge. That is a ragged setting, which is normal editorially —
it is not a bug to be fixed by tracking the short line out.

Tracking scales with size rather than staying fixed: `-0.045em` at the one-line
`lg` setting, relaxing to `-0.03em` below `md`. Tight negative tracking that
reads as confident at 120px reads as broken at 44px.

### Vertical space

The section is `min-h-dvh`, not `min-h-screen` and not `h-screen`:

- `dvh` rather than `vh` because mobile browsers report `100vh` as the height
  *without* the collapsing URL bar, which pushes the footer row off-screen on
  first paint.
- `min-h-` rather than `h-` because on a short viewport — a landscape phone at
  ~375px tall, or a desktop window dragged short — the masthead plus a stacked
  band plus the footer row simply does not fit. The section must grow and let
  the page scroll rather than clip. `mt-auto` on the bottom hairline degrades
  gracefully: it pins the footer to the bottom when there is slack and behaves
  as a normal margin when there is not.

The `pt-16` / `sm:pt-24` values in the table exist because `Navbar` is `fixed`
and out of flow. They must clear its bottom edge: `top-0` + `h-14` = 57px with
its border on mobile, and `sm:top-6` + `sm:h-16` = 90px from `sm`. These are the
same numbers `scroll-padding-top` in `index.css` is built from, and
`scripts/scroll-offset.test.ts` guards that stylesheet against `Navbar.tsx`
drift — but it does **not** guard Hero's own padding, which is an independent
copy of the same constraint. If the navbar height ever changes, this is a third
place to update by hand.

### Touch targets

This is the one accessibility regression the redesign risks introducing. The
current CTAs are `px-8 py-3` buttons — comfortably past the 44×44px minimum. The
replacements are inline text links at 15px, which are roughly 20px tall.

Every section-scroll button therefore carries vertical padding to reach a 44px
hit area, cancelled by an equal negative margin so the text still sits on its
editorial baseline and the band's rhythm is unchanged (`py-3 -my-3` or
equivalent). The visible underline stays tight to the text; only the hit area
grows.

### Footer row

The footer is a two-item `justify-between` flex. At 320px, "See the work ↓" and
`LOCATION` ("Pathum Thani, Thailand") together exceed the line. It wraps with a
gap rather than shrinking or truncating, so the location drops to its own line
on the narrowest phones.

### What is not covered by tests

Effectively all of the above. jsdom performs no layout — every
`getBoundingClientRect()` returns zeros and `innerHeight` is a fixed 768 — so a
test asserting a breakpoint, a `cqi` size, or a 44px hit area would pass while
asserting nothing. `src/test/doubles.ts` and its `stubRect` exist for
geometry-dependent tests, but they cannot substitute for a layout engine
evaluating a media query.

Responsive behaviour is verified by hand, and the plan should name the widths
rather than leaving "check it looks fine": **320, 375, 640, 768, 1024, 1280 and
1920**, plus one short-landscape check at roughly 812×375 to confirm the section
grows instead of clipping.

## Palette and motion

Ground stays `#030712`. Text `gray-100`, body copy `gray-400`, band labels
`gray-500`, hairlines `gray-800`. Blue (`blue-400`) appears **only** on
interactive elements and the focus ring.

Removed: the gradient text clip, purple entirely, the cursor glow, the grid and
dot patterns, and every blur orb.

Motion is a single staggered fade-up on mount using the existing `fadeIn`
keyframe — roughly three steps over 400ms. It is already covered by the
`prefers-reduced-motion` block in `index.css`. Hover state is an underline.
Nothing translates, rotates, blinks or pulses.

## Testing

`Hero.test.tsx` is rewritten to assert what the new page actually is:

1. The profile constants reach the page — `PROGRAM`, `INSTITUTION`,
   `ACADEMIC_YEAR`, `LOCATION`, `EXPECTED_GRADUATION`. This is the reason the
   original test existed (Hero showed a stale year and GPA for a full session)
   and the reason survives the redesign.
2. The award is stated from the new constants, not a literal.
3. Exactly one `<h1>`.
4. "See the work" scrolls to `#projects`.
5. "Get in touch" scrolls to `#connect`.

`useTypewriter.test.ts` is deleted with its hook. `useCursorGlow`'s two test
files are untouched.

`scripts/font-preload.test.ts` is added, following the pattern of
`scroll-offset.test.ts` and `discoverability.test.ts` — cross-file couplings in
this repo are guarded by a test that parses both sides, because nothing in the
browser links them. It asserts that the `href` of the font preload in
`index.html` matches the `src` in the `@font-face` rule in `index.css`, and that
the file exists under `public/fonts/`.

Verification before the work is called done: `npm test`, `npm run typecheck`,
`npm run lint` and `npm run build` all green, plus the manual width sweep named
under **Responsive behaviour** — 320, 375, 640, 768, 1024, 1280, 1920 and one
short-landscape viewport. The automated suite cannot see any of it.

## Risks

- **The seam.** About, Skills and Connect keep the old look. Accepted; the
  demoted-blue palette was chosen specifically to keep that seam as quiet as
  possible.
- **Font weight on the wire.** A latin-subset variable `.woff2` is roughly
  35–45KB. Preloading keeps it off the critical render path for a repeat
  visitor; a first paint may briefly swap.
- **Silent style loss.** Tailwind v4 does not error on a class whose `@utility`
  has been deleted — it just renders unstyled. The deletion list above was
  verified by grep and must be re-verified against the final diff.
- **The nameplate coefficients are estimates.** Both `cqi` values assume an
  average glyph advance that has not been measured against the real font file.
  They need calibrating by eye, and a wrong value is visible rather than subtle:
  a gap at the right edge, or overflow. Nothing automated will catch it.
- **Touch targets.** Replacing padded buttons with inline text links drops the
  natural hit area to about 20px. The padding-plus-negative-margin fix is easy
  to lose in a later tidy-up, and jsdom cannot assert it.
- **A third copy of the navbar height.** Hero's top padding encodes the same
  constraint as `scroll-padding-top`, which `scroll-offset.test.ts` guards
  against `Navbar.tsx` — but that guard does not cover Hero. A navbar height
  change now needs three hand edits.
- **`node:` imports.** `scripts/font-preload.test.ts` uses `node:fs`, so it must
  live under `scripts/`, not `src/`. `tsconfig.app.json` sets
  `types: ["vite/client"]` with no Node types; a `node:` import under `src/`
  passes `npm test` and fails `npm run typecheck` with TS2307.
