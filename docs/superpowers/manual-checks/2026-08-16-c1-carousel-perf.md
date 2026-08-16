# Slice C1 manual checks — cursor-glow & carousel performance

Slice C1 (`2026-08-14-cursor-glow-perf`) shipped without a manual-check file.
This one is written **after** the verification rather than before it, because
the measurements below are what the file exists to record.

C1 matters more than its size suggests: **the carousel scroll lag is the
problem that started this entire body of work.** Seven slices and 149 passing
tests later, nothing had confirmed it was actually fixed — jsdom has no
compositor, no frame loop, and no rendering, so no test in this repo can
observe a dropped frame.

## Method

Production build served by `vite preview`, measured in Chrome at DPR 2,
viewport 1200×736, commit `52aa9a7`. Frame deltas collected via
`requestAnimationFrame`; main-thread blocking via `PerformanceObserver`
(`entryTypes: ['longtask']`). 60Hz display, so 16.7ms is the floor and
sustained >33ms means dropped frames.

## Results — 2026-08-16

- [x] Cursor-glow under sustained mousemove (120 synthetic moves at ~125Hz over
      a project card, page settled)

  | median | p95 | worst | frames >33ms | long tasks |
  |---|---|---|---|---|
  | 16.7ms | 18.5ms | **18.6ms** | **0** | **0** |

- [x] Carousel under rapid advance (12 "Next project" activations at 250ms,
      inside the CSS transition window) — 180 frames

  | median | p95 | worst | frames >33ms | long tasks |
  |---|---|---|---|---|
  | 16.7ms | 17.9ms | **18.7ms** | **0** | **0** |

- [x] **Worst case — carousel and cursor-glow simultaneously** (200 mousemoves
      interleaved with 8 carousel advances) — 145 frames

  | median | p95 | worst | frames >33ms | long tasks |
  |---|---|---|---|---|
  | 16.7ms | 17.2ms | **18.6ms** | **0** | **0** |

- [x] The C1 design is confirmed operating, not merely present: the hovered
      card exposes computed `--glow-x` / `--glow-y` custom properties, so the
      hook writes two inherited properties rather than per-element inline
      geometry.

**Conclusion: not a single dropped frame under any of the three stresses, and
no main-thread block over 50ms.** The original carousel lag is measurably gone.

## Honest caveats

- Mousemove events were **synthetic** (`dispatchEvent`), not OS-level pointer
  input. They exercise the same handler and the same style writes, but do not
  include the browser's own hit-testing and pointer coalescing.
- One 116.6ms frame appeared in the first run, which had a `scrollIntoView`
  immediately before recording. Re-running on a settled page produced a worst
  frame of 18.6ms, so that outlier belonged to **scroll settling, not the
  glow**. Recorded because it would be easy to misread as a glow regression.
- Single machine, single display, DPR 2. A low-end device may behave differently.
- Measured on a 60Hz display; a 120Hz panel would set a 8.3ms floor and could
  surface jank invisible here.

## Still not verified for the neighbouring slices

- [ ] B1 reduced motion — no checklist file exists; forcing
      `prefers-reduced-motion: reduce` needs a real system setting or CDP
      emulation, neither of which was used here.
- [ ] B2 keyboard access — no checklist file exists; needs a real tab-order
      walk with a visible focus indicator.
- [ ] Slice A correctness baseline — no checklist file exists.
