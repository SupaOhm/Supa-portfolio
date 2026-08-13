# Keyboard Access — Design

**Date:** 2026-08-13
**Branch:** `fix/keyboard-access`
**Status:** Approved, ready for implementation planning
**Slice:** B2 of the audit remediation (second of three accessibility sub-slices)

## Context

Slice B (accessibility) was decomposed into three sub-slices. B1 (motion) shipped in PR #6.
This is B2: keyboard access. B3 (contrast, touch targets, ARIA state, live regions)
remains.

B2 contains the audit's only **Critical** finding: three containers hide content from the
mouse but leave it fully reachable by keyboard. A keyboard or switch user tabs into
elements they cannot see, with the focus ring rendered at zero opacity.

### Line numbers

All citations were re-derived on 2026-08-13 against `main` at `5ef650f`. The original
audit's citations are stale — Slice A and Slice B1 both shifted these files.

### Out of scope

- **Slice B3:** colour contrast, touch-target sizing, `aria-pressed` on the view toggle,
  live regions for filter/carousel changes, section landmark labels, heading nesting, list
  semantics, alt-text quality.
- **Slice C:** the three `requestAnimationFrame` cursor-glow loops.
- Arrow-key carousel navigation (ARIA APG carousel pattern). The audit listed it as an
  enhancement, not a defect; prev/next/dots already provide keyboard navigation.

## 1. Verified premises

B1 shipped two defects that reached the final review untouched, and both traced to
browser-behaviour claims asserted in the spec and never checked. This section records what
was verified before designing, and what was not.

### Verified

| Claim | Evidence |
|---|---|
| React accepts `inert` as a boolean prop | `react@19.2.3` resolved; `@types/react/index.d.ts:2817` declares `inert?: boolean \| undefined`. Under React 18 the string form `inert=""` was required and the boolean form failed silently. |
| `inert` is within the project's browser target | No `browserslist` is declared and `vite.config.ts` sets no `build.target`, so Vite 7's default `baseline-widely-available` applies. `inert` reached Baseline in April 2023 (Chrome 102, Safari 15.5, Firefox 112). |
| `inert` removes descendants from the tab order **and** the accessibility tree | HTML Standard, "inert subtrees". This is why it also makes the existing `aria-expanded` attributes truthful. |

### NOT verified — the plan must verify these as explicit steps

| Claim | Why it is unverified | How the plan verifies it |
|---|---|---|
| jsdom does not implement `window.matchMedia` | jsdom is not installed, so it cannot be exercised from here. Widely reported, but that is not evidence. | Plan Task 1 installs jsdom and renders a component that calls `usePrefersReducedMotion` **before** writing any stub. If it throws, the stub is required and justified; if it does not, the stub is dropped as unnecessary. |
| `@vitest-environment jsdom` docblocks select the environment per file | Documented Vitest behaviour, unexercised in this repo. | Plan Task 1 confirms the existing 48 node tests still report `environment: 'node'` while the new file runs under jsdom. |

**Neither claim may be assumed by an implementer.** That is the direct lesson from B1.

## 2. `inert` at three sites

Each collapsing wrapper gains a single `inert` prop. Nothing else about the animation,
layout, or class strings changes.

| Site | Prop | What it guards |
|---|---|---|
| `src/components/Navbar.tsx:117` | `inert={!isMenuOpen}` | 5 nav `<button>`s |
| `src/components/Connect.tsx:221` | `inert={!showAllDetails}` | 4 contact `<a>`s plus a heading |
| `src/components/Projects.tsx:243` | `inert={pos !== 0}` | each non-centre card's 1-2 links |

### Why `inert` rather than the alternatives

Conditional rendering (`{isOpen && …}`) is trivially correct but destroys both collapse
animations — an invisible fix bought with a visible regression. `visibility: hidden` works
and is transitionable, but must be sequenced against the `max-height` transition or the
content vanishes before the height finishes collapsing, and it does **not** remove the
subtree from the accessibility tree, so `aria-expanded` would stay half-true.

`inert` does not affect layout, so both animations are untouched.

### Navbar is narrower than the audit implied

`Navbar.tsx:120` carries `md:hidden` on the inner wrapper, so at `md` and above the buttons
are `display: none` and already unreachable. **Only viewports below `md` are trapped
today.** The fix is still correct — it simply matters on mobile, not desktop.

### Carousel: only the centre card is interactive

`inert={pos !== 0}` makes every neighbour non-interactive, not just the fully transparent
`|pos| = 2` pair. Consequences, all intended:

- **`pointerEvents: Math.abs(pos) <= 1 ? 'auto' : 'none'` is removed** from
  `Projects.tsx:247`. `inert` already blocks pointer events, and keeping both leaves two
  mechanisms disagreeing about which cards are live.
- **The card's `onClick` is removed.** Click-to-centre was never keyboard-accessible, and
  removing it deletes the non-interactive-element problem rather than patching it with
  `role="button"` + `tabIndex` + a key handler, which would add three focusable cards to
  the tab order, each wrapping its own links.
- Navigation remains via prev/next and the dot buttons, which are already real `<button>`s
  with `aria-label`s.

This is a deliberate mouse-UX trade: clicking a visible neighbour to centre it stops
working, in exchange for a coherent keyboard model. Resulting tab order in carousel view:
Filter → view toggle → prev → centre card links → next → dots.

## 3. Interactive semantics

Four `onClick` handlers currently sit on non-interactive elements.

| Site | Element | Fix |
|---|---|---|
| `src/components/Projects.tsx:213` | `<span>` category-removal pill | → `<button type="button" aria-label="Remove {cat} filter">` |
| `src/components/Projects.tsx:221` | `<span>` status-removal pill | → `<button type="button" aria-label="Remove {status} filter">` |
| `src/components/Projects.tsx:248` | `<div>` carousel card | `onClick` deleted (see §2) |
| `src/components/Hero.tsx:91` | `<span>` inside the `<h1>` | `onClick` deleted |

The Hero span is the author's name inside the page's only `<h1>`, wired to scroll to the
About section. The navbar already has an About link, so this is a duplicate affordance
whose accessible fix — a nested interactive control inside a heading — is worse than
removing it. The `cursor-pointer` and `hover:opacity-85` classes go with it, since they
would otherwise advertise an interaction that no longer exists.

## 4. Focus management

**Focus ring.** `src/components/Hero.tsx:132` carries a bare `focus:outline-none` on the
"Get in Touch" CTA with no replacement, so the page's conversion control has no visible
focus state. It adopts the pattern already correct at `src/components/Navbar.tsx:100`:
`focus:outline-none focus:ring-2 focus:ring-blue-400`.

These are the only two `focus:outline-none` occurrences in the codebase — one paired with a
replacement ring, one not.

**Escape to close.** The filter dropdown at `src/components/Projects.tsx:53-54` closes only
on `mousedown`. It gains a `keydown` listener closing on `Escape`, registered alongside the
existing outside-click listener and torn down in the same cleanup.

**Focus restoration.** On Escape, focus returns to the Filter trigger button via a ref.
Closing a dropdown without restoring focus strands the user at document start — a fix that
creates a different keyboard defect is not a fix.

## 5. ARIA pairing

`aria-expanded` exists at `src/components/Navbar.tsx:102` and
`src/components/Connect.tsx:214`; `aria-controls` exists nowhere. Both toggles gain
`aria-controls` referencing a stable `id` added to the region they govern.

These attributes become *truthful* only because of §2. `aria-expanded="false"` over a
region whose contents are still tabbable is worse than no attribute — it tells assistive
technology the content is collapsed while the user's next Tab press lands inside it.

## 6. Testing

**Runner:** existing Vitest. The new component tests select jsdom per file via a
`@vitest-environment jsdom` docblock, so the 48 existing node tests keep their current
environment and speed.

**New devDependencies:** `jsdom`, `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`.

**Shared setup.** Rendering these components requires stubs, established by reading their
render paths:

- `Projects` and `Connect` call `usePrefersReducedMotion` → `window.matchMedia`
- `Navbar` calls `useLocation`/`useNavigate` → needs a `MemoryRouter` wrapper
- `Connect` calls `useGitHubProfile` → needs `fetch` stubbed

**Scope:** tests cover `Navbar` and `Projects` only. `Connect` needs the most stubbing for
the least return; its `inert` change is identical in shape to Navbar's and is covered by
the manual pass.

### What the tests assert

- `inert` is present on each wrapper when collapsed and absent when open
- The filter pills render as `<button>` with the expected `aria-label`
- Escape closes the dropdown, and focus returns to the trigger
- `aria-controls` resolves to an element that exists in the document
- Non-centre carousel cards carry `inert`; the centre card does not

### What the tests explicitly do NOT assert

**Actual focusability.** jsdom does not implement `inert` semantics — it will happily
report a descendant of an inert subtree as focusable. A test asserting "no tabbable
descendants when collapsed" would therefore pass or fail on jsdom's approximation of the
focus algorithm rather than on real browser behaviour, which is false confidence of exactly
the kind this project has been finding all session.

These tests verify **our output** — that the right attributes are on the right elements in
the right states. Whether the browser then honours `inert` is verified by the manual pass
in §7, and only there.

## 7. Done criteria

1. `npm run lint` exits 0
2. `npm test` passes: 48 existing node tests plus the new jsdom tests
3. `npx tsc -b --noEmit` clean
4. `npm run build` succeeds
5. `grep -rn "pointerEvents" src/components/Projects.tsx` returns nothing
6. `grep -rn "focus:outline-none" src/` returns exactly two hits, both paired with a
   `focus:ring` or `focus-visible:ring` utility on the same element
7. **Manual keyboard pass — the only real proof.** With the keyboard alone:
   - At 375px with the mobile menu closed, Tab from the hamburger button reaches the first
     `<main>` control directly, never a hidden nav item
   - With the contact details panel collapsed, Tab skips all four links inside it
   - In carousel view, Tab reaches exactly the centre card's links: Filter → view toggle →
     prev → centre links → next → dots
   - The Hero "Get in Touch" CTA shows a visible focus ring
   - Opening the filter dropdown and pressing Escape closes it and returns focus to the
     Filter button
   - Both filter-removal pills are reachable by Tab and activate on Enter and on Space

## 8. Risks

| Risk | Mitigation |
|---|---|
| `inert` silently does nothing because the boolean form is wrong for the installed React | Verified: `@types/react` declares `inert?: boolean` and React is 19.2.3. Criterion 7 is the behavioural check. |
| jsdom's incomplete focus emulation gives false confidence | Addressed by scope: §6 states exactly what the tests do and do not assert. Focusability is checked only by criterion 7. |
| The `matchMedia` stub is written for a gap that does not exist | The plan verifies the gap empirically before writing the stub, rather than assuming it. |
| Removing click-to-centre is an unwanted UX regression | Deliberate and recorded here. It is one commit and independently revertible; prev/next/dots cover the same navigation. |
| Escape handler conflicts with the existing outside-click listener | Both are registered in the same effect with a shared cleanup, so they cannot diverge. |
| `aria-controls` points at an id that does not exist | Asserted by a test (§6) and by criterion 7. |
