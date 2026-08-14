# Slice B3 — Remaining Accessibility Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the last open accessibility findings — colour contrast, touch target size, missing ARIA state, missing live regions, and markup semantics — so the audit's accessibility dimension has no open Critical, High, or Medium items.

**Architecture:** Eight independent tasks against an existing React 19 SPA. Seven are markup and class-name edits inside `src/components/`; one adds two `sr-only` live regions driven by state that already exists in `Projects.tsx`. No new modules, no new dependencies, no changes to `src/lib/`.

**Tech Stack:** React 19.2, TypeScript 5.9 (`strict`, `noUnusedLocals`), Tailwind CSS 3.4, Vitest 4.1, @testing-library/react, jsdom (per-file opt-in).

**Spec:** `docs/superpowers/specs/2026-08-14-remaining-a11y-design.md`
**Branch:** `fix/a11y-polish` (already exists, currently `9b829c3`, docs-only commits so far)
**Merge base:** `a082d04` on `main` (after Slice C1 / PR #8)

## Global Constraints

- **Target is WCAG 2.2 Level AA, not AAA.** Do not resize the carousel arrows (26×78) or the mobile nav rows (~36px tall). They pass AA and are explicitly out of scope.
- **Do not modify `src/lib/carouselPositionStyles.ts` or its test.** Slice C1 already shipped the carousel-neighbour contrast fix (`opacity: 0.8`, no `filter`, 4.86:1). Spec item 1.3 is struck.
- **Approved colour values only.** `text-gray-500` → `text-gray-400`. Inactive dot `bg-gray-600` → `bg-gray-500`, its hover → `gray-400`. No other palette changes.
- **No new visible UI.** Both live regions are `sr-only`. This slice adds no visible chrome; the only visual changes are the colour substitutions and the dot gap widening from 8px to 12px.
- **Live regions are permanently mounted.** Render them unconditionally with only their text content changing. A region inserted into the DOM at the same moment its text appears is not reliably announced.
- **jsdom test files** need `// @vitest-environment jsdom` as line 1 (a docblock, before imports) and an explicit `afterEach(cleanup)`. This project does not set vitest's `test.globals: true`, so @testing-library/react does not auto-register cleanup, and renders otherwise accumulate in the shared per-file document.
- **Type-only imports use `import type { ... }`.** `noUnusedLocals` is on: an unused import fails the build, not just the lint.
- **Commit after every task.** Run `npm test` and `npm run lint` before each commit.

## Known limits of this plan's tests

Stated up front so no reviewer reads their absence as an oversight. The spec's "NOT covered by any test" section is the source.

- **Contrast (Tasks 1 and 2) is not verified by any test.** jsdom does not resolve Tailwind class names to colours, does not composite `opacity`, and does not apply `filter`. The ratios were computed from first principles in the spec's "Verified premises" table before the values were chosen; what remains unverified is only that the browser renders them. That is Task 8's manual pass.
- **Target size (Task 2) is not verified by any test.** jsdom has no layout engine; `getBoundingClientRect` returns zeros.
- Do **not** paper over either gap with a test that asserts a class-name string is present. That tests the diff against itself.

## File Structure

**Modified — components:**

| File | Tasks | Change |
| --- | --- | --- |
| `src/components/Footer.tsx` | 1 | one colour class |
| `src/components/Hero.tsx` | 1, 5 | five colour classes; section label + heading id |
| `src/components/ProjectCard.tsx` | 1, 6, 7 | one colour class; tags → list; `alt=""` |
| `src/components/Projects.tsx` | 1, 2, 3, 4, 5 | colours, brackets, dots, toggle, live regions, label |
| `src/components/Skills.tsx` | 5, 6 | section label + heading id; chips → list |
| `src/components/About.tsx` | 5, 7 | section label + heading id; two heading fixes |
| `src/components/Connect.tsx` | 5, 7 | section label + heading id; one heading fix |
| `src/components/Navbar.tsx` | 5 | `aria-label="Main"` |

**Modified — test infrastructure:**

- `src/test/setup.ts` (Task 5) — add an `IntersectionObserver` stub beside the existing `matchMedia` stub.

**Modified — tests:**

- `src/components/Projects.test.tsx` (Tasks 1, 2, 3, 4)

**Created — tests:**

- `src/components/landmarks.test.tsx` (Task 5)
- `src/components/Skills.test.tsx` (Task 6)
- `src/components/ProjectCard.test.tsx` (Tasks 6, 7)
- `src/components/About.test.tsx` (Task 7)

**Created — docs:**

- `docs/superpowers/manual-checks/2026-08-14-b3-a11y.md` (Task 8)

**Not touched:** `src/lib/carouselPositionStyles.ts`, `src/lib/carouselPositionStyles.test.ts`, `src/hooks/**`, `vite.config.ts`, `tailwind.config.js`.

Test count starts at **76** and ends at **93**.

---

### Task 1: Text contrast and decorative brackets

Spec items 1.1 and 1.4. `text-gray-500` measures 4.16:1 on `gray-950` and 3.67:1 on `gray-900` — both fail SC 1.4.3's 4.5:1 for text. `text-gray-400` measures 7.93:1 and 6.99:1, clearing both grounds with one value. Separately, the two decorative bracket `<span>`s inside the Projects `<h2>` leak into its accessible name.

**Files:**
- Modify: `src/components/Footer.tsx:14`
- Modify: `src/components/Hero.tsx:49`, `:71`, `:72`, `:73`, `:138`
- Modify: `src/components/ProjectCard.tsx:29`
- Modify: `src/components/Projects.tsx:122`, `:124`, `:192`, `:214`
- Test: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the Projects `<h2>` has accessible name exactly `Featured Projects`. Task 5's landmark test depends on this — before this task the name is `[ Featured Projects ]`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/Projects.test.tsx`:

```tsx
describe('decorative brackets', () => {
  it('keeps the bracket glyphs out of the projects heading accessible name', () => {
    render(<Projects />);

    // getByRole's string `name` matcher is an exact, whitespace-normalised match.
    // Without aria-hidden on the two decorative spans the computed name is
    // "[ Featured Projects ]" and this query finds nothing.
    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/components/Projects.test.tsx -t 'bracket glyphs'`
Expected: FAIL — `Unable to find an accessible element with the role "heading" and name "Featured Projects"`.

- [ ] **Step 3: Add `aria-hidden` to the bracket spans**

`src/components/Projects.tsx:122` and `:124`. Replace:

```tsx
              <span className="text-gray-700 font-light text-2xl">[</span>
              Featured Projects
              <span className="text-gray-700 font-light text-2xl">]</span>
```

with:

```tsx
              <span aria-hidden="true" className="text-gray-700 font-light text-2xl">[</span>
              Featured Projects
              <span aria-hidden="true" className="text-gray-700 font-light text-2xl">]</span>
```

Their `text-gray-700` colour (1.95:1) stays. SC 1.4.3 exempts pure decoration, and `aria-hidden` is what makes them formally decorative.

- [ ] **Step 4: Replace `text-gray-500` at all nine text sites**

In each of the nine lines below, change the substring `text-gray-500` to `text-gray-400`. Change nothing else on those lines.

```bash
# Verify exactly nine sites exist before editing, and zero after.
grep -rn "text-gray-500" src/
```

The nine sites, for cross-checking:

| File | Line | Context |
| --- | --- | --- |
| `src/components/Footer.tsx` | 14 | email paragraph |
| `src/components/Hero.tsx` | 49 | "Hola World" eyebrow |
| `src/components/Hero.tsx` | 71 | `PROGRAM    :` label |
| `src/components/Hero.tsx` | 72 | `YEAR       :` label |
| `src/components/Hero.tsx` | 73 | `LOCATION   :` label |
| `src/components/Hero.tsx` | 138 | `SYS_ACTV` badge (on `gray-900`) |
| `src/components/ProjectCard.tsx` | 29 | "No Image" placeholder |
| `src/components/Projects.tsx` | 192 | category count `(n)` |
| `src/components/Projects.tsx` | 214 | status count `(n)` |

Note `hover:text-gray-500` and `bg-gray-500` do **not** appear anywhere in `src/`; a bare substring replacement of `text-gray-500` is therefore safe. Confirm with the grep above rather than assuming.

- [ ] **Step 5: Verify no site was missed**

Run: `grep -rn "text-gray-500" src/ ; echo "exit=$?"`
Expected: no matches, `exit=1`.

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 77 tests pass, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Footer.tsx src/components/Hero.tsx src/components/ProjectCard.tsx src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "fix(a11y): raise text contrast to 4.5:1 and hide decorative brackets"
```

---

### Task 2: Carousel dot contrast and 24×24 target size

Spec items 1.2 and Group 2. The inactive dot's `bg-gray-600` measures 2.66:1 against `gray-950`, failing SC 1.4.11's 3:1 for non-text UI; `bg-gray-500` measures 4.16:1 and passes. Separately the dot is 12×12 CSS px, failing SC 2.5.8's 24×24 minimum.

The dot `<button>` currently carries both the hit area and the visual appearance, so padding it would change how the dot looks. Split the two: the `<button>` takes the padding, an inner `<span>` takes the size and colour.

**Files:**
- Modify: `src/components/Projects.tsx:317`, `:319-324`
- Test: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: dot buttons keep their existing accessible names (`Go to project 1` … `Go to project n`). Task 4's tests do not touch the dots.

- [ ] **Step 1: Write the failing test**

This is a regression guard for the structural conversion, not a contrast or size test — see "Known limits" above for why neither of those is testable here. Converting a self-closing `<button />` into a wrapper that renders a child is exactly the edit that silently drops content or duplicates a label, so assert the names survive.

Append to `src/components/Projects.test.tsx`:

```tsx
describe('carousel navigation dots', () => {
  it('exposes one uniquely named button per project and renders a visual child inside each', () => {
    render(<Projects />);

    const dots = screen.getAllByRole('button', { name: /^Go to project \d+$/ });
    expect(dots).toHaveLength(PROJECTS.length);

    // The hit area and the visual dot are separate elements: the button owns the
    // padding, an inner element owns the size and colour. Without the child the
    // dot is invisible even though the button is still 24x24.
    for (const dot of dots) {
      expect(dot.children).toHaveLength(1);
    }
  });
});
```

Add the import at the top of the file, beside the existing ones:

```tsx
import { PROJECTS } from '../data/projects';
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/components/Projects.test.tsx -t 'uniquely named button per project'`
Expected: FAIL on `expect(dot.children).toHaveLength(1)` — received 0. The buttons already exist and are already named, so only the child assertion fails. That is the assertion this task's structural change satisfies.

- [ ] **Step 3: Widen the hit area and fix the dot colour**

`src/components/Projects.tsx:319-324`. Replace:

```tsx
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`transition-all duration-300 rounded-full ${currentIndex === i ? 'bg-blue-500 w-8 h-3' : 'bg-gray-600 hover:bg-gray-500 w-3 h-3'}`}
                    aria-label={`Go to project ${i + 1}`}
                  />
```

with:

```tsx
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className="group p-1.5 rounded-full"
                    aria-label={`Go to project ${i + 1}`}
                  >
                    <span
                      className={`block transition-all duration-300 rounded-full ${currentIndex === i ? 'bg-blue-500 w-8 h-3' : 'bg-gray-500 group-hover:bg-gray-400 w-3 h-3'}`}
                    />
                  </button>
```

Four things are happening here; all four are required:

1. **`p-1.5` on the button.** 12px visual + 6px padding each side = exactly 24×24. The active dot becomes 44×24, which also passes.
2. **`block` on the span.** A `<span>` is `display: inline` by default and width/height do not apply to a non-replaced inline box. Without `block` the dot collapses and the entire fix silently does nothing.
3. **`bg-gray-600` → `bg-gray-500`** (2.66:1 → 4.16:1), and its hover moves from `gray-500` to `gray-400`. The old `hover:bg-gray-500` would otherwise become a no-op against the new resting colour, leaving no visible hover delta.
4. **`hover:` → `group-hover:`**, with `group` on the button. Hover now lands on the padded button; a bare `hover:` on the span would only fire in the inner 12×12, so the 6px ring would look dead. These dots are not nested inside any other Tailwind `group`, so the unnamed group resolves to this button.

- [ ] **Step 4: Set the container gap to zero**

`src/components/Projects.tsx:317`. Replace:

```tsx
              <div className="flex justify-center gap-2 mt-8">
```

with:

```tsx
              <div className="flex justify-center gap-0 mt-8">
```

Adjacent 24px hit areas now abut without overlapping. **The visible gap between dots grows from 8px to 12px. This is the deliberate, accepted cost of the fix — it is not a regression.**

Rejected alternative, for the record: expanding the hit area with a `::before` pseudo-element leaves layout untouched, but at `gap-2` the expanded areas of adjacent dots overlap by 4px, and overlapping targets are their own defect.

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 78 tests pass, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "fix(a11y): give carousel dots 24x24 hit areas and 3:1 contrast"
```

---

### Task 3: View toggle pressed state and accessible name

Spec item 3.1. The view toggle is a stateful toggle with no `aria-pressed`, so its state is invisible to assistive technology. Its label `Toggle view` also describes the action rather than the thing controlled.

**Files:**
- Modify: `src/components/Projects.tsx:130-134`
- Test: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the toggle's accessible name becomes `Carousel view` and stays constant across states. Task 4's tests query it by that name to switch views.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Projects.test.tsx`:

```tsx
describe('view toggle', () => {
  it('reports its pressed state and keeps a constant accessible name', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    // The carousel is the default view, so the toggle starts pressed.
    const toggle = screen.getByRole('button', { name: 'Carousel view' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    // Same element, same name — only the state changed. A name that changed with
    // the state would make the control unfindable by its stable label.
    expect(screen.getByRole('button', { name: 'Carousel view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
```

- [ ] **Step 2: Update the one existing test that queries the old name**

In `src/components/Projects.test.tsx`, inside `describe('filter dropdown keyboard handling')`, the test `does not steal focus when Escape is pressed with the dropdown closed` contains:

```tsx
    const viewToggle = screen.getByRole('button', { name: /toggle view/i });
```

Replace that line with:

```tsx
    const viewToggle = screen.getByRole('button', { name: 'Carousel view' });
```

This is a rename following the label. The test's assertions are unchanged — it still checks that Escape with the dropdown closed does not move focus.

- [ ] **Step 3: Run the tests and verify they fail**

Run: `npx vitest run src/components/Projects.test.tsx`
Expected: 2 failures, both `Unable to find an accessible element with the role "button" and name "Carousel view"` — the new test and the renamed query. Everything else passes.

- [ ] **Step 4: Add the state and rename the label**

`src/components/Projects.tsx:130-134`. Replace:

```tsx
          <button
            onClick={() => setIsCarouselView((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
            aria-label="Toggle view"
          >
```

with:

```tsx
          <button
            onClick={() => setIsCarouselView((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
            aria-pressed={isCarouselView}
            aria-label="Carousel view"
          >
```

The label is **replaced, not supplemented**. A toggle button's accessible name must describe what it controls and stay constant; the pressed state is what varies. `Toggle view` plus `aria-pressed` announces as "Toggle view, pressed", which tells the user nothing about which view is active.

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 79 tests pass, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "fix(a11y): expose view toggle state via aria-pressed"
```

---

### Task 4: Filter-count and carousel-position live regions

Spec items 3.2 and 3.3. Changing a filter or moving the carousel updates the page silently — a screen reader user gets no feedback that anything happened. Two `sr-only` `role="status"` regions announce both.

Both must be **permanently mounted**, rendered unconditionally with only their text changing. A live region inserted into the DOM at the same moment its text appears is not reliably announced; the element must already exist for the change to register. That is why the carousel region *empties* in grid view rather than unmounting.

**Files:**
- Modify: `src/components/Projects.tsx` — derived values after line 105, JSX after line 109
- Test: `src/components/Projects.test.tsx`

**Interfaces:**
- Consumes: the toggle's `Carousel view` name from Task 3.
- Produces: two elements carrying `data-testid="filter-status"` and `data-testid="carousel-status"`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/Projects.test.tsx`:

```tsx
describe('live regions', () => {
  it('reports the filtered project count and updates it when a filter changes', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const status = screen.getByTestId('filter-status');
    expect(status).toHaveAttribute('role', 'status');
    // textContent equality, not toHaveTextContent: that matcher is a substring
    // match, so "5 projects shown" would also pass against "15 projects shown".
    expect(status.textContent).toBe(`${PROJECTS.length} projects shown`);

    await user.click(screen.getByRole('button', { name: /^filter/i }));
    await user.click(screen.getAllByRole('checkbox')[0]);

    // The dropdown lists categories before statuses, so checkbox 0 is the first
    // category. Compute the expectation from the data rather than restating the
    // component's filter logic.
    const firstCategory = PROJECT_CATEGORIES[0];
    const expected = PROJECTS.filter((p) => p.categories.includes(firstCategory)).length;
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(PROJECTS.length);

    expect(screen.getByTestId('filter-status').textContent).toBe(`${expected} projects shown`);
  });

  it('reports the centred carousel card and updates it on navigation', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const status = screen.getByTestId('carousel-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status.textContent).toBe(`Project 1 of ${PROJECTS.length}: ${PROJECTS[0].title}`);

    await user.click(screen.getByRole('button', { name: 'Next project' }));

    expect(screen.getByTestId('carousel-status').textContent).toBe(
      `Project 2 of ${PROJECTS.length}: ${PROJECTS[1].title}`,
    );
  });

  it('empties the carousel region in grid view but keeps it mounted', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    await user.click(screen.getByRole('button', { name: 'Carousel view' }));

    // Still in the document — an unmounted region would not announce when the
    // user switches back, because the text would appear at insertion time.
    const status = screen.getByTestId('carousel-status');
    expect(status).toBeInTheDocument();
    // toBeEmptyDOMElement, not toHaveTextContent(''): jest-dom rejects the empty
    // string outright because it would match anything.
    expect(status).toBeEmptyDOMElement();
  });
});
```

Add the import at the top of the file, beside the existing ones:

```tsx
import { PROJECT_CATEGORIES } from '../types/project';
```

`PROJECTS` was already imported in Task 2.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/components/Projects.test.tsx -t 'live regions'`
Expected: 3 failures, each `Unable to find an element by: [data-testid="filter-status"]` / `[data-testid="carousel-status"]`.

- [ ] **Step 3: Derive the two status strings**

In `src/components/Projects.tsx`, immediately after the `activeFilterCount` line (currently line 105) and before the `return (`, insert:

```tsx
  const filterStatusText =
    filteredProjects.length === 0
      ? 'No projects match the selected filters.'
      : `${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'} shown`;

  // `reset()` runs in an effect after a filter change, so for one render
  // currentIndex can still point past the end of the newly filtered array.
  // Indexing is therefore guarded rather than assumed in range.
  const centredProject = isCarouselView ? filteredProjects[currentIndex] : undefined;
  const carouselStatusText = centredProject
    ? `Project ${currentIndex + 1} of ${filteredProjects.length}: ${centredProject.title}`
    : '';
```

The empty-set string reuses the visible empty-state copy already in the component (`No projects match the selected filters.`) so the announcement and the screen agree.

- [ ] **Step 4: Render the two regions**

In `src/components/Projects.tsx`, immediately after the grid-pattern div (currently line 109) and before the `max-w-7xl` wrapper, insert:

```tsx
      {/* Live regions. Permanently mounted and rendered outside every conditional
          branch: a region inserted into the DOM at the same moment its text
          appears is not reliably announced. Only the text content changes. */}
      <p role="status" data-testid="filter-status" className="sr-only">
        {filterStatusText}
      </p>
      <p role="status" data-testid="carousel-status" className="sr-only">
        {carouselStatusText}
      </p>
```

This position is inside `<section id="projects">` and outside both the `isCarouselView` branch and the `filteredProjects.length > 0` branch, so neither region unmounts when the view toggles or the filtered set empties.

`sr-only` is a Tailwind built-in and `tailwind.config.js` already scans `./src/**/*.{ts,tsx}`, so no config change is needed. `role="status"` implies `aria-live="polite"` and `aria-atomic="true"`; do not add either explicitly.

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 82 tests pass, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Projects.tsx src/components/Projects.test.tsx
git commit -m "feat(a11y): announce filter results and carousel position"
```

---

### Task 5: Section landmark names and navigation name

Spec items 4.1 and 4.2. A bare `<section>` has no ARIA role at all; it only becomes a `region` landmark once it has an accessible name. All five sections are currently unnamed and so absent from the screen reader's landmark rotor. The `<nav>` is a landmark but unnamed.

This task also adds the `IntersectionObserver` stub that Tasks 5, 6, and 7 all need.

**Files:**
- Modify: `src/test/setup.ts`
- Modify: `src/components/Hero.tsx:35-39`, `:52`
- Modify: `src/components/About.tsx:74`, `:82`
- Modify: `src/components/Skills.tsx:17`, `:24`
- Modify: `src/components/Projects.tsx:108`, `:121`
- Modify: `src/components/Connect.tsx:83`, `:88`
- Modify: `src/components/Navbar.tsx:59`
- Create: `src/components/landmarks.test.tsx`

**Interfaces:**
- Consumes: the Projects heading's accessible name `Featured Projects` from Task 1. Before Task 1 it is `[ Featured Projects ]` and this task's Projects assertion fails.
- Produces: the `IntersectionObserver` stub in `src/test/setup.ts`, which Tasks 6 and 7 rely on to render `Skills` and `About` at all.

- [ ] **Step 1: Add the IntersectionObserver stub**

`src/hooks/useReveal.ts:12` constructs an `IntersectionObserver` in an effect. jsdom does not implement it, so **any** test that renders `Skills`, `About`, or `Connect` currently throws `IntersectionObserver is not defined`. Verified by probe before this plan was written.

In `src/test/setup.ts`, inside the existing `if (typeof window !== 'undefined')` block, after the `matchMedia` definition, add:

```ts
  // jsdom does not implement IntersectionObserver (verified by probe). useReveal
  // constructs one in an effect, so without this every test that renders Skills,
  // About or Connect throws on mount. The stub records nothing: no test in this
  // project asserts reveal behaviour, only that the components render.
  class IntersectionObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverStub,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverStub,
  });
```

Both `window` and `globalThis` are assigned because `useReveal` references the bare global, which under jsdom does not always resolve through `window`.

The whole block stays inside the existing `typeof window !== 'undefined'` guard: `setupFiles` run in every test file's context, including this project's default `node` files where `window` does not exist.

- [ ] **Step 2: Write the failing test**

Create `src/components/landmarks.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import About from './About';
import Skills from './Skills';
import Projects from './Projects';
import Connect from './Connect';
import Navbar from './Navbar';

afterEach(cleanup);

beforeEach(() => {
  // About and Connect fetch the GitHub profile on mount. A never-settling promise
  // keeps them on their static fallback copy with no state update after the test
  // body, which would otherwise warn about updates outside act().
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

/**
 * A bare <section> has no implicit ARIA role. It is exposed as a `region`
 * landmark only once it has an accessible name, so getByRole('region', { name })
 * finding the element is itself the assertion that aria-labelledby resolved.
 */
describe('section landmarks', () => {
  it('names the hero section after its h1', () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('region', { name: 'Supakorn Prayongyam SIIT, Thammasat University' }),
    ).toBeInTheDocument();
  });

  it('names the about section after its h2', () => {
    render(<About />);
    expect(screen.getByRole('region', { name: 'About Me' })).toBeInTheDocument();
  });

  it('names the skills section after its h2', () => {
    render(<Skills />);
    expect(screen.getByRole('region', { name: 'Skills & Technologies' })).toBeInTheDocument();
  });

  it('names the projects section after its h2', () => {
    render(<Projects />);
    expect(screen.getByRole('region', { name: 'Featured Projects' })).toBeInTheDocument();
  });

  it('names the connect section after its h2', () => {
    render(<Connect />);
    expect(screen.getByRole('region', { name: 'Get In Touch' })).toBeInTheDocument();
  });

  it('names the primary navigation', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});
```

The Hero name is the h1's three spans concatenated and whitespace-normalised: `Supakorn`, `Prayongyam`, `SIIT, Thammasat University`. The typewriter effect is on a *different* element, so the h1's text is static and safe as a label source. If the assertion fails on whitespace, read the received name from the failure output and match it exactly — do not restructure the h1.

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run src/components/landmarks.test.tsx`
Expected: 6 failures, each `Unable to find an accessible element with the role "region"` (or `"navigation"` and name `"Main"` for the last). Crucially, they must fail on the *assertion*, not on `IntersectionObserver is not defined` — if you see that error, Step 1 is wrong.

- [ ] **Step 4: Name the five sections**

Each section gains `aria-labelledby` pointing at its own heading, and the heading gains the matching `id`. Apply all five:

`src/components/Hero.tsx:35-39` — add `aria-labelledby="hero-heading"` to the `<section>`:

```tsx
    <section 
      id="home" 
      aria-labelledby="hero-heading"
      className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 pt-16 overflow-hidden bg-grid-pattern bg-[#030712]"
      onMouseMove={handleMouseMove}
    >
```

`src/components/Hero.tsx:52` — add `id="hero-heading"` to the `<h1>`:

```tsx
            <h1 id="hero-heading" className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-[-0.04em] leading-[0.92]">
```

`src/components/About.tsx:74`:

```tsx
    <section ref={sectionRef} id="about" aria-labelledby="about-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative">
```

`src/components/About.tsx:82`:

```tsx
        <h2 id="about-heading" className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-8 text-center">
```

`src/components/Skills.tsx:17`:

```tsx
    <section ref={sectionRef} id="skills" aria-labelledby="skills-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative">
```

`src/components/Skills.tsx:24`:

```tsx
        <h2 id="skills-heading" className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 text-center">
```

`src/components/Projects.tsx:108`:

```tsx
    <section id="projects" aria-labelledby="projects-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative bg-gray-950">
```

`src/components/Projects.tsx:121`:

```tsx
            <h2 id="projects-heading"
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
```

`src/components/Connect.tsx:83`:

```tsx
    <section id="connect" aria-labelledby="connect-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative">
```

`src/components/Connect.tsx:88`:

```tsx
        <h2 id="connect-heading" className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
```

The existing `id` attributes on the sections (`home`, `about`, `skills`, `projects`, `connect`) are scroll targets used by `Navbar` and `Home`. Leave every one of them exactly as it is.

- [ ] **Step 5: Name the navigation**

`src/components/Navbar.tsx:59` — add `aria-label="Main"` to the `<nav>`, keeping its long `className` template literal untouched:

```tsx
    <nav aria-label="Main" className={`fixed top-0 left-0 right-0 sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 w-full sm:w-[90%] max-w-4xl z-50 transition-all duration-300 sm:border-[1px] ${
```

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 88 tests pass, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/test/setup.ts src/components/Hero.tsx src/components/About.tsx src/components/Skills.tsx src/components/Projects.tsx src/components/Connect.tsx src/components/Navbar.tsx src/components/landmarks.test.tsx
git commit -m "feat(a11y): name the five section landmarks and the main nav"
```

---

### Task 6: List semantics for skill chips and project tags

Spec item 4.3. Two chip groups read visually as lists but are structurally `<div>`-of-`<span>`, so a screen reader announces a run of unrelated text with no count and no item boundaries.

**Files:**
- Modify: `src/components/Skills.tsx:39-49`
- Modify: `src/components/ProjectCard.tsx:43-52`
- Create: `src/components/Skills.test.tsx`
- Create: `src/components/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: the `IntersectionObserver` stub from Task 5 — without it `Skills` cannot render in jsdom.
- Produces: `src/components/ProjectCard.test.tsx`, which Task 7 extends.

- [ ] **Step 1: Write the failing tests**

Create `src/components/Skills.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Skills from './Skills';

afterEach(cleanup);

describe('skill chips', () => {
  it('exposes each category of chips as a list', () => {
    render(<Skills />);

    // One list per skill category. SKILL_CATEGORIES is module-private, so the
    // count is stated here rather than imported.
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(4);

    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);

    // Every chip must have become an <li>; a <span> left behind in the
    // conversion would still render but expose no listitem role.
    for (const list of lists) {
      for (const child of Array.from(list.children)) {
        expect(child.tagName).toBe('LI');
      }
    }

    // `listitem` is not a name-from-content role, so it cannot be queried by
    // accessible name. Reach a known chip by its text instead.
    expect(screen.getByText('TypeScript').tagName).toBe('LI');
  });
});
```

Create `src/components/ProjectCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProjectCard from './ProjectCard';
import { PROJECTS } from '../data/projects';

afterEach(cleanup);

const project = PROJECTS[0];

describe('project tags', () => {
  it('exposes the tag row as a list with one item per tag', () => {
    render(<ProjectCard project={project} />);

    expect(screen.getAllByRole('list')).toHaveLength(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(project.tags.length);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/components/Skills.test.tsx src/components/ProjectCard.test.tsx`
Expected: 2 failures, both `Unable to find an accessible element with the role "list"`.

- [ ] **Step 3: Convert the skill chips**

`src/components/Skills.tsx:39-49`. Replace:

```tsx
              <div className="flex flex-wrap gap-2.5">
                {skills.map((skill, index) => (
                  <span
                    key={skill}
                    className="px-3.5 py-1.5 bg-gray-800/80 text-gray-300 rounded-full text-sm border border-gray-700/80 hover:bg-blue-500/15 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 cursor-default"
                    style={revealStyle(isVisible, (categoryIndex * 120) + (index * 45), reducedMotion, 450)}
                  >
                    {skill}
                  </span>
                ))}
              </div>
```

with:

```tsx
              <ul className="flex flex-wrap gap-2.5">
                {skills.map((skill, index) => (
                  <li
                    key={skill}
                    className="px-3.5 py-1.5 bg-gray-800/80 text-gray-300 rounded-full text-sm border border-gray-700/80 hover:bg-blue-500/15 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 cursor-default"
                    style={revealStyle(isVisible, (categoryIndex * 120) + (index * 45), reducedMotion, 450)}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
```

Every class, the `key`, and the inline `style` move across unchanged; only the two tag names differ. Tailwind's preflight already sets `list-style: none` and zero padding on `ul`, so the rendered appearance does not change. The flex classes stay on the wrapper, which is now the `<ul>`.

B1 established that `revealStyle` returns only `opacity` and `animation` and never a `transition` longhand, so moving it to the `<li>` cannot clobber the chips' `transition-all` hover behaviour.

- [ ] **Step 4: Convert the project tags**

`src/components/ProjectCard.tsx:43-52`. Replace:

```tsx
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-300 rounded-md text-xs border border-blue-500/20 hover:border-blue-400/50 hover:text-blue-300 transition-all duration-200"
            >
              {tag}
            </span>
          ))}
        </div>
```

with:

```tsx
        <ul className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-300 rounded-md text-xs border border-blue-500/20 hover:border-blue-400/50 hover:text-blue-300 transition-all duration-200"
            >
              {tag}
            </li>
          ))}
        </ul>
```

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 90 tests pass, 0 lint errors.

`Projects.test.tsx` renders `Projects`, which renders many `ProjectCard`s, so this change adds `list` roles to that document too. None of its existing queries use `getAllByRole('list')`, so nothing there should break — if something does, report it rather than loosening the new assertions.

- [ ] **Step 6: Commit**

```bash
git add src/components/Skills.tsx src/components/ProjectCard.tsx src/components/Skills.test.tsx src/components/ProjectCard.test.tsx
git commit -m "fix(a11y): give skill chips and project tags list semantics"
```

---

### Task 7: Heading nesting and image alt text

Spec items 4.4, 4.4b and 4.5. Three headings misuse the document outline, and one image duplicates text that is already announced beside it.

**Files:**
- Modify: `src/components/About.tsx:59`, `:128`
- Modify: `src/components/Connect.tsx:211`
- Modify: `src/components/ProjectCard.tsx:24`
- Create: `src/components/About.test.tsx`
- Modify: `src/components/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: the `IntersectionObserver` stub from Task 5; `src/components/ProjectCard.test.tsx` from Task 6.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing tests**

Create `src/components/About.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import About from './About';

afterEach(cleanup);

beforeEach(() => {
  // Never-settling fetch keeps the GitHub card on its static fallback copy.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

describe('About heading outline', () => {
  it('does not expose the GitHub display name as a heading', () => {
    render(<About />);

    // The fallback copy while the profile is loading. It is card data, not a
    // section label, so it must not appear in the heading outline at all.
    expect(screen.getByText('GitHub Profile')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'GitHub Profile' })).toBeNull();
  });

  it('nests the info card titles one level below the Details heading', () => {
    render(<About />);

    const details = screen.getByRole('heading', { name: 'Details', level: 3 });
    expect(details).toBeInTheDocument();

    // Every InfoCard sits inside the Details panel, so its title is a subsection
    // of Details — not a sibling of it at the same level.
    expect(screen.getByRole('heading', { name: /Personal Information/, level: 4 })).toBeInTheDocument();
  });
});
```

Append to `src/components/ProjectCard.test.tsx`:

```tsx
describe('project image', () => {
  it('marks the image decorative so the title is not announced twice', () => {
    render(<ProjectCard project={project} />);

    // The adjacent h3 already announces the title. An alt that repeats it makes
    // a screen reader say the project name twice in a row.
    expect(screen.getByRole('heading', { name: project.title, level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: project.title })).toBeNull();
  });
});
```

`PROJECTS[0]` ("Full-Stack Expense Management") has an `imageUrl`, so the card renders a real `<img>` and this assertion is not vacuous. All twelve entries in `src/data/projects.ts` carry one; the `project` fixture declared in Task 6 is shared by both describes and needs no change.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run src/components/About.test.tsx src/components/ProjectCard.test.tsx`
Expected: 3 failures — the display name currently *is* a heading; the info card title is level 3, not 4; and the image currently *does* have the title as its accessible name.

- [ ] **Step 3: Demote the InfoCard title**

`src/components/About.tsx:59`. Every `InfoCard` renders inside the "Details" panel, whose own heading is the `<h3>` at `:166`. An `<h3>` inside it makes a heading its own sibling's child. Replace:

```tsx
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
```

with:

```tsx
      <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h4>
```

An InfoCard title ("Personal Information", "Education") genuinely labels a region of content, so it stays a heading and is demoted rather than converted. Its classes are unchanged — the visual size comes from `text-xl`, not from the tag.

- [ ] **Step 4: Convert the two GitHub display names to paragraphs**

`src/components/About.tsx:128` sits under the "GitHub Activity" `<h3>` at `:105`, the same sibling's-child fault. Replace:

```tsx
                  <h3 className="text-white text-base font-semibold leading-tight">{githubStats?.displayName ?? 'GitHub Profile'}</h3>
```

with:

```tsx
                  <p className="text-white text-base font-semibold leading-tight">{githubStats?.displayName ?? 'GitHub Profile'}</p>
```

`src/components/Connect.tsx:211`. Replace:

```tsx
                <h3 className="text-white text-lg font-semibold leading-tight">{githubStats?.displayName ?? 'GitHub Profile'}</h3>
```

with:

```tsx
                <p className="text-white text-lg font-semibold leading-tight">{githubStats?.displayName ?? 'GitHub Profile'}</p>
```

Unlike About's, Connect's `<h3>` sits directly under the section `<h2>` and so is not a nesting violation. It changes for the other reason: a card's display name is data, not a section label, and the two cards should agree.

- [ ] **Step 5: Make the project image decorative**

`src/components/ProjectCard.tsx:24`. Replace:

```tsx
          alt={project.title}
```

with:

```tsx
          alt=""
```

The title is already announced by the adjacent `<h3>` at `:35`. An empty alt marks the image decorative, which is correct when adjacent text conveys the same information. The two GitHub avatar alts (`About.tsx:123`, `Connect.tsx:206`) are already correct — do not touch them.

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test && npm run lint`
Expected: 93 tests pass, 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/About.tsx src/components/Connect.tsx src/components/ProjectCard.tsx src/components/About.test.tsx src/components/ProjectCard.test.tsx
git commit -m "fix(a11y): repair heading nesting and drop duplicated image alt"
```

---

### Task 8: Manual verification checklist

Ten of this slice's claims cannot be verified in this environment: jsdom computes no colour and has no layout engine, and no browser automation is connected. Record what must be checked by hand so the gap is visible rather than assumed closed.

Slices B1 and B2 both shipped with unverified browser-behaviour premises, and in both cases that is precisely what escaped per-task review. This file is the mitigation.

**Files:**
- Create: `docs/superpowers/manual-checks/2026-08-14-b3-a11y.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Write the checklist**

Create `docs/superpowers/manual-checks/2026-08-14-b3-a11y.md`:

```markdown
# Slice B3 — Manual accessibility verification

Run against the Vercel preview deployment for branch `fix/a11y-polish`.
Not automatable here: jsdom computes no colour and has no layout engine, and
no browser automation is connected to this environment.

Tick each line only after observing it. An unticked line is an open risk, not
a formality.

## Contrast (DevTools colour picker)

- [ ] Hero's "Hola World" eyebrow: contrast >= 4.5:1.
- [ ] Hero's `SYS_ACTV` badge on its `gray-900` ground: >= 4.5:1.
- [ ] A category count `(n)` inside the open filter dropdown: >= 4.5:1.
- [ ] An inactive carousel dot against the page: >= 3:1.
- [ ] A side carousel card's description text against that card's own
      background: >= 4.5:1. (Shipped by Slice C1 at a computed 4.86:1;
      confirming it here because no test covers it either.)

## Target size

- [ ] Inspect a carousel dot: the rendered button box is at least 24x24 CSS px.
- [ ] Adjacent dot boxes touch but do not overlap.
- [ ] Hovering the 6px padding ring — not just the visible dot — lightens the dot.

## Screen reader (VoiceOver)

- [ ] The view toggle announces as "Carousel view, toggle button, pressed",
      then "not pressed" after activation.
- [ ] Changing a filter announces the new project count without moving focus.
- [ ] Pressing a carousel arrow announces "Project n of m: <title>".
- [ ] Switching to grid view and back announces the position again.
- [ ] Landmark rotor lists five regions, each named by its own heading text:
      "Supakorn Prayongyam SIIT, Thammasat University", "About Me",
      "Skills & Technologies", "Featured Projects", "Get In Touch" — plus a
      "Main" navigation. "Featured Projects" without brackets confirms the
      `aria-hidden` on the decorative spans worked.
- [ ] Heading rotor: under About, "Details" is followed by its four card titles
      one level deeper, and neither GitHub display name appears as a heading.
- [ ] A project card announces its title once, not twice.
- [ ] Skill chips and project tags announce as lists with an item count.

## Visual regression

- [ ] The gap between carousel dots is visibly wider (8px -> 12px). This is the
      accepted cost of the target-size fix, not a regression.
- [ ] Skill chips and project tags are unchanged in appearance after the
      `<span>` -> `<li>` conversion (Tailwind preflight zeroes list styling).
- [ ] Side carousel cards still read as receding.

## Carried over, still unrun

- [ ] Slice B1's reduced-motion pass.
- [ ] Slice B2's keyboard pass.
- [ ] Slice C1's DevTools performance pass (PR #8) — nothing yet proves the
      carousel scroll lag is gone.
```

- [ ] **Step 2: Verify the whole branch is green**

Run: `npm test && npm run lint && npm run build`
Expected: 93 tests pass, 0 lint errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/manual-checks/2026-08-14-b3-a11y.md
git commit -m "docs: record B3 manual accessibility verification checklist"
```

---

## Execution notes

**Task order matters in three places:**

1. Task 1 must precede Task 5 — the landmark test asserts the Projects heading is named `Featured Projects`, which only holds once the brackets carry `aria-hidden`.
2. Task 3 must precede Task 4 — Task 4's tests query the view toggle by its new name.
3. Task 5 must precede Tasks 6 and 7 — they cannot render `Skills` or `About` without the `IntersectionObserver` stub.

Tasks 2, 6, and 7 are otherwise independent.

**Line numbers in this plan were verified against `main` at `a082d04`** plus the docs-only commits on `fix/a11y-polish`. They shift as tasks land: every task after Task 4 refers to lines in files Task 4 has already grown by roughly 10 lines. **Treat the quoted code as the source of truth and the line numbers as a hint.** Match on the code, not the number.

**Do not add tests that assert Tailwind class names are present.** Several changes in this slice are genuinely unverifiable in jsdom, and a class-name assertion tests the diff against itself while creating the appearance of coverage. The honest record is Task 8's checklist.
