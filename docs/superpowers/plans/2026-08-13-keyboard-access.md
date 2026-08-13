# Keyboard Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop three containers from keeping their contents in the keyboard tab order while invisible, and fix the focus and semantics problems around them.

**Architecture:** Each collapsing wrapper gets a React 19 boolean `inert` prop, which removes its subtree from both the tab order and the accessibility tree without touching layout, so the existing collapse animations are unaffected. Non-interactive elements carrying `onClick` become real buttons or lose the handler. Component tests run under jsdom per-file and assert attribute output, not focusability.

**Tech Stack:** React 19.2.3, TypeScript 5.9 (`strict`), Vite 7, Vitest, Tailwind CSS 3.4, jsdom + Testing Library (added by Task 1).

**Spec:** `docs/superpowers/specs/2026-08-13-keyboard-access-design.md`

## Global Constraints

- **Branch:** all work happens on `fix/keyboard-access`. Do not commit to `main`.
- **`inert` must be passed as a boolean** (`inert={!isOpen}`), never as a string. Verified: `react-dom-client.production.js:13124` groups `case "inert"` with `disabled`/`hidden`, whose shared body is `value ? setAttribute(key, "") : removeAttribute(key)`. The string form would make the container permanently inert, because `inert="false"` is still true in HTML.
- **Do not assume jsdom's capabilities.** Task 1 verifies empirically what jsdom provides before any stub is written. No other task may add a stub for something Task 1 did not prove missing.
- **Tests assert attribute output, never focusability.** jsdom does not implement `inert` semantics and will report descendants of an inert subtree as focusable. Any test of the form "expect X not to be focusable" is forbidden — it would pass or fail on jsdom's approximation rather than real browser behaviour.
- **Existing node tests must keep `environment: 'node'`.** New component tests select jsdom per file via a `// @vitest-environment jsdom` docblock. Do not change the global `test.environment` in `vite.config.ts`.
- **No `any`, no `@ts-ignore`, no `eslint-disable`.** The repo currently has zero of all three.
- **Commit trailer:** every commit message ends with exactly these two lines:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
  ```

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/test/setup.ts` | Shared jsdom setup — jest-dom matchers, plus a `matchMedia` stub **only if Task 1 proves it missing** |
| `src/components/Navbar.test.tsx` | `inert` state and `aria-controls` wiring |
| `src/components/Projects.test.tsx` | Carousel `inert`, filter pill buttons, Escape + focus restoration |

**Modified:**

| Path | Change |
|---|---|
| `vite.config.ts` | Add `test.setupFiles` |
| `package.json` | 4 new devDependencies |
| `src/components/Navbar.tsx` | `inert` on the mobile menu, `id` + `aria-controls` |
| `src/components/Connect.tsx` | `inert` on the details panel, `id` + `aria-controls` |
| `src/components/Projects.tsx` | Carousel `inert`; remove `pointerEvents`, card `onClick`, `cursor-pointer`; pills → buttons; Escape + focus restoration |
| `src/components/Hero.tsx` | Focus ring on the CTA; remove the `<h1>` span's `onClick` |

---

### Task 1: jsdom setup, with the premises verified first

The spec forbids assuming what jsdom provides. This task establishes it by observation.

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/test/setup.ts`, `src/test/environment.probe.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a working jsdom environment for `*.test.tsx` files that carry the docblock, and `src/test/setup.ts` loaded via `test.setupFiles`.

- [ ] **Step 1: Install the dependencies**

```bash
npm install -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Write the probe**

Create `src/test/environment.probe.test.tsx`. This file is temporary — it exists to answer two questions with evidence, and Step 6 deletes it.

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('jsdom environment probe', () => {
  it('reports which environment this file runs in', () => {
    // If the docblock works, `window` exists here.
    expect(typeof window).toBe('object');
  });

  it('reports whether jsdom implements window.matchMedia', () => {
    // NOT an assertion about what jsdom SHOULD do — this records what it DOES.
    // The result decides whether src/test/setup.ts needs a matchMedia stub.
    console.log('PROBE typeof window.matchMedia =', typeof window.matchMedia);
    expect(['function', 'undefined']).toContain(typeof window.matchMedia);
  });
});
```

No `eslint-disable` is needed for the `console.log`: this project's ESLint config extends
`js.configs.recommended`, which does not enable `no-console`. Verified by linting a probe
file containing a bare `console.log` — ESLint reported nothing. The Global Constraints ban
on `eslint-disable` therefore holds with no exception.

- [ ] **Step 3: Run the probe and RECORD the output**

Run: `npm test -- src/test/environment.probe.test.tsx`

Read the `PROBE typeof window.matchMedia =` line in the output. Record the literal value in your report. Both outcomes are valid; the point is to know rather than guess.

- [ ] **Step 4: Create the setup file, matching what Step 3 actually found**

Create `src/test/setup.ts`.

**If Step 3 printed `undefined`** — jsdom does not implement it, so the stub is required:

```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement window.matchMedia (verified by probe, Task 1 Step 3).
// usePrefersReducedMotion calls it during render, so without this every component
// test that renders Projects, Connect or Hero would throw.
//
// The `typeof window` guard is REQUIRED, not defensive: setupFiles run in every
// test file's own context, including the plain 'node' files that are this
// project's default, where `window` does not exist at all. Without it, all six
// existing node test files fail with `ReferenceError: window is not defined`.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
```

**If Step 3 printed `function`** — jsdom provides it, so the stub is unnecessary and must not be written:

```ts
import '@testing-library/jest-dom/vitest';

// No matchMedia stub: the Task 1 probe confirmed jsdom implements it.
```

State in your report which branch you took and why.

- [ ] **Step 5: Wire the setup file into the Vitest config**

Replace the `test` block in `vite.config.ts` with:

```ts
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
```

`environment` stays `'node'`. Only files carrying the `// @vitest-environment jsdom` docblock opt into jsdom.

- [ ] **Step 6: Confirm the existing suite is unaffected, then delete the probe**

Run: `npm test`
Expected: 48 tests still passing, plus the 2 probe tests = 50.

This is the step that catches a mis-scoped setup file. `setupFiles` applies to EVERY
test file, not only the jsdom ones, so an unguarded `window` reference here fails all six
node-environment files at once. If you see `ReferenceError: window is not defined`, the
guard in Step 4 is missing or wrong.

Note on reading the probe output: Vitest v4's default reporter suppresses `console.log`
from passing tests. Run `npm test -- --reporter=verbose` to see the PROBE line.

Then delete the probe file:

```bash
rm src/test/environment.probe.test.tsx
```

Run: `npm test`
Expected: 48 passing, back to the original count.

- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all pass.

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts
git commit -m "$(cat <<'EOF'
test: add jsdom environment for component tests

Verified rather than assumed what jsdom provides: a temporary probe
recorded the actual value of typeof window.matchMedia before any stub was
written, and the setup file matches what was observed.

environment stays 'node' globally; component tests opt into jsdom per file
via a docblock, so the existing 48 node tests keep their speed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 2: `inert` on the mobile menu, plus `aria-controls`

**Files:**
- Modify: `src/components/Navbar.tsx:100-102`, `:117-119`
- Create: `src/components/Navbar.test.tsx`

**Interfaces:**
- Consumes: the jsdom environment from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `src/components/Navbar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Navbar from './Navbar';

/**
 * These tests assert ATTRIBUTE OUTPUT, not focusability. jsdom does not implement
 * inert semantics and would report descendants of an inert subtree as focusable, so
 * a "not focusable" assertion here would be testing jsdom, not the browser.
 * Real focusability is covered by the manual keyboard pass in the plan's final task.
 */
const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );

describe('Navbar mobile menu', () => {
  it('marks the menu inert while it is collapsed', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    const menuId = toggle.getAttribute('aria-controls');
    expect(menuId).toBeTruthy();

    const menu = document.getElementById(menuId as string);
    expect(menu).not.toBeNull();
    expect(menu).toHaveAttribute('inert');
  });

  it('removes inert once the menu is open', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    await user.click(toggle);

    const menu = document.getElementById(toggle.getAttribute('aria-controls') as string);
    expect(menu).not.toHaveAttribute('inert');
  });

  it('keeps aria-expanded in step with the menu state', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('points aria-controls at an element that exists', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(document.getElementById(toggle.getAttribute('aria-controls') as string)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/components/Navbar.test.tsx`
Expected: FAIL — `aria-controls` is absent, so `menuId` is null.

- [ ] **Step 3: Add `aria-controls` to the toggle button**

In `src/components/Navbar.tsx`, replace:

```tsx
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
```

with:

```tsx
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
```

- [ ] **Step 4: Add the `id` and `inert` to the menu wrapper**

Replace:

```tsx
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}>
```

with:

```tsx
        <div
          id="mobile-menu"
          inert={!isMenuOpen}
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
```

`inert` must be the boolean expression `!isMenuOpen`, never a string.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 4 new tests, 52 total.

- [ ] **Step 6: Verify and commit**

Run: `npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all pass.

```bash
git add src/components/Navbar.tsx src/components/Navbar.test.tsx
git commit -m "$(cat <<'EOF'
fix: make the collapsed mobile menu unreachable by keyboard

The menu was hidden with max-h-0 + opacity-0, neither of which removes
elements from the tab order. Below the md breakpoint its five nav buttons
were fully tabbable while invisible, so keyboard and switch users tabbed
into dead air with the focus ring rendered at zero opacity. At md and
above the inner md:hidden already made them display:none, so this was a
mobile-only defect.

inert also removes the subtree from the accessibility tree, which makes
the existing aria-expanded honest instead of describing a region whose
contents were still reachable. aria-controls now names that region.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 3: `inert` on the contact details panel, plus `aria-controls`

No test file. Per the spec, `Connect` needs the most stubbing for the least return — it calls `useGitHubProfile` (network) on top of `usePrefersReducedMotion` and a `requestAnimationFrame` loop. Its change is identical in shape to Task 2's and is covered by the manual pass.

**Files:**
- Modify: `src/components/Connect.tsx:214`, `:221-227`

**Interfaces:**
- Consumes: nothing. Produces: nothing.

- [ ] **Step 1: Add `aria-controls` to the toggle button**

In `src/components/Connect.tsx`, replace:

```tsx
            onClick={() => setShowAllDetails((prev) => !prev)}
            aria-expanded={showAllDetails}
```

with:

```tsx
            onClick={() => setShowAllDetails((prev) => !prev)}
            aria-expanded={showAllDetails}
            aria-controls="contact-details-panel"
```

- [ ] **Step 2: Add the `id` and `inert` to the panel wrapper**

Replace:

```tsx
        <div
          className={`mb-10 overflow-hidden transition-all duration-500 ease-in-out ${
            showAllDetails
              ? 'max-h-[1000px] opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
```

with:

```tsx
        <div
          id="contact-details-panel"
          inert={!showAllDetails}
          className={`mb-10 overflow-hidden transition-all duration-500 ease-in-out ${
            showAllDetails
              ? 'max-h-[1000px] opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
```

Keep `pointer-events-none` in the collapsed class list. Unlike the carousel case in Task 4, it is part of a Tailwind class string rather than a competing inline style, and removing it would be an unrelated edit to a working animation.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, 52 tests passing, no type errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Connect.tsx
git commit -m "$(cat <<'EOF'
fix: make the collapsed contact panel unreachable by keyboard

Four contact links stayed in the tab order while the panel was collapsed.
pointer-events-none blocked the mouse but does nothing for the keyboard,
so a keyboard user tabbed through four invisible links that duplicate the
four already visible above.

No component test: Connect additionally calls useGitHubProfile and runs a
requestAnimationFrame loop, so testing it would need network and timer
stubs for a change identical in shape to the Navbar one. Covered by the
manual keyboard pass.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 4: Only the centre carousel card is interactive

**Files:**
- Modify: `src/components/Projects.tsx:246-248`
- Create: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: the jsdom environment from Task 1.
- Produces: `src/components/Projects.test.tsx`, which Tasks 5 and 7 extend.

- [ ] **Step 1: Write the failing test**

Create `src/components/Projects.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Projects from './Projects';

/**
 * Asserts ATTRIBUTE OUTPUT only. jsdom does not implement inert semantics, so a
 * "not focusable" assertion would test jsdom rather than the browser. Real
 * focusability is covered by the manual keyboard pass in the plan's final task.
 */
describe('Projects carousel', () => {
  it('marks every non-centre card inert and leaves the centre card interactive', () => {
    render(<Projects />);
    const cards = screen.getAllByTestId('carousel-card');

    // The carousel renders slots -2..2, so more than one card is mounted.
    expect(cards.length).toBeGreaterThan(1);

    const interactive = cards.filter((card) => !card.hasAttribute('inert'));
    expect(interactive).toHaveLength(1);
  });

  it('gives no card a click handler that a keyboard user cannot reach', () => {
    render(<Projects />);
    for (const card of screen.getAllByTestId('carousel-card')) {
      expect(card).not.toHaveAttribute('role', 'button');
      expect(card).not.toHaveAttribute('tabindex');
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- src/components/Projects.test.tsx`
Expected: FAIL — `getAllByTestId('carousel-card')` finds nothing, because the test id does not exist yet.

- [ ] **Step 3: Update the card wrapper**

In `src/components/Projects.tsx`, replace these three lines:

```tsx
                        className={`w-[280px] sm:w-[360px] transition-all duration-700 ease-out ${filteredProjects.length === 1 ? '' : 'absolute cursor-pointer'}`}
                        style={{ ...positionStyles[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity', pointerEvents: Math.abs(pos) <= 1 ? 'auto' : 'none' }}
                        onClick={() => { if (!isCenter) setCurrentIndex(idx); }}
```

with:

```tsx
                        data-testid="carousel-card"
                        inert={!isCenter}
                        className={`w-[280px] sm:w-[360px] transition-all duration-700 ease-out ${filteredProjects.length === 1 ? '' : 'absolute'}`}
                        style={{ ...positionStyles[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
```

Four changes on purpose:
1. `inert={!isCenter}` — only the centre card is interactive.
2. `pointerEvents` removed — `inert` already blocks pointer events, and keeping both leaves two mechanisms disagreeing about which cards are live.
3. `onClick` removed — click-to-centre was never keyboard-accessible. Navigation stays on the prev/next/dot buttons, which are already real `<button>`s with `aria-label`s.
4. `cursor-pointer` removed from the non-single-card branch — with the handler gone it would advertise an interaction that no longer exists.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS — 2 new tests, 54 total.

- [ ] **Step 5: Confirm nothing else still references the removed behaviour**

Run: `grep -n "pointerEvents\|cursor-pointer" src/components/Projects.tsx`
Expected: no output.

- [ ] **Step 6: Verify and commit**

Run: `npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all pass.

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "$(cat <<'EOF'
fix: make only the centre carousel card interactive

Cards at slots -2 and 2 render at opacity 0, and pointerEvents: none
blocked the mouse but not the keyboard, so their links stayed in the tab
order while completely invisible - inside an overflow-x-hidden container
that would not even scroll to reveal the focus ring.

inert now covers every non-centre card. That makes the pointerEvents rule
redundant, so it is removed rather than left to disagree about which cards
are live. The card's onClick goes too: click-to-centre was never
keyboard-accessible, and deleting it removes the non-interactive-element
problem instead of patching it with role/tabIndex/key handlers that would
add three more focusable cards, each wrapping its own links. cursor-pointer
goes with it.

Deliberate trade: clicking a visible neighbour to centre it no longer
works. prev/next/dots cover the same navigation and are already labelled
buttons.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 5: Filter removal pills become real buttons

**Files:**
- Modify: `src/components/Projects.tsx:213`, `:221`
- Modify: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: `src/components/Projects.test.tsx` from Task 4.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the failing tests**

Append this `describe` block to `src/components/Projects.test.tsx`, after the existing one:

```tsx
describe('active filter pills', () => {
  it('renders each active filter as a button with a descriptive label', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    // Open the filter dropdown and tick the first category.
    await user.click(screen.getByRole('button', { name: /^filter/i }));
    const firstCategory = screen.getAllByRole('checkbox')[0];
    await user.click(firstCategory);

    // The corresponding removal pill must be a button, not a span.
    const removal = screen.getByRole('button', { name: /^remove .+ filter$/i });
    expect(removal.tagName).toBe('BUTTON');
    expect(removal).toHaveAttribute('type', 'button');
  });

  it('clears the filter when its removal button is activated', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    await user.click(screen.getByRole('button', { name: /^filter/i }));
    await user.click(screen.getAllByRole('checkbox')[0]);

    const removal = screen.getByRole('button', { name: /^remove .+ filter$/i });
    await user.click(removal);

    expect(screen.queryByRole('button', { name: /^remove .+ filter$/i })).toBeNull();
  });
});
```

Add `userEvent` to the file's imports if Task 4 did not already:

```tsx
import userEvent from '@testing-library/user-event';
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/components/Projects.test.tsx`
Expected: FAIL — no element has an accessible name matching `remove … filter`, because the pills are `<span>`s.

- [ ] **Step 3: Convert the category pill**

Replace:

```tsx
                <span key={cat} onClick={() => toggleCategory(cat)} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150">
```

with:

```tsx
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-label={`Remove ${cat} filter`}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150"
                >
```

and change its closing `</span>` (the one on the line before the `))}` that ends this map) to `</button>`.

- [ ] **Step 4: Convert the status pill**

Replace:

```tsx
                <span key={st} onClick={() => toggleStatus(st)} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150">
```

with:

```tsx
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatus(st)}
                  aria-label={`Remove ${STATUS_LABELS[st]} filter`}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150"
                >
```

and change its closing `</span>` to `</button>`.

`cursor-pointer` stays on both — unlike the carousel card, these remain clickable.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 2 new tests, 56 total.

- [ ] **Step 6: Verify and commit**

Run: `npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all pass.

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "$(cat <<'EOF'
fix: make filter removal pills real buttons

They were spans carrying onClick, so they were unreachable by keyboard and
announced as plain text - the removal affordance was invisible to screen
reader users despite the visible cross icon.

Each is now a button with an explicit aria-label naming which filter it
clears, since the visible text is only the filter's own name.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 6: Hero focus ring, and remove the heading's click handler

**Files:**
- Modify: `src/components/Hero.tsx:91-96`, `:132`

**Interfaces:**
- Consumes: nothing. Produces: nothing.

No test. Both changes are static class and attribute edits with no state, and the focus ring's actual visibility is a rendering question jsdom cannot answer.

- [ ] **Step 1: Give the CTA a visible focus ring**

Replace:

```tsx
              className="group px-8 py-3 bg-gray-900 text-gray-300 font-bold uppercase tracking-wider text-sm transition-all shadow-tactile-dark border-2 border-gray-600 focus:outline-none"
```

with:

```tsx
              className="group px-8 py-3 bg-gray-900 text-gray-300 font-bold uppercase tracking-wider text-sm transition-all shadow-tactile-dark border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
```

This is the pattern already used correctly at `src/components/Navbar.tsx:100`. The bare `focus:outline-none` removed the browser's default ring and replaced it with nothing, on the page's primary conversion control.

- [ ] **Step 2: Remove the click handler from the heading span**

Replace:

```tsx
              <span
                onClick={() => handleSectionClick('about')}
                className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-500 transition-opacity cursor-pointer hover:opacity-85"
              >
                Supakorn
              </span>
```

with:

```tsx
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-500">
                Supakorn
              </span>
```

`cursor-pointer`, `hover:opacity-85` and `transition-opacity` go with the handler — they advertise an interaction that no longer exists.

This is a `<span>` with `onClick` inside the page's only `<h1>`. Making it accessible would mean a nested interactive control inside a heading; the navbar already has an About link, so the affordance is a duplicate and removing it is the better fix.

- [ ] **Step 3: Confirm `handleSectionClick` is still used**

Run: `grep -n "handleSectionClick" src/components/Hero.tsx`
Expected: at least the definition plus the two CTA buttons still call it. `noUnusedLocals` would fail the build if it were now unused — confirm rather than assume.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, 56 tests passing, no type errors, build succeeds.

```bash
git add src/components/Hero.tsx
git commit -m "$(cat <<'EOF'
fix: restore the focus ring on the hero CTA, drop the heading's onClick

The "Get in Touch" button carried a bare focus:outline-none with no
replacement, so the page's primary conversion control had no visible focus
state for keyboard users. It now uses the same focus:ring pattern already
correct on the navbar toggle.

The author's name inside the only h1 also carried onClick to scroll to
About. Making that accessible would mean a nested interactive control
inside a heading, and the navbar already has an About link, so the
duplicate affordance is removed along with the classes advertising it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 7: Escape closes the filter dropdown and restores focus

**Files:**
- Modify: `src/components/Projects.tsx:32`, `:47-55`, `:134`
- Modify: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: `src/components/Projects.test.tsx` from Tasks 4 and 5.
- Produces: nothing.

- [ ] **Step 1: Add the failing tests**

Append to `src/components/Projects.test.tsx`:

```tsx
describe('filter dropdown keyboard handling', () => {
  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const trigger = screen.getByRole('button', { name: /^filter/i });
    await user.click(trigger);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);

    await user.keyboard('{Escape}');

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(trigger).toHaveFocus();
  });

  it('does not steal focus when Escape is pressed with the dropdown closed', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const viewToggle = screen.getByRole('button', { name: /toggle view/i });
    viewToggle.focus();
    expect(viewToggle).toHaveFocus();

    await user.keyboard('{Escape}');

    // Focus must stay where it was — the handler must be a no-op when closed.
    expect(viewToggle).toHaveFocus();
  });
});
```

The second test is the important one. It fails if the Escape handler reads a stale `isFilterOpen` or restores focus unconditionally.

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/components/Projects.test.tsx`
Expected: FAIL — Escape does nothing, so the checkboxes remain and the trigger does not receive focus.

- [ ] **Step 3: Add a ref for the trigger button**

In `src/components/Projects.tsx`, immediately after:

```tsx
  const filterDropdownRef = useRef<HTMLDivElement>(null);
```

add:

```tsx
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
```

A separate ref is required. `filterDropdownRef` points at the wrapping `<div>`, and calling `.focus()` on a `<div>` with no `tabindex` is a silent no-op — the dropdown would close and focus would still be lost, with nothing to signal the failure.

- [ ] **Step 4: Attach the ref to the trigger button**

Replace:

```tsx
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
```

with:

```tsx
            <button
              ref={filterTriggerRef}
              onClick={() => setIsFilterOpen((v) => !v)}
```

- [ ] **Step 5: Add the Escape effect**

Immediately after the existing outside-click effect (the one ending `}, []);`), add a new effect:

```tsx
  // Close the filter dropdown on Escape and return focus to its trigger.
  // This is a SEPARATE effect with [isFilterOpen] in its deps: the outside-click
  // effect above declares [], so a handler registered there would close over
  // isFilterOpen === false forever and steal focus on every Escape keypress.
  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        filterTriggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFilterOpen]);
```

Do NOT modify the existing outside-click effect. Leave its `[]` dependency array alone.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS — 2 new tests, 58 total.

- [ ] **Step 7: Verify and commit**

Run: `npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all pass. Watch for `react-hooks/exhaustive-deps` — the new effect's deps should be exactly `[isFilterOpen]`.

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "$(cat <<'EOF'
feat: close the filter dropdown on Escape and restore focus

The dropdown closed only on mousedown, so a keyboard user had to tab
through eleven category checkboxes and three status checkboxes to escape
it, ending up stranded below the trigger.

Escape lives in its own effect with [isFilterOpen] deps rather than
joining the existing outside-click effect, which declares []. A handler
registered there would close over isFilterOpen === false permanently and
yank focus to the Filter button on every Escape keypress anywhere on the
page - a test covers exactly that case.

Focus restoration uses a new ref on the trigger button. The existing
filterDropdownRef points at the wrapping div, and .focus() on a div with
no tabindex is a silent no-op.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 8: Final verification

No code changes. Confirms every done criterion from spec §7.

**Files:** none modified.

- [ ] **Step 1: Run the automated criteria**

```bash
rm -rf dist
npm run lint        && echo "1. lint exit 0 PASS"
npm test
npx tsc -b --noEmit && echo "3. typecheck PASS"
npm run build       && echo "4. build PASS"
```

Expected: lint silent with exit 0; **58 tests passing**; no type errors; build succeeds.

- [ ] **Step 2: Run the grep criteria**

```bash
echo "--- 5. pointerEvents gone from Projects ---"
grep -n "pointerEvents" src/components/Projects.tsx | wc -l
echo "--- 6. every focus:outline-none is paired with a ring ---"
grep -rn "focus:outline-none" src/
echo "--- inert sites (expect 3) ---"
grep -rn "inert=" src/components/
echo "--- aria-controls sites (expect 2) ---"
grep -rn "aria-controls" src/components/
echo "--- no onClick left on a span or div ---"
grep -rnE "<(span|div|li)[^>]*onClick" src/components/ | wc -l
```

Expected: criterion 5 prints `0`. Criterion 6 prints exactly two lines, and **each must also contain `focus:ring`** — read them, do not just count. Three `inert=` sites, two `aria-controls` sites, and `0` non-interactive click handlers.

- [ ] **Step 3: The manual keyboard pass — the only real proof**

Run `npm run dev` and open the printed URL. jsdom asserted our attributes; only a browser exercises the focus algorithm. Using the keyboard alone, with no mouse:

1. Narrow the window to 375px. With the mobile menu **closed**, Tab from the hamburger button — the next stop must be a control in the page body, never a hidden nav item.
2. Open the menu with Enter, Tab through it, close it, and confirm Tab again skips its contents.
3. Scroll to Connect. With the details panel **collapsed**, Tab past the toggle — the four links inside must be skipped.
4. Expand it and confirm those four links are now reachable.
5. In Projects carousel view, Tab through: Filter → view toggle → prev → **only the centre card's links** → next → dots. No focus ring may land on a rotated or transparent card.
6. Tab to the hero "Get in Touch" button — a visible ring must appear.
7. Open the filter dropdown, press Escape: it closes and focus returns to the Filter button.
8. Tick a filter, then Tab to its removal pill and activate it with **both** Enter and Space.

Stop the dev server afterwards.

- [ ] **Step 4: Report**

Summarise: lint/test/typecheck/build results, each grep result, and the outcome of every numbered manual check. State explicitly that `Connect`'s `inert` change has no automated coverage and was verified only by manual check 3, and that no test asserts focusability anywhere — jsdom cannot, so checks 1-8 are the sole evidence that `inert` actually works.

---

## Notes for the implementer

**Anchor the Filter trigger query.** Use `getByRole('button', { name: /^filter/i })`, not
`/filter/i`. `Projects.tsx:199` renders a **"Clear all filters"** button whenever any filter
is active, and an unanchored `/filter/i` matches both — `getByRole` throws on multiple
matches. The anchored form matches "Filter" and "Filter 2" (the count badge joins the
accessible name) but never "Clear all filters".

**Never assert focusability in a test.** jsdom does not implement `inert`; it will report a descendant of an inert subtree as focusable. A passing "not focusable" test would be false confidence, which is worse than no test. Assert attributes; leave focusability to the manual pass.

**`inert` must be a boolean expression.** `inert={!isOpen}`, never `inert="true"` or `inert={String(x)}`. `inert` is an HTML boolean attribute, so any string — including `"false"` — makes the element inert.

**Do not touch** the `requestAnimationFrame` cursor-glow loops in `Hero.tsx`, `ProjectCard.tsx` and `Connect.tsx` (Slice C), or anything in Slice B3's scope: colour contrast, touch-target sizing, `aria-pressed` on the view toggle, live regions, section landmark labels, heading nesting, list semantics, or alt-text quality.

**Do not change the global `test.environment`.** It stays `'node'`. Component tests opt into jsdom per file with a `// @vitest-environment jsdom` docblock on line 1.
