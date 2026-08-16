# Slice D manual checks — deep links & link previews

> **Verification pass 2026-08-16** (Claude, Chrome + curl against production
> `https://supakornohm.vercel.app` at commit `52aa9a7`, and a local
> `vite preview` production build). Boxes ticked below carry the evidence
> recorded here. Everything still unticked was genuinely not performed.
>
> - Deep links over HTTP: `/about`, `/projects`, `/connect` all **200**
>   (`text/html`); previously 404.
> - **Static assets were NOT shadowed by the catch-all** — the highest-risk
>   item in the design: `/og.png` → `image/png`, `/icon.png` → `image/png`,
>   `/images/projects/expense.webp` → `image/webp`.
> - Redirect flow measured in-page: URL bar ends at `/`, exactly **1 `<main>`
>   and 1 `<h1>`**, nav highlight resolves to the right link (`text-blue-400`).
> - **Back button**: from `/?marker=backtest` → `/about` → Back landed on
>   `/?marker=backtest`, NOT `/about`. `replace: true` confirmed against a real
>   history stack, which `MemoryRouter` structurally cannot prove.
> - Landing offsets from the section top, measured on cold loads:
>   `/about` **0px**, `/projects` **+16px**, `/connect` **−57px**. See the
>   scroll-accuracy note below — the `/connect` case is genuinely slightly off.
> - Query strings survive the redirect: `/projects?utm_source=linkedin&ref=test`
>   → `/?utm_source=linkedin&ref=test`.
> - 404 page renders live: `<h1>` "Page not found", 1 `<main>`, back link
>   `href="/"`, body text present (not a blank shell). Status is 200 as designed.
> - `public/og.png`: `sips` 1200×630, 108,369 bytes, and `npm run og` re-run
>   produced a **byte-identical** file (SHA-256 `7d0f2adb…`).
>
> **Not done, and not inferred:** the four link-preview validators, how the card
> reads at feed size, and the reduced-motion pass. Those need a human with the
> relevant accounts and system settings.


Every box here is unticked on purpose. Nothing in this list is covered by the
test suite, and most of it **cannot** be: the rewrite only takes effect on a
real deploy.

## Deep links (deployed)

- [x] `https://supakornohm.vercel.app/about` returns 200, not 404
- [x] `https://supakornohm.vercel.app/projects` returns 200, not 404
- [x] `https://supakornohm.vercel.app/connect` returns 200, not 404
- [x] Each lands on `/` in the URL bar (the redirect used `replace`)
- [x] Each scrolls to the right section, not the top of the page
- [x] Pressing Back after landing returns to the previous site, NOT to /about
- [x] Nav highlight shows the correct section after landing

Command: `for p in /about /projects /connect; do curl -s -o /dev/null -w "$p %{http_code}\n" https://supakornohm.vercel.app$p; done`

## Static assets survived the catch-all

The rewrite is the highest-risk change in this slice. Vercel's docs say the
filesystem takes precedence, but confirm it rather than trusting it.

- [x] `https://supakornohm.vercel.app/og.png` returns a PNG, not HTML
- [x] Project images still load on the deployed page (open DevTools → Network, filter Img, confirm 200s and `image/webp`)
- [x] `https://supakornohm.vercel.app/icon.png` still returns the favicon

## 404 behaviour (deployed)

- [x] `/nonexistent-xyz` shows the "Page not found" page, not a blank shell
- [x] Its "Back to portfolio" link returns to the homepage
- [x] Known-and-accepted: the response status is **200**, not 404. A rewrite
      cannot set a status code. Confirm it is 200 and that this is understood,
      rather than discovering it later and treating it as a regression.

## Link previews

Each of these renders the card independently — passing one does not imply the others.

- [ ] Facebook / Open Graph: https://developers.facebook.com/tools/debug/
- [ ] X / Twitter card validator
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- [ ] Paste the URL into Slack or Discord and confirm a large image card appears
- [ ] The card's text is legible at the small size used in a feed

## The card itself

- [x] Open `public/og.png` and look at it — no clipped text, no missing gradient
- [x] `sips -g pixelWidth -g pixelHeight public/og.png` reports 1200 x 630
- [x] `stat -f%z public/og.png` is under 300000
- [x] `npm run og` regenerates it reproducibly (run twice, compare sizes)

## Scroll landing accuracy

- [ ] On a COLD load of `/connect` (hard refresh, empty cache), the page lands
      on the Connect section and not slightly off it

`scrollToSection` (`useActiveSection.ts:90`) defers by `setTimeout(…, 0)`. On a
cold load, below-the-fold images have not laid out yet, so the offset may be
wrong.

**MEASURED 2026-08-16 — the concern was real but small.** Cold loads against
production landed at these offsets from the section top: `/about` **0px**,
`/projects` **+16px**, `/connect` **−57px**. So `/connect`, the furthest down
the page and the one behind the most lazy images, does overshoot by roughly
half a viewport-line. Left unticked deliberately: the box asks for "not
slightly off it", and −57px *is* slightly off. Not worth engineering around at
this magnitude, but now a measurement rather than a worry. Deliberately not engineered around in advance — observe first, and only
fix it if it actually misbehaves.

- [ ] Repeat with reduced motion enabled (System Settings → Accessibility →
      Display → Reduce motion) and confirm it jumps instead of animating

## What no test in this branch proves

- That Vercel honours `vercel.json` at all. Probed: with no `vercel.json` in the
  repo, `vite preview` already returns 200 and the SPA shell for all three
  routes and for `/nonexistent-xyz`. No local check can tell a correct config
  from a missing one.
- That `/og.png` is reachable over HTTP. The same probe returned 200 for
  `/og.png` while no such file existed. The test asserts the file's bytes on
  disk instead.
- That the card looks right. The tests prove dimensions and byte size, never
  appearance.
- That crawlers actually fetch and render the card.
- That the redirect's `replace: true` produces correct Back behaviour in a real
  browser. `MemoryRouter` is not a history stack.
